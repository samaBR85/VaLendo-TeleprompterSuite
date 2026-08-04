import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '@shared/defaults'

/**
 * Uma pasta de dados por arquivo de teste, no lugar do `userData` do Electron.
 *
 * O `Store` chega ao disco por `app.getPath('userData')`; sem Electron rodando,
 * é este mock que responde. A pasta é de verdade — o que se cobra aqui é o
 * comportamento com arquivo no disco, não com um sistema de arquivos fingido.
 */
const pasta = mkdtempSync(join(tmpdir(), 'valendo-partida-'))
vi.mock('electron', () => ({ app: { getPath: () => pasta } }))

/**
 * O app NÃO revela mais o trabalho gravado sozinho.
 *
 * Abrir o Valendo num estúdio alheio, ou com a tela já espelhada no telão,
 * mostrava o roteiro anterior sem ninguém ter pedido — e roteiro é material de
 * cliente. A tela começa em branco, o gravado espera de lado, e quem revela é
 * "Continuar de onde parei".
 */
describe('a partida não mostra o que estava gravado', () => {
  const gravado = {
    ...createInitialState(undefined, 'pt-BR'),
    sidebarWidth: 321
  }

  beforeEach(() => {
    writeFileSync(join(pasta, 'workspace.json'), JSON.stringify(gravado), 'utf8')
    vi.resetModules()
  })

  it('abre com o roteiro em branco, mesmo havendo trabalho salvo', async () => {
    const { Store } = await import('./state')
    const state = new Store().getState()

    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].blocks.every((b) => b.text === '')).toBe(true)
    // nem escondido num canto do estado: o texto não entrou de jeito nenhum
    expect(JSON.stringify(state)).not.toContain('Boa noite')
  })

  it('mas o idioma e as preferências da máquina acompanham', async () => {
    const { Store } = await import('./state')
    const state = new Store().getState()

    expect(state.language).toBe('pt-BR')
    // conforto não é confidencial: perder o tamanho da janela a cada abertura
    // seria pagar um preço sem comprar nada
    expect(state.maquina).toEqual(gravado.maquina)
  })

  it('"Continuar" traz o gravado de volta inteiro', async () => {
    const { Store } = await import('./state')
    const store = new Store()
    store.dispatch({ type: 'estreia/continuar' })
    const state = store.getState()

    expect(JSON.stringify(state)).toContain('Boa noite')
    expect(state.sidebarWidth).toBe(321)
  })

  it('trocar de idioma no modal não estraga o que está guardado', async () => {
    const { Store } = await import('./state')
    const store = new Store()
    store.dispatch({ type: 'estreia/language', language: 'de' })
    expect(store.getState().language).toBe('de')
    // o gravado continua lá, no idioma em que foi gravado
    store.dispatch({ type: 'estreia/continuar' })
    expect(store.getState().language).toBe('pt-BR')
    expect(JSON.stringify(store.getState())).toContain('Boa noite')
  })

  it('"Ver a demonstração" põe a amostra no idioma escolhido', async () => {
    const { Store } = await import('./state')
    const store = new Store()
    store.dispatch({ type: 'estreia/language', language: 'de' })
    store.dispatch({ type: 'estreia/demo' })

    expect(store.getState().language).toBe('de')
    expect(JSON.stringify(store.getState())).toContain('Eröffnung')
  })
})

/**
 * Workspace gravado por uma versão anterior à ferramenta em questão.
 *
 * Este arquivo NÃO se conserta sozinho com o tempo: o autosave fica travado
 * até as boas-vindas, então o arquivo antigo espera no disco com os campos
 * faltando até alguém clicar em "Continuar de onde parei" — e é exatamente aí,
 * com o trabalho do operador na mão, que a falta cobra o preço.
 */
describe('workspace de versão anterior abre inteiro', () => {
  /** Um workspace como era antes dos apresentadores: abas sem o campo. */
  const antigo = (() => {
    const base = createInitialState(undefined, 'pt-BR')
    return {
      ...base,
      tabs: base.tabs.map((tab) => {
        const { apresentadores: _fora, ...semApresentadores } = tab
        return semApresentadores
      })
    }
  })()

  beforeEach(() => {
    writeFileSync(join(pasta, 'workspace.json'), JSON.stringify(antigo), 'utf8')
    vi.resetModules()
  })

  it('aba sem apresentadores vira lista vazia, nunca indefinida', async () => {
    // indefinido chegava ao renderer e a primeira leitura da lista derrubava a
    // árvore inteira: janela BRANCA, sem mensagem, com o roteiro intacto no
    // disco e nenhuma pista disso na tela
    const { Store } = await import('./state')
    const store = new Store()
    store.dispatch({ type: 'estreia/continuar' })

    for (const tab of store.getState().tabs) {
      expect(tab.apresentadores).toEqual([])
    }
  })

  it('e o texto gravado volta junto', async () => {
    // a garantia acima não pode ter sido comprada jogando as abas fora
    const { Store } = await import('./state')
    const store = new Store()
    store.dispatch({ type: 'estreia/continuar' })

    expect(JSON.stringify(store.getState())).toContain('Boa noite')
  })
})
