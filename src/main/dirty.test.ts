import { describe, expect, it } from 'vitest'
import { createInitialState, MAQUINA_PADRAO } from '@shared/defaults'
import type { AppState, Cartao } from '@shared/types'
import { markProjectClean, projectIsDirty } from './project'

function programa(): AppState {
  return createInitialState()
}

const CARTAO: Cartao = {
  id: 'c1',
  kind: 'text',
  nome: 'Recado',
  texto: 'boa noite'
}

/**
 * O que conta como "mudança não salva".
 *
 * É a pergunta que decide se fechar o app pergunta antes ou vai embora calado.
 * Até a versão 174 o `close` nem consultava isto — só olhava se a transmissão
 * estava no ar —, e o `workspace.json` devolvia tudo na abertura seguinte, o
 * que escondia a perda: o `.valendo` é que ficava para trás.
 */
describe('mudança não salva', () => {
  it('acabou de abrir: nada a salvar', () => {
    const state = programa()
    markProjectClean(state)
    expect(projectIsDirty(state)).toBe(false)
  })

  it('acrescentar um cartão suja o projeto', () => {
    const state = programa()
    markProjectClean(state)
    expect(projectIsDirty({ ...state, cards: [CARTAO] })).toBe(true)
  })

  it('dar play NÃO suja — não é estado que vá para o arquivo', () => {
    const state = programa()
    markProjectClean(state)
    const tocando: AppState = {
      ...state,
      transport: { ...state.transport, playing: true, startedAt: 1_700_000_000_000 }
    }
    expect(projectIsDirty(tocando)).toBe(false)
  })

  it('mexer numa preferência da máquina NÃO suja — ela nem viaja no .valendo', () => {
    const state = programa()
    markProjectClean(state)
    const comSlider: AppState = {
      ...state,
      maquina: { ...MAQUINA_PADRAO, thumbSize: 96, editorFontSize: 20 }
    }
    expect(projectIsDirty(comSlider)).toBe(false)
  })

  it('salvar zera a régua: o que estava sujo passa a ser o novo limpo', () => {
    const state = programa()
    markProjectClean(state)
    const comCartao: AppState = { ...state, cards: [CARTAO] }
    expect(projectIsDirty(comCartao)).toBe(true)

    markProjectClean(comCartao)
    expect(projectIsDirty(comCartao)).toBe(false)
    // e tirar o cartão de volta suja de novo, agora na direção contrária
    expect(projectIsDirty(state)).toBe(true)
  })
})
