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

/**
 * O que o app realmente grava não é `serialize()`, é uma linha por retorno de
 * `apply` — inclusive quando o passo coalesceu e já estava no arquivo. O teste
 * de restauração acima usava `serialize()` e por isso nunca viu o problema:
 * ao reabrir o app, um arrasto de slider virava dezenas de passos de desfazer.
 */
describe('o formato que vai para o disco', () => {
  /** Reproduz o append-only do storage: cada passo devolvido vira uma linha. */
  function arrastar(history: History<Doc>, inicio: Doc, quantas: number, base = 1_000): [Doc, string[]] {
    const linhas: string[] = []
    let state = inicio
    for (let i = 0; i < quantas; i += 1) {
      const [next, step] = history.apply(state, 'corpo', (d) => void (d.ppm = 60 + i), base + i * 20)
      state = next
      if (step) linhas.push(JSON.stringify(step))
    }
    return [state, linhas]
  }

  it('um arrasto de slider volta a ser um passo só ao reler', () => {
    const [state, linhas] = arrastar(new History<Doc>(400), { text: 'oi', ppm: 150 }, 30)

    expect(linhas).toHaveLength(30)
    expect(parseHistoryLines(linhas)).toHaveLength(1)

    const relido = new History<Doc>(400)
    relido.restore(parseHistoryLines(linhas))
    expect(relido.undo(state).ppm).toBe(150)
    expect(relido.canUndo).toBe(false)
  })

  it('dois arrastos continuam sendo dois passos, na ordem', () => {
    const history = new History<Doc>(400)
    const [meio, primeiras] = arrastar(history, { text: 'oi', ppm: 150 }, 20, 1_000)
    const [fim, segundas] = arrastar(history, meio, 20, 9_000)

    const passos = parseHistoryLines([...primeiras, ...segundas])
    expect(passos).toHaveLength(2)

    const relido = new History<Doc>(400)
    relido.restore(passos)
    // o primeiro Ctrl+Z desfaz só o segundo arrasto
    const umaVez = relido.undo(fim)
    expect(umaVez.ppm).toBe(meio.ppm)
    expect(relido.undo(umaVez).ppm).toBe(150)
  })

  it('a última versão do passo vence, mas fica no lugar em que apareceu', () => {
    const antigo = JSON.stringify({ id: 'a', at: 1, label: 'um', patches: [], inverse: [] })
    const outro = JSON.stringify({ id: 'b', at: 2, label: 'dois', patches: [], inverse: [] })
    const crescido = JSON.stringify({ id: 'a', at: 3, label: 'um', patches: [], inverse: [] })

    const passos = parseHistoryLines([antigo, outro, crescido])

    expect(passos.map((s) => s.id)).toEqual(['a', 'b'])
    expect(passos[0].at).toBe(3)
  })

  it('arquivo de versão anterior, sem id, mantém uma linha por passo', () => {
    const linhas = [1, 2, 3].map((at) => JSON.stringify({ at, label: 'x', patches: [], inverse: [] }))
    expect(parseHistoryLines(linhas)).toHaveLength(3)
  })

  it('ids de sessões diferentes não se misturam', () => {
    // o arquivo é acumulado entre aberturas: dois passos com o mesmo id
    // seriam mesclados num só, e um deles sumiria do desfazer
    const [, ontem] = arrastar(new History<Doc>(400), { text: 'oi', ppm: 150 }, 5, 1_000)
    const [, hoje] = arrastar(new History<Doc>(400), { text: 'oi', ppm: 150 }, 5, 8_000_000)

    expect(parseHistoryLines([...ontem, ...hoje])).toHaveLength(2)
  })
})
