import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** o `Store` chega ao disco por `app.getPath('userData')` — sem Electron, é este mock que responde */
const pasta = mkdtempSync(join(tmpdir(), 'valendo-dispatch-'))
vi.mock('electron', () => ({ app: { getPath: () => pasta } }))

/**
 * A falha de mentira.
 *
 * `composeLines` é o que `tab/activate` chama primeiro, e `tab/activate` é
 * despachado de DENTRO de `tab/duplicate`, depois de a aba nova já ter entrado
 * na lista. É o formato exato do que se quer provar: o erro no meio de um caso
 * de várias etapas, que sem a rede deixaria o estado pela metade.
 */
const bomba = vi.hoisted(() => ({ armada: false }))

vi.mock('@shared/anchor', async () => {
  const real = await vi.importActual<typeof import('@shared/anchor')>('@shared/anchor')
  return {
    ...real,
    composeLines: (...args: Parameters<typeof real.composeLines>) => {
      if (bomba.armada) throw new Error('falha de mentira, só para o teste')
      return real.composeLines(...args)
    }
  }
})

async function comDuasAbas(): Promise<{
  store: InstanceType<typeof import('./state').Store>
  saude: typeof import('./storage').storageHealth
}> {
  const { Store } = await import('./state')
  const { storageHealth } = await import('./storage')
  const store = new Store()
  store.dispatch({ type: 'tab/add' })
  return { store, saude: storageHealth }
}

beforeEach(() => {
  bomba.armada = false
  vi.resetModules()
})

describe('o despacho do main tem rede', () => {
  it('uma exceção no reducer não sobe — sem isso, o processo principal morre e a tela do apresentador apaga', async () => {
    const { store } = await comDuasAbas()
    bomba.armada = true
    expect(() => store.dispatch({ type: 'tab/duplicate', tabId: store.getState().tabs[0].id })).not.toThrow()
  })

  it('o estado volta a ser o de antes da ação, e não a metade que deu tempo de acontecer', async () => {
    /*
     * `tab/duplicate` já tinha posto a aba nova na lista quando o erro veio, no
     * `tab/activate` de dentro. Sem repor, o app seguiria com três abas na
     * memória, uma delas ativa em lugar nenhum.
     */
    const { store } = await comDuasAbas()
    const antes = store.getState()
    bomba.armada = true
    store.dispatch({ type: 'tab/duplicate', tabId: antes.tabs[0].id })

    expect(store.getState()).toBe(antes)
    expect(store.getState().tabs).toHaveLength(2)
    expect(store.getState().activeTabId).toBe(antes.activeTabId)
  })

  it('o operador fica sabendo: aviso na tela e a pilha no problemas.log', async () => {
    // o renderer despacha por `ipcRenderer.send`, que não tem caminho de volta
    // para o erro — se não avisarmos daqui, a ação some em silêncio
    const { store, saude } = await comDuasAbas()
    bomba.armada = true
    store.dispatch({ type: 'tab/duplicate', tabId: store.getState().tabs[0].id })

    expect(saude().notice).toContain('tab/duplicate')

    const log = join(pasta, 'problemas.log')
    expect(existsSync(log)).toBe(true)
    const linhas = readFileSync(log, 'utf8')
    expect(linhas).toContain('tab/duplicate')
    expect(linhas).toContain('falha de mentira')
  })

  it('a ação seguinte funciona normalmente', async () => {
    // o `finally` que devolve o `despachando` para `false` é o que garante
    // isto: um erro não pode deixar todo despacho posterior sem rede
    const { store } = await comDuasAbas()
    bomba.armada = true
    store.dispatch({ type: 'tab/duplicate', tabId: store.getState().tabs[0].id })

    bomba.armada = false
    store.dispatch({ type: 'tab/add' })
    expect(store.getState().tabs).toHaveLength(3)
  })
})
