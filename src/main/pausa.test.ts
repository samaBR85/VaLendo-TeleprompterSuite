import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wordIndexAt } from '@shared/pacing'

/** Uma pasta de dados por arquivo de teste, no lugar do `userData` do Electron. */
const pasta = mkdtempSync(join(tmpdir(), 'valendo-pausa-'))
vi.mock('electron', () => ({ app: { getPath: () => pasta } }))

/**
 * Pausar para onde o texto está — nem uma palavra atrás.
 *
 * Houve um "rebobinar 2 palavras" aqui, pensado como cortesia para o
 * apresentador reentrar sem perder o fio. Na transmissão isso se lia como
 * defeito: o texto andava para trás sozinho na hora do pause, e com a
 * velocidade uniforme ligada — que é o padrão — a unidade não é uma palavra
 * falada e sim uma da régua, então duas delas chegavam perto de meia linha.
 *
 * O que este arquivo prende é a propriedade, não o número: a posição gravada
 * na pausa é a MESMA que o relógio marcava no instante em que ela aconteceu.
 * Assim nenhuma cortesia nova entra por engano.
 */
describe('a pausa não move o texto', () => {
  const T0 = 1_700_000_000_000
  let agora = T0

  beforeEach(() => {
    vi.resetModules()
    agora = T0
    vi.spyOn(Date, 'now').mockImplementation(() => agora)
  })

  afterEach(() => vi.restoreAllMocks())

  async function comRoteiroRolando() {
    const { Store } = await import('./state')
    const store = new Store()
    const tabId = store.getState().activeTabId
    store.dispatch({ type: 'text/set', tabId, text: 'palavra '.repeat(400).trim() })
    store.dispatch({ type: 'transport/ppm', ppm: 120 })
    store.dispatch({ type: 'transport/toggle' })
    return store
  }

  it('o pause do transporte grava a posição do instante', async () => {
    const store = await comRoteiroRolando()
    agora += 10_000

    const noInstante = wordIndexAt(store.getState().transport, agora)
    store.dispatch({ type: 'transport/toggle' })

    const transport = store.getState().transport
    expect(transport.playing).toBe(false)
    expect(transport.wordsAtStart).toBeCloseTo(noInstante, 6)
  })

  it('a ação `transport/pause` faz o mesmo — é o caminho do auto-pausa', async () => {
    const store = await comRoteiroRolando()
    agora += 7_500

    const noInstante = wordIndexAt(store.getState().transport, agora)
    store.dispatch({ type: 'transport/pause' })

    expect(store.getState().transport.wordsAtStart).toBeCloseTo(noInstante, 6)
  })

  it('o play continua de onde a pausa deixou, e pausar de novo sem andar não desloca nada', async () => {
    const store = await comRoteiroRolando()
    agora += 10_000
    store.dispatch({ type: 'transport/toggle' })
    const parou = store.getState().transport.wordsAtStart

    store.dispatch({ type: 'transport/toggle' })
    expect(store.getState().transport.playing).toBe(true)
    // o relógio recomeça agora, da mesma palavra: nada de saltar para trás
    expect(store.getState().transport.wordsAtStart).toBeCloseTo(parou, 6)

    store.dispatch({ type: 'transport/toggle' })
    expect(store.getState().transport.wordsAtStart).toBeCloseTo(parou, 6)
  })
})
