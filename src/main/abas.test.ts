import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** o `Store` chega ao disco por `app.getPath('userData')` — sem Electron, é este mock que responde */
const pasta = mkdtempSync(join(tmpdir(), 'valendo-abas-'))
vi.mock('electron', () => ({ app: { getPath: () => pasta } }))

async function comAbas(quantas: number): Promise<{
  store: InstanceType<typeof import('./state').Store>
  titulos: () => string[]
}> {
  const { Store } = await import('./state')
  const store = new Store()
  for (let i = 1; i < quantas; i += 1) store.dispatch({ type: 'tab/add' })
  store.getState().tabs.forEach((tab, i) => {
    store.dispatch({ type: 'tab/rename', tabId: tab.id, title: String.fromCharCode(65 + i) })
  })
  return { store, titulos: () => store.getState().tabs.map((t) => t.title) }
}

beforeEach(() => vi.resetModules())

describe('arrastar aba reordena', () => {
  it('leva para o começo', async () => {
    const { store, titulos } = await comAbas(4)
    const c = store.getState().tabs[2].id
    store.dispatch({ type: 'tab/reorder', tabId: c, toIndex: 0 })
    expect(titulos()).toEqual(['C', 'A', 'B', 'D'])
  })

  it('leva para o fim', async () => {
    const { store, titulos } = await comAbas(4)
    const a = store.getState().tabs[0].id
    store.dispatch({ type: 'tab/reorder', tabId: a, toIndex: 4 })
    expect(titulos()).toEqual(['B', 'C', 'D', 'A'])
  })

  it('mover para a frente desconta a própria saída da fila', async () => {
    /*
     * `toIndex` chega medido no array de ANTES de tirar a aba do lugar, que é
     * o que o `dragover` enxerga. Tirando uma de antes do alvo, tudo desliza
     * uma casa — sem esse desconto, arrastar para a direita erraria sempre
     * por um, e sempre para o mesmo lado.
     */
    const { store, titulos } = await comAbas(4)
    const a = store.getState().tabs[0].id
    store.dispatch({ type: 'tab/reorder', tabId: a, toIndex: 2 })
    expect(titulos()).toEqual(['B', 'A', 'C', 'D'])
  })

  it('soltar no mesmo lugar não mexe em nada', async () => {
    const { store, titulos } = await comAbas(3)
    const b = store.getState().tabs[1].id
    store.dispatch({ type: 'tab/reorder', tabId: b, toIndex: 1 })
    expect(titulos()).toEqual(['A', 'B', 'C'])
  })

  it('id que não existe não mexe na fila', async () => {
    const { store, titulos } = await comAbas(3)
    store.dispatch({ type: 'tab/reorder', tabId: 'aba-fantasma', toIndex: 0 })
    expect(titulos()).toEqual(['A', 'B', 'C'])
  })

  it('a aba ativa continua a mesma depois do arrasto', async () => {
    // reordenar é arrumar a mesa, não trocar de roteiro — trocar o que está
    // no ar por causa de um arrasto seria assustador ao vivo
    const { store } = await comAbas(3)
    const ativa = store.getState().activeTabId
    store.dispatch({ type: 'tab/reorder', tabId: store.getState().tabs[2].id, toIndex: 0 })
    expect(store.getState().activeTabId).toBe(ativa)
  })

  it('a aba nasce com o nome no idioma do app, e não em português', async () => {
    /*
     * O nome estava escrito à mão — `'Aba 1'` e `` `Aba ${n}` `` —, então
     * TODO usuário, em qualquer um dos seis idiomas, recebia abas em
     * português. Não dava erro, não quebrava nada, e aparecia na barra a
     * sessão inteira.
     */
    const { Store } = await import('./state')
    const store = new Store()
    store.dispatch({ type: 'app/language', language: 'en' })
    store.dispatch({ type: 'tab/add' })
    const nomes = store.getState().tabs.map((t) => t.title)
    expect(nomes[nomes.length - 1]).toBe(`Tab ${nomes.length}`)

    store.dispatch({ type: 'app/language', language: 'fr' })
    store.dispatch({ type: 'tab/add' })
    const depois = store.getState().tabs.map((t) => t.title)
    expect(depois[depois.length - 1]).toBe(`Onglet ${depois.length}`)
  })

  it('a cor acompanha a aba, e não a posição', async () => {
    // a cor é gravada quando a aba nasce; se ela viesse do índice, arrastar
    // repintaria os pontinhos e o operador perderia a referência visual
    const { store } = await comAbas(3)
    const terceira = store.getState().tabs[2]
    store.dispatch({ type: 'tab/reorder', tabId: terceira.id, toIndex: 0 })
    expect(store.getState().tabs[0].color).toBe(terceira.color)
  })
})
