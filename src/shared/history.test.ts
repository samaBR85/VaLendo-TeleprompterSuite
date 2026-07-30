import { describe, expect, it } from 'vitest'
import { History, parseHistoryLines } from './history'

interface Doc {
  text: string
  ppm: number
}

describe('History', () => {
  it('desfaz e refaz milhares de passos', () => {
    const history = new History<Doc>(0)
    let state: Doc = { text: '', ppm: 150 }

    for (let i = 0; i < 3_000; i += 1) {
      ;[state] = history.apply(state, `passo-${i}`, (draft) => {
        draft.text += 'x'
      }, i * 1_000)
    }

    expect(state.text).toHaveLength(3_000)
    expect(history.depth).toBe(3_000)

    for (let i = 0; i < 3_000; i += 1) state = history.undo(state)
    expect(state.text).toBe('')
    expect(history.canUndo).toBe(false)

    for (let i = 0; i < 3_000; i += 1) state = history.redo(state)
    expect(state.text).toHaveLength(3_000)
  })

  it('coalesce digitação contínua num único passo', () => {
    const history = new History<Doc>(400)
    let state: Doc = { text: '', ppm: 150 }

    ;[state] = history.apply(state, 'digitar', (d) => void (d.text += 'a'), 1_000)
    ;[state] = history.apply(state, 'digitar', (d) => void (d.text += 'b'), 1_100)
    ;[state] = history.apply(state, 'digitar', (d) => void (d.text += 'c'), 1_200)

    expect(state.text).toBe('abc')
    expect(history.depth).toBe(1)

    state = history.undo(state)
    expect(state.text).toBe('')
  })

  it('abre um passo novo quando a pausa passa da janela de coalescência', () => {
    const history = new History<Doc>(400)
    let state: Doc = { text: '', ppm: 150 }

    ;[state] = history.apply(state, 'digitar', (d) => void (d.text += 'a'), 1_000)
    ;[state] = history.apply(state, 'digitar', (d) => void (d.text += 'b'), 5_000)

    expect(history.depth).toBe(2)
    state = history.undo(state)
    expect(state.text).toBe('a')
  })

  it('não grava passo quando nada muda', () => {
    const history = new History<Doc>(400)
    const state: Doc = { text: 'igual', ppm: 150 }
    const [next, step] = history.apply(state, 'nada', () => {}, 1_000)

    expect(step).toBeNull()
    expect(next).toBe(state)
    expect(history.canUndo).toBe(false)
  })

  it('ações diferentes não se misturam mesmo em sequência rápida', () => {
    const history = new History<Doc>(400)
    let state: Doc = { text: 'oi', ppm: 150 }

    ;[state] = history.apply(state, 'digitar', (d) => void (d.text += '!'), 1_000)
    ;[state] = history.apply(state, 'ritmo', (d) => void (d.ppm = 190), 1_050)

    expect(history.depth).toBe(2)
    state = history.undo(state)
    expect(state.ppm).toBe(150)
    expect(state.text).toBe('oi!')
  })

  it('reconstrói o estado a partir das linhas gravadas em disco', () => {
    const original = new History<Doc>(0)
    let state: Doc = { text: '', ppm: 150 }
    for (const chunk of ['um ', 'dois ', 'três']) {
      ;[state] = original.apply(state, chunk, (d) => void (d.text += chunk), 0)
    }
    const lines = original.serialize()

    const restored = new History<Doc>(0)
    restored.restore(parseHistoryLines(lines))

    let replay = state
    replay = restored.undo(replay)
    expect(replay.text).toBe('um dois ')
    replay = restored.undo(replay)
    expect(replay.text).toBe('um ')
  })

  it('ignora linha truncada por queda de energia', () => {
    const valid = JSON.stringify({ at: 1, label: 'x', patches: [], inverse: [] })
    expect(parseHistoryLines([valid, '{"at":2,"label":"tru', ''])).toHaveLength(1)
  })
})
