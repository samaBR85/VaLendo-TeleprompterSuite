import { describe, expect, it } from 'vitest'
import { createTab, TAB_COLORS } from './defaults'
import { duplicarAba, marcadoresRemapeados, nomeDaCopia } from './duplicarAba'
import type { Tab } from './types'

const ROTEIRO = ['## ABERTURA', '', 'Boa noite.', '', 'E agora as notícias.'].join('\n')

function original(): Tab {
  const tab = createTab('ROTEIRO PGM', ROTEIRO, TAB_COLORS[0])
  tab.markers = [
    { id: 'm1', blockId: tab.blocks[0].id, label: 'topo' },
    { id: 'm2', blockId: tab.blocks[2].id, label: 'notícias' }
  ]
  tab.apresentadores = [{ id: 'a1', nome: 'HARI', cor: '#7ee0a8' }]
  tab.exportPath = 'D:/programas/roteiro.txt'
  tab.appearance.fontSize = 72
  return tab
}

describe('a cópia leva o que é conteúdo', () => {
  it('leva o texto inteiro, palavra por palavra', () => {
    const copia = duplicarAba(original(), [], TAB_COLORS[1])
    expect(copia.blocks.map((b) => b.text)).toEqual(original().blocks.map((b) => b.text))
  })

  it('leva a aparência e os apresentadores', () => {
    const copia = duplicarAba(original(), [], TAB_COLORS[1])
    expect(copia.appearance.fontSize).toBe(72)
    expect(copia.apresentadores.map((a) => a.nome)).toEqual(['HARI'])
  })

  it('não divide o objeto de relógios com a original', () => {
    // duas abas apontando para o MESMO objeto de aparência fariam mexer numa
    // mexer na outra, e o defeito só apareceria com as duas no ar
    const origem = original()
    const copia = duplicarAba(origem, [], TAB_COLORS[1])
    copia.appearance.timers.elapsed = !copia.appearance.timers.elapsed
    expect(origem.appearance.timers.elapsed).not.toBe(copia.appearance.timers.elapsed)
  })
})

describe('a cópia NÃO leva o que pertence à original', () => {
  it('não leva o caminho do arquivo', () => {
    /*
     * O ponto mais perigoso da função inteira. `exportPath` é o que faz Ctrl+S
     * regravar sem perguntar; herdado, o primeiro Ctrl+S na cópia gravaria o
     * texto dela por cima do arquivo da ORIGINAL, calado, no meio de uma
     * gravação.
     */
    expect(duplicarAba(original(), [], TAB_COLORS[1]).exportPath).toBeUndefined()
  })

  it('não leva o id da aba nem os ids dos blocos', () => {
    // id de bloco repetido entre abas faria um marcador de uma resolver dentro
    // da outra, e a marca de leitura cair no roteiro errado
    const origem = original()
    const copia = duplicarAba(origem, [], TAB_COLORS[1])
    expect(copia.id).not.toBe(origem.id)
    const ids = new Set(origem.blocks.map((b) => b.id))
    for (const bloco of copia.blocks) expect(ids.has(bloco.id)).toBe(false)
  })

  it('começa a leitura no início, e não onde a original parou', () => {
    const origem = original()
    origem.anchor = { blockId: origem.blocks[2].id, wordOffset: 1 }
    const copia = duplicarAba(origem, [], TAB_COLORS[1])
    expect(copia.anchor?.blockId).toBe(copia.blocks[0].id)
    expect(copia.anchor?.wordOffset).toBe(0)
  })
})

describe('os marcadores', () => {
  it('apontam para os blocos da CÓPIA, na mesma posição', () => {
    const origem = original()
    const copia = duplicarAba(origem, [], TAB_COLORS[1])
    expect(copia.markers).toHaveLength(2)
    expect(copia.markers[0].blockId).toBe(copia.blocks[0].id)
    expect(copia.markers[1].blockId).toBe(copia.blocks[2].id)
    expect(copia.markers.map((m) => m.label)).toEqual(['topo', 'notícias'])
  })

  it('nenhum marcador da cópia aponta para bloco da original', () => {
    const origem = original()
    const copia = duplicarAba(origem, [], TAB_COLORS[1])
    const daOrigem = new Set(origem.blocks.map((b) => b.id))
    for (const m of copia.markers) expect(daOrigem.has(m.blockId)).toBe(false)
  })

  it('são descartados se as duas listas de blocos não baterem', () => {
    /*
     * O casamento é posicional, e isso é uma suposição sobre a ida e volta do
     * texto — não uma garantia. Se ela furar, marcador no lugar errado não
     * parece defeito: parece o roteiro, e só se descobre saltando para a linha
     * errada no meio do programa. Melhor nenhum.
     */
    const origem = original()
    const curta = createTab('curta', 'uma linha só', TAB_COLORS[1])
    expect(marcadoresRemapeados(origem, curta)).toEqual([])
  })

  it('marcador órfão na origem não ganha destino inventado', () => {
    const origem = original()
    origem.markers = [{ id: 'm9', blockId: 'bloco-que-nao-existe', label: 'solto' }]
    expect(duplicarAba(origem, [], TAB_COLORS[1]).markers).toEqual([])
  })
})

describe('o nome da cópia', () => {
  it('ganha (2)', () => {
    expect(nomeDaCopia('ROTEIRO PGM', [])).toBe('ROTEIRO PGM (2)')
  })

  it('sobe o número enquanto o nome já existir', () => {
    const usadas = [createTab('Bloco', '', TAB_COLORS[0]), createTab('Bloco (2)', '', TAB_COLORS[1])]
    expect(nomeDaCopia('Bloco', usadas)).toBe('Bloco (3)')
  })

  it('duplicar a cópia dá (3), e não "(2) (2)"', () => {
    const usadas = [createTab('Bloco', '', TAB_COLORS[0]), createTab('Bloco (2)', '', TAB_COLORS[1])]
    expect(nomeDaCopia('Bloco (2)', usadas)).toBe('Bloco (3)')
  })
})
