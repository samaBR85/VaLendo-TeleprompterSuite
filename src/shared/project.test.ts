import { describe, expect, it } from 'vitest'
import { MAQUINA_PADRAO, createInitialState } from './defaults'
import { readProject, semMaquina, semTransitorio, serializeProject } from './project'
import type { AppState } from './types'

function programa(): AppState {
  const state = createInitialState()
  return {
    ...state,
    transport: {
      ...state.transport,
      ppm: 260,
      playing: true,
      startedAt: 12_345,
      blackout: true,
      loop: true,
      loopDelaySeconds: 4
    },
    output: { displayId: 7, enabled: true, viewport: { width: 864, height: 1537 } },
    maquina: {
      window: { width: 1_800, height: 1_000, x: 40, y: 20 },
      thumbSize: 72,
      editorFontSize: 20,
      editorFontFamily: 'Georgia, serif',
      editorAllCaps: false,
    paletaCurta: false,
    filtroDeContraste: true,
      cardVolume: 0.4,
      coresRecentes: ['#e5484d'],
      proximaCorRecente: 1,
      ajudaAberta: false,
    presetsAberto: true,
    apresentadoresAberto: true,
      abaDosAjustes: 'saida'
    },
    sidebarWidth: 260,
    editionSplit: 0.6,
    webview: { ...state.webview, videoPerfil: 'media', som: false },
    tabs: state.tabs.map((tab) => ({
      ...tab,
      title: 'Jornal das Dez',
      appearance: { ...tab.appearance, fontSize: 50, align: 'center', positionPct: 30 }
    }))
  }
}

describe('salvar e abrir o projeto', () => {
  it('devolve o programa inteiro: abas, aparência e ritmo', () => {
    const { state } = readProject(serializeProject(programa(), 0))

    expect(state?.tabs[0].title).toBe('Jornal das Dez')
    expect(state?.tabs[0].appearance.fontSize).toBe(50)
    expect(state?.tabs[0].appearance.align).toBe('center')
    expect(state?.transport.ppm).toBe(260)
  })

  it('o monitor viaja, mas a transmissão nunca sobe sozinha ao abrir', () => {
    // abrir um projeto não pode jogar texto na tela do apresentador antes de o
    // operador dizer que está pronto
    const { state } = readProject(serializeProject(programa(), 0))

    expect(state?.output.displayId).toBe(7)
    expect(state?.output.enabled).toBe(false)
  })

  it('não guarda o que é estado de momento', () => {
    const { state } = readProject(serializeProject(programa(), 0))

    expect(state?.transport.playing).toBe(false)
    expect(state?.transport.blackout).toBe(false)
    expect(state?.transport.startedAt).toBe(0)
  })

  it('guarda a divisória, a coluna de assets e o loop — não são "no ar"', () => {
    // semTransitorio só recorta o status de transmissão; tudo o mais que
    // desenha o PROGRAMA é preferência ou lugar das coisas, e sobrevive
    const { state } = readProject(serializeProject(programa(), 0))

    expect(state?.sidebarWidth).toBe(260)
    expect(state?.editionSplit).toBe(0.6)
    expect(state?.transport.loop).toBe(true)
    expect(state?.transport.loopDelaySeconds).toBe(4)
    expect(state?.tabs[0].appearance.positionPct).toBe(30)
  })

  it('a rota do áudio da rede viaja com o programa, desligada inclusive', () => {
    // `som: false` é a decisão de quem montou o programa — "os celulares desta
    // gravação não recebem áudio". Se ela não viajasse, abrir o mesmo projeto
    // em outra máquina soltaria som que ninguém pediu; e um `?? true` no
    // caminho errado transformaria o desligado explícito em ligado
    const { state } = readProject(serializeProject(programa(), 0))

    expect(state?.webview.som).toBe(false)
    expect(state?.webview.videoPerfil).toBe('media')
  })

  it('carimba quando foi salvo', () => {
    const arquivo = JSON.parse(serializeProject(programa(), Date.UTC(2026, 6, 30, 21, 0, 0)))
    expect(arquivo.salvoEm).toBe('2026-07-30T21:00:00.000Z')
    expect(arquivo.app).toBe('VaLendo')
  })
})

