import { describe, expect, it } from 'vitest'
import { createInitialState, MAQUINA_PADRAO, DEFAULT_APPEARANCE } from './defaults'
import { semMaquina, semTransitorio } from './project'
import type { AppState } from './types'

/**
 * São DOIS interruptores de caixa alta, e eles não se tocam.
 *
 * `maquina.editorAllCaps` pinta o editor; `appearance.allCaps` pinta a saída
 * (tela do apresentador, prévia e página da rede). Ligar um jamais pode mover
 * o outro — do contrário seriam um interruptor só com duas alavancas, e o
 * operador que quisesse digitar em caixa alta jogaria maiúsculas na cara do
 * apresentador sem pedir.
 */
describe('as duas caixas altas', () => {
  it('nascem as duas desligadas', () => {
    const state = createInitialState()
    expect(state.maquina.editorAllCaps).toBe(false)
    expect(state.tabs[0].appearance.allCaps).toBe(false)
  })

  it('são campos separados, em objetos separados', () => {
    // se um dia alguém apontasse os dois para o mesmo lugar, isto quebra
    expect('allCaps' in MAQUINA_PADRAO).toBe(false)
    expect('editorAllCaps' in DEFAULT_APPEARANCE).toBe(false)
  })

  it('a do EDITOR é da máquina: não viaja no .valendo', () => {
    const base = createInitialState()
    const state: AppState = { ...base, maquina: { ...base.maquina, editorAllCaps: true } }
    expect(semMaquina(state).maquina.editorAllCaps).toBe(false)
  })

  it('a da SAÍDA é do projeto: viaja no .valendo', () => {
    const base = createInitialState()
    const state: AppState = {
      ...base,
      tabs: base.tabs.map((t) => ({ ...t, appearance: { ...t.appearance, allCaps: true } }))
    }
    const arquivo = semMaquina(semTransitorio(state))
    expect(arquivo.tabs[0].appearance.allCaps).toBe(true)
  })
})
