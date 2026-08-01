import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { converterParaMp4, ffmpegPath, temFfmpeg } from './ffmpeg'

/*
 * Este teste roda o ffmpeg de verdade sobre arquivos de verdade.
 *
 * É o único jeito de provar o que interessa: que um `.mov` de celular sai
 * pelo caminho barato (trocar a embalagem, sem tocar num pixel) e que um
 * ProRes de ilha de edição, que não cabe num mp4, cai na recodificação em vez
 * de falhar. Um teste com dublê não diria nada sobre isso.
 */
const PASTA = join(tmpdir(), 'valendo-teste-ffmpeg')
const H264_MOV = join(PASTA, 'celular.mov')
const PRORES_MOV = join(PASTA, 'ilha.mov')

/** Pergunta ao próprio ffmpeg com que codec o arquivo ficou. */
function codecDe(caminho: string): string {
  const bin = ffmpegPath()
  if (!bin) return ''
  try {
    execFileSync(bin, ['-i', caminho], { stdio: 'pipe' })
    return ''
  } catch (erro) {
    // `-i` sem saída sempre termina em erro; o relatório vem no stderr
    const saida = String((erro as { stderr?: Buffer }).stderr ?? '')
    return /Video:\s*(\w+)/.exec(saida)?.[1] ?? ''
  }
}

beforeAll(() => {
  const bin = ffmpegPath()
  if (!bin) return
  rmSync(PASTA, { recursive: true, force: true })
  mkdirSync(PASTA, { recursive: true })

  const comum = ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=1', '-y']
  // o que sai de um iPhone: H.264 dentro de um invólucro QuickTime
  execFileSync(bin, [...comum, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', H264_MOV], { stdio: 'ignore' })
  // o que sai de uma ilha de edição: ProRes, que um mp4 não sabe carregar
  execFileSync(bin, [...comum, '-c:v', 'prores_ks', '-profile:v', '0', PRORES_MOV], { stdio: 'ignore' })
}, 120_000)

afterAll(() => rmSync(PASTA, { recursive: true, force: true }))

describe('converter para algo que o app toque', () => {
  it('o ffmpeg está no projeto', () => {
    expect(temFfmpeg()).toBe(true)
  })

  it('um .mov de celular só troca de embalagem, sem recodificar', async () => {
    const destino = join(PASTA, 'saida-celular.mp4')
    const r = await converterParaMp4(H264_MOV, destino, () => {})

    expect(r.ok).toBe(true)
    expect(r.recodificou).toBe(false)
    expect(existsSync(destino)).toBe(true)
    expect(codecDe(destino)).toBe('h264')
  }, 120_000)

  it('um ProRes não cabe num mp4, então recodifica em vez de falhar', async () => {
    const destino = join(PASTA, 'saida-ilha.mp4')
    const r = await converterParaMp4(PRORES_MOV, destino, () => {})

    expect(r.ok).toBe(true)
    expect(r.recodificou).toBe(true)
    expect(codecDe(destino)).toBe('h264')
    // recodificar para H.264 tem que deixar o arquivo bem menor que o ProRes
    expect(statSync(destino).size).toBeLessThan(statSync(PRORES_MOV).size)
  }, 120_000)

  it('avisa o andamento, e diz quando está recodificando', async () => {
    // sem isto a tela não teria como distinguir uma espera de segundos de uma
    // de minutos, e a segunda pareceria o app travado
    const avisos: { fracao: number | null; recodificando: boolean }[] = []
    await converterParaMp4(PRORES_MOV, join(PASTA, 'saida-aviso.mp4'), (p) => avisos.push(p))

    expect(avisos.length).toBeGreaterThan(0)
    expect(avisos.some((a) => a.recodificando)).toBe(true)
    expect(avisos.every((a) => a.fracao === null || (a.fracao >= 0 && a.fracao <= 1))).toBe(true)
  }, 120_000)

  it('arquivo que não existe falha sem derrubar nada, e com motivo', async () => {
    const r = await converterParaMp4(join(PASTA, 'nao-existe.mov'), join(PASTA, 'nada.mp4'), () => {})

    expect(r.ok).toBe(false)
    expect(r.erro.length).toBeGreaterThan(0)
  }, 120_000)
})