describe('arquivo que não dá para abrir', () => {
  it('recusa o que não é projeto do Valendo, com uma frase clara', () => {
    expect(readProject('nem json').error).toBe('Este arquivo não é um projeto do Valendo.')
    expect(readProject('{"tabs":[]}').error).toBe('Este arquivo não é um projeto do Valendo.')
  })

  it('recusa projeto de versão mais nova em vez de abrir pela metade', () => {
    const futuro = JSON.stringify({ app: 'VaLendo', formato: 99, state: createInitialState() })
    expect(readProject(futuro).error).toContain('versão mais nova')
    expect(readProject(futuro).state).toBeNull()
  })

  it('recusa projeto sem roteiro dentro', () => {
    const vazio = JSON.stringify({ app: 'VaLendo', formato: 1, state: { tabs: [] } })
    expect(readProject(vazio).error).toBe('O projeto está sem roteiro dentro.')
  })

  it('nenhuma recusa devolve estado pela metade', () => {
    for (const ruim of ['', '{}', 'null', '[]', '{"app":"Outro"}']) {
      expect(readProject(ruim).state, ruim).toBeNull()
      expect(readProject(ruim).error, ruim).toBeTruthy()
    }
  })
})

describe('o que é da máquina não entra no projeto', () => {
  it('o arquivo sai com as preferências de fábrica, não com as de quem salvou', () => {
    // o mesmo .valendo abre no notebook de quem escreveu e na estação do
    // estúdio: se carregasse a janela e o tamanho das miniaturas, abrir o
    // programa de um colega refaria a mesa de quem abriu
    const arquivo = JSON.parse(serializeProject(programa(), 0)) as { state: AppState }

    expect(arquivo.state.maquina).toEqual(MAQUINA_PADRAO)
    expect(arquivo.state.maquina.window).toBeNull()
    expect(arquivo.state.maquina.thumbSize).toBe(MAQUINA_PADRAO.thumbSize)
  })

  it('e um projeto gravado antes da separação não traz a janela de volta', () => {
    // arquivo de uma versão anterior, com a janela ainda dentro do estado
    const antigo = JSON.parse(serializeProject(programa(), 0)) as {
      state: AppState & { window?: unknown }
    }
    antigo.state.maquina = {
      window: { width: 900, height: 700, x: -1_400, y: 300 },
      thumbSize: 96,
      editorFontSize: 28,
      editorFontFamily: 'Georgia, serif',
      editorAllCaps: false,
    paletaCurta: false,
    filtroDeContraste: true,
      cardVolume: 0,
      coresRecentes: ['#e5484d'],
      proximaCorRecente: 1,
      ajudaAberta: false,
    presetsAberto: true,
    apresentadoresAberto: true,
      abaDosAjustes: 'leitura'
    }

    const { state } = readProject(JSON.stringify(antigo))
    expect(state?.maquina).toEqual(MAQUINA_PADRAO)
  })

  it('mexer no conforto da máquina não deixa o projeto sujo', () => {
    // o slider das miniaturas não muda nada que vá para o arquivo; acender o
    // aviso de "não salvo" por causa dele seria pedir para salvar o nada
    // o MESMO programa nas duas pontas: `programa()` gera ids novos a cada
    // chamada, e dois roteiros diferentes provariam outra coisa
    const base = programa()
    const antes = semMaquina(semTransitorio(base))
    const depois = semMaquina(
      semTransitorio({
        ...base,
        maquina: { ...base.maquina, thumbSize: 40, editorFontSize: 11, ajudaAberta: true }
      })
    )

    expect(JSON.stringify(depois)).toBe(JSON.stringify(antes))
  })
})
