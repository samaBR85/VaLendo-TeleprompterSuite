import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** o `Store` chega ao disco por `app.getPath('userData')` — sem Electron, é este mock que responde */
const pasta = mkdtempSync(join(tmpdir(), 'valendo-marcas-'))
vi.mock('electron', () => ({ app: { getPath: () => pasta } }))

const TEXTO = 'A ação começa agora.\n\nE a ação termina depois.'

async function comRoteiro(): Promise<{
  store: InstanceType<typeof import('./state').Store>
  aba: string
  blocos: () => import('@shared/types').Block[]
  cercado: () => string[]
}> {
  const { Store } = await import('./state')
  const store = new Store()
  const aba = store.getState().activeTabId
  store.dispatch({ type: 'text/set', tabId: aba, text: TEXTO })
  const blocos = (): import('@shared/types').Block[] =>
    store.getState().tabs.find((t) => t.id === aba)!.blocks
  const cercado = (): string[] =>
    blocos().flatMap((b) => (b.marcas ?? []).map((m) => b.text.slice(m.de, m.ate)))
  return { store, aba, blocos, cercado }
}

beforeEach(() => vi.resetModules())

describe('pintar trechos do roteiro', () => {
  it('pinta o trecho selecionado, e só ele', async () => {
    // "ação" do primeiro bloco: posições 2 a 6 do texto inteiro
    const { store, aba, cercado } = await comRoteiro()
    store.dispatch({ type: 'marca/aplicar', tabId: aba, trechos: [{ de: 2, ate: 6 }], patch: { cor: '#e5484d' } })
    expect(cercado()).toEqual(['ação'])
  })

  it('pintar as duas ocorrências custa UM passo de desfazer, não dois', async () => {
    /*
     * O ponto da ação receber uma LISTA. Em duas chamadas, o Ctrl+Z despintaria
     * metade — e num roteiro no ar "metade do jeito antigo" é pior que qualquer
     * um dos dois inteiros.
     */
    const { store, aba, cercado } = await comRoteiro()
    const antes = store.historyInfo().depth
    // a segunda "ação" começa no bloco 2, posição 4 dele
    store.dispatch({
      type: 'marca/aplicar',
      tabId: aba,
      trechos: [
        { de: 2, ate: 6 },
        { de: TEXTO.indexOf('ação', 10), ate: TEXTO.indexOf('ação', 10) + 4 }
      ],
      patch: { cor: '#e5484d' }
    })
    expect(cercado()).toEqual(['ação', 'ação'])
    expect(store.historyInfo().depth - antes).toBe(1)

    store.dispatch({ type: 'history/undo', tabId: aba })
    expect(cercado()).toEqual([])
  })

  it('um trecho que atravessa dois blocos vira marca nos dois', async () => {
    const { store, aba, blocos } = await comRoteiro()
    store.dispatch({ type: 'marca/aplicar', tabId: aba, trechos: [{ de: 15, ate: 26 }], patch: { negrito: true } })
    expect(blocos()[0].marcas).toHaveLength(1)
    expect(blocos()[1].marcas).toHaveLength(1)
  })

  it('limpar tira a marca e o bloco larga o campo', async () => {
    // sem largar o campo, o .valendo carregaria uma lista vazia em todo bloco
    // que um dia teve marca
    const { store, aba, blocos } = await comRoteiro()
    store.dispatch({ type: 'marca/aplicar', tabId: aba, trechos: [{ de: 2, ate: 6 }], patch: { cor: '#e5484d' } })
    store.dispatch({ type: 'marca/limpar', tabId: aba, trechos: [{ de: 0, ate: 200 }] })
    expect('marcas' in blocos()[0]).toBe(false)
  })

  it('pintar NÃO mexe na posição de leitura', async () => {
    // é a promessa que sustenta editar com o programa no ar: quem está lendo
    // não pode sentir uma pincelada
    const { store, aba } = await comRoteiro()
    const antes = store.getState().transport.wordsAtStart
    store.dispatch({ type: 'marca/aplicar', tabId: aba, trechos: [{ de: 2, ate: 6 }], patch: { cor: '#e5484d' } })
    expect(store.getState().transport.wordsAtStart).toBe(antes)
  })

  it('lista vazia não gasta um passo de histórico', async () => {
    const { store, aba } = await comRoteiro()
    const antes = store.historyInfo().depth
    store.dispatch({ type: 'marca/aplicar', tabId: aba, trechos: [], patch: { cor: '#e5484d' } })
    expect(store.historyInfo().depth).toBe(antes)
  })

  it('a marca sobrevive a digitar num parágrafo ACIMA dela', async () => {
    /*
     * O caso de todo dia, ponta a ponta: a marca está no segundo bloco, o
     * operador corrige o primeiro, e ela continua na palavra certa.
     */
    const { store, aba, cercado } = await comRoteiro()
    const segunda = TEXTO.indexOf('ação', 10)
    store.dispatch({ type: 'marca/aplicar', tabId: aba, trechos: [{ de: segunda, ate: segunda + 4 }], patch: { cor: '#e5484d' } })
    store.dispatch({ type: 'text/set', tabId: aba, text: TEXTO.replace('A ação começa', 'A ação começa mesmo') })
    expect(cercado()).toEqual(['ação'])
  })
})

describe('a roda das cores recentes', () => {
  it('anda ao usar uma cor, sem gastar um passo de desfazer', async () => {
    /*
     * "Usei este roxo" é preferência da máquina, não conteúdo do roteiro. Um
     * Ctrl+Z que devolvesse a roda seria um desfazer que não desfaz nada
     * visível no texto — e comeria o desfazer de verdade que o operador queria.
     */
    const { store } = await comRoteiro()
    const antes = store.historyInfo().depth
    store.dispatch({ type: 'marca/corUsada', cor: '#9d5bd2' })
    expect(store.getState().maquina.coresRecentes).toEqual(['#9d5bd2'])
    expect(store.historyInfo().depth).toBe(antes)
  })

  it('a quinta cor recomeça na primeira casa', async () => {
    const { store } = await comRoteiro()
    for (const cor of ['#111111', '#222222', '#333333', '#444444', '#555555']) {
      store.dispatch({ type: 'marca/corUsada', cor })
    }
    expect(store.getState().maquina.coresRecentes).toEqual([
      '#555555',
      '#222222',
      '#333333',
      '#444444'
    ])
  })

  it('a roda NÃO viaja no projeto salvo', async () => {
    // a caixa de tintas é do operador; mandar um .valendo para um colega não
    // pode levar junto o vermelho que você estava usando ontem
    const { semMaquina } = await import('@shared/project')
    const { store } = await comRoteiro()
    store.dispatch({ type: 'marca/corUsada', cor: '#9d5bd2' })
    expect(semMaquina(store.getState()).maquina.coresRecentes).toEqual([])
  })
})
