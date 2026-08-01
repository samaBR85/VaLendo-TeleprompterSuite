import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import ffmpegStatic from 'ffmpeg-static'
import type { Perfil } from '@shared/proxy'

/**
 * Onde está o ffmpeg.
 *
 * O pacote aponta para dentro de `node_modules`, e num app instalado isso vira
 * um caminho dentro do `app.asar` — que é um arquivo só, de onde o Windows não
 * consegue executar nada. O empacotador deixa uma cópia real ao lado, em
 * `app.asar.unpacked`, e é para lá que este desvio manda.
 */
export function ffmpegPath(): string | null {
  if (!ffmpegStatic) return null
  const real = ffmpegStatic.replace('app.asar', 'app.asar.unpacked')
  return existsSync(real) ? real : existsSync(ffmpegStatic) ? ffmpegStatic : null
}

export function temFfmpeg(): boolean {
  return ffmpegPath() !== null
}

export interface Progresso {
  /** 0 a 1; fica indefinido enquanto a duração do arquivo não é conhecida */
  fracao: number | null
  /** trocar a embalagem é rápido; recodificar é a demora de verdade */
  recodificando: boolean
}

const DURACAO = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/
const TEMPO = /out_time_ms=(\d+)/

function rodar(
  args: string[],
  onProgresso: (p: Progresso) => void,
  recodificando: boolean
): Promise<{ ok: boolean; erro: string }> {
  const bin = ffmpegPath()
  if (!bin) return Promise.resolve({ ok: false, erro: 'ffmpeg ausente' })

  return new Promise((resolve) => {
    // `-progress pipe:1` dá uma saída feita para máquina ler, em vez de
    // raspar o relatório humano que muda de formato entre versões
    const filho = spawn(bin, ['-nostdin', '-y', ...args, '-progress', 'pipe:1', '-nostats'])
    let duracao = 0
    let ultimasLinhas = ''

    filho.stderr.on('data', (dados: Buffer) => {
      const texto = dados.toString()
      // guarda só o fim: se der erro, é a última linha que diz o motivo
      ultimasLinhas = (ultimasLinhas + texto).slice(-2000)
      const casou = DURACAO.exec(texto)
      if (casou && !duracao) {
        duracao = Number(casou[1]) * 3600 + Number(casou[2]) * 60 + Number(casou[3])
      }
    })

    filho.stdout.on('data', (dados: Buffer) => {
      const casou = TEMPO.exec(dados.toString())
      if (!casou) return
      const segundos = Number(casou[1]) / 1_000_000
      onProgresso({ fracao: duracao > 0 ? Math.min(1, segundos / duracao) : null, recodificando })
    })

    filho.on('error', (erro) => resolve({ ok: false, erro: erro.message }))
    filho.on('close', (codigo) => resolve({ ok: codigo === 0, erro: ultimasLinhas.trim().slice(-400) }))
  })
}

/**
 * Gera a cópia leve que vai para a rede local.
 *
 * Aqui recodificar não é castigo, é o objetivo: o que se quer é justamente um
 * arquivo menor. `maxrate` com `bufsize` prende o pico — sem eles o alvo é
 * uma média, e um trecho de muito movimento estoura o wi-fi bem na hora em
 * que a imagem mais importa.
 *
 * Medido: o alvo é cumprido com folga de menos de 2%, e a conversão roda de
 * 30 a 50 vezes mais rápido que o tempo real.
 */
export function gerarProxy(
  origem: string,
  destino: string,
  perfil: Perfil,
  onProgresso: (p: Progresso) => void
): Promise<{ ok: boolean; erro: string }> {
  return rodar(
    [
      '-i',
      origem,
      /*
       * Duas escalas, e a segunda não é enfeite.
       *
       * A primeira respeita a proporção do original: um retrato de celular
       * não pode ser esticado para caber num quadro deitado só porque o
       * perfil diz 854x480. Mas ela devolve o tamanho que der — e 1920x1080
       * dentro de 854x480 dá 854 por 480,375, que arredonda para ímpar. O
       * H.264 em yuv420p recusa lado ímpar, e a conversão falhava só nesse
       * perfil, silenciosamente. A segunda escala apara para o par de baixo.
       */
      '-vf',
      `scale=${perfil.largura}:${perfil.altura}:force_original_aspect_ratio=decrease,` +
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-b:v',
      `${perfil.kbps}k`,
      '-maxrate',
      `${perfil.kbps}k`,
      '-bufsize',
      `${perfil.kbps * 2}k`,
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      `${perfil.audioKbps}k`,
      '-movflags',
      '+faststart',
      destino
    ],
    onProgresso,
    true
  )
}

/**
 * Deixa um vídeo tocável pelo app, do jeito mais barato que der.
 *
 * Primeiro tenta só trocar a embalagem. Um `.mov` de celular quase sempre já
 * traz H.264 dentro: o que impede de tocar é o invólucro do QuickTime, não o
 * vídeo. Trocar o invólucro não mexe num pixel e leva segundos mesmo num
 * arquivo de um giga.
 *
 * Quando o conteúdo não cabe num mp4 — ProRes de ilha de edição é o caso
 * comum — não há truque: aí recodifica de verdade, o que demora perto do
 * tempo do próprio vídeo. Por isso a diferença aparece no aviso da tela: uma
 * espera de segundos e uma de minutos não podem parecer a mesma coisa.
 */
export async function converterParaMp4(
  origem: string,
  destino: string,
  onProgresso: (p: Progresso) => void
): Promise<{ ok: boolean; erro: string; recodificou: boolean }> {
  const trocaDeEmbalagem = await rodar(
    ['-i', origem, '-c', 'copy', '-movflags', '+faststart', destino],
    onProgresso,
    false
  )
  if (trocaDeEmbalagem.ok) return { ...trocaDeEmbalagem, recodificou: false }

  const recodificacao = await rodar(
    [
      '-i',
      origem,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      destino
    ],
    onProgresso,
    true
  )
  return { ...recodificacao, recodificou: true }
}
