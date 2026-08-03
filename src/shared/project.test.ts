import { describe, expect, it } from 'vitest'
import { createInitialState } from './defaults'
import { readProject, serializeProject } from './project'
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
    window: { width: 1_800, height: 1_000, x: 40, y: 20 },
    sidebarWidth: 260,
    editionSplit: 0.6,
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

  it('guarda a janela, a divisória, a coluna de assets e o loop — não são "no ar"', () => {
    // o único recorte de semTransitorio é o status de transmissão; tudo o
    // mais é preferência ou lugar das coisas, e precisa sobreviver ao salvar
    const { state } = readProject(serializeProject(programa(), 0))

    expect(state?.window).toEqual({ width: 1_800, height: 1_000, x: 40, y: 20 })
    expect(state?.sidebarWidth).toBe(260)
    expect(state?.editionSplit).toBe(0.6)
    expect(state?.transport.loop).toBe(true)
    expect(state?.transport.loopDelaySeconds).toBe(4)
    expect(state?.tabs[0].appearance.positionPct).toBe(30)
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
