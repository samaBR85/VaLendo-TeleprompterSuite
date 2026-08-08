import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '@shared/defaults'
import { serializeProject } from '@shared/project'
import type { AppState } from '@shared/types'

/**
 * `openProject` chega ao disco pelas imagens dos cartões, e elas moram no
 * `userData` do Electron. Sem Electron rodando, é este mock que responde — a
 * pasta é de verdade, porque o que se cobra aqui é o comportamento com arquivo
 * no disco.
 */
const pasta = mkdtempSync(join(tmpdir(), 'valendo-abrir-'))
vi.mock('electron', () => ({ app: { getPath: () => pasta } }))

const { openProject } = await import('./project')

/** Grava um `.valendo` a partir do estado, podendo apagar campos de propósito. */
function gravar(mexer: (arquivo: Record<string, unknown>) => void): string {
  const arquivo = JSON.parse(serializeProject(createInitialState(), 0)) as Record<string, unknown>
  mexer(arquivo)
  const caminho = join(pasta, `projeto-${Math.abs(JSON.stringify(arquivo).length)}.valendo`)
  writeFileSync(caminho, JSON.stringify(arquivo), 'utf8')
  return caminho
}

describe('projeto gravado por uma versão anterior', () => {
  it('sem a rota do áudio da rede, abre com ela LIGADA', async () => {
    // ausente tem de virar ligado, e não desligado: aquele programa foi montado
    // quando o áudio sempre saía pela rede, e abrir mudo mudaria em silêncio o
    // que ele fazia — o operador procuraria o defeito no wi-fi
    const caminho = gravar((arquivo) => {
      const estado = arquivo.state as { webview: Record<string, unknown> }
      delete estado.webview.som
    })

    const { state, error } = await openProject(caminho)
    expect(error).toBeNull()
    expect(state?.webview.som).toBe(true)
  })

  it('sem o bloco de rede inteiro, também abre — e ligada', async () => {
    // um arquivo de bem antes disso pode não ter `webview` nenhum, e ler
    // `state.webview.som` direto ali estouraria antes de qualquer padrão
    const caminho = gravar((arquivo) => {
      delete (arquivo.state as Record<string, unknown>).webview
    })

    const { state, error } = await openProject(caminho)
    expect(error).toBeNull()
    expect(state?.webview.som).toBe(true)
  })

  it('mas desligado de propósito continua desligado', async () => {
    // a armadilha do `|| true`: com `som: false`, um OU devolveria `true` e
    // apagaria a decisão de quem montou o programa
    const caminho = gravar((arquivo) => {
      const estado = arquivo.state as { webview: Record<string, unknown> }
      estado.webview.som = false
    })

    const { state } = await openProject(caminho)
    expect(state?.webview.som).toBe(false)
  })

  it('sem o cadeado da aba Texto, abre DESTRAVADO', async () => {
    // ausente tem de virar destravado: aquele programa foi montado quando nada
    // travava, e abrir com os controles mudos faria o operador procurar defeito
    // num app que está fazendo o que ele mandou — só que ele nunca mandou
    const caminho = gravar((arquivo) => {
      delete (arquivo.state as Record<string, unknown>).travaDoTexto
    })

    const { state, error } = await openProject(caminho)
    expect(error).toBeNull()
    expect(state?.travaDoTexto).toBe(false)
  })

  it('e travado de propósito continua travado ao reabrir', async () => {
    // o outro lado da mesma moeda, e o motivo de o campo existir: quem fechou
    // a cara do programa antes de ir ao ar reabre com ela fechada
    const caminho = gravar((arquivo) => {
      ;(arquivo.state as Record<string, unknown>).travaDoTexto = true
    })

    const { state } = await openProject(caminho)
    expect(state?.travaDoTexto).toBe(true)
  })
})

describe('o que o projeto leva da rede', () => {
  it('a rota do áudio viaja no arquivo, junto do peso do vídeo', async () => {
    // as duas são decisões do PROGRAMA, não conforto desta máquina: abrir o
    // mesmo .valendo no estúdio tem de reproduzir a mesma gravação
    const base: AppState = createInitialState()
    const arquivo = JSON.parse(
      serializeProject({ ...base, webview: { enabled: true, videoPerfil: 'media', som: false } }, 0)
    ) as Record<string, unknown>
    const caminho = join(pasta, 'programa.valendo')
    writeFileSync(caminho, JSON.stringify(arquivo), 'utf8')

    const { state } = await openProject(caminho)
    expect(state?.webview.som).toBe(false)
    expect(state?.webview.videoPerfil).toBe('media')
  })

  it('mas a publicação não volta ao ar sozinha, mesmo salva ligada', async () => {
    // levar o .valendo para outro estúdio não pode republicar o roteiro na
    // rede de lá. É a mesma regra do monitor, e aqui pesa mais: não há tela
    // acendendo para denunciar que o texto ficou ao alcance de quem estiver
    // no wi-fi
    const base: AppState = createInitialState()
    const caminho = join(pasta, 'no-ar.valendo')
    writeFileSync(
      caminho,
      serializeProject({ ...base, webview: { enabled: true, videoPerfil: 'leve', som: true } }, 0),
      'utf8'
    )

    const { state } = await openProject(caminho)
    expect(state?.webview.enabled).toBe(false)
  })
})
