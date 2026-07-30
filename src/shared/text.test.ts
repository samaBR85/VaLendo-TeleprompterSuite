import { describe, expect, it } from 'vitest'
import { blockWordCount, blocksFromText, reconcileBlocks, serializeBlocks, totalWordCount } from './text'

describe('classificação de blocos', () => {
  it('reconhece fala, direção e capítulo', () => {
    const blocks = blocksFromText('§ Abertura\n\nboa noite a todos\n\n[olhar câmera 2]\n\n## Bloco 2')
    expect(blocks.map((b) => b.kind)).toEqual(['chapter', 'speech', 'direction', 'chapter'])
  })

  it('direções e capítulos não contam palavras', () => {
    const blocks = blocksFromText('§ Abertura\n\numa duas três\n\n[não conta]')
    expect(blocks.map(blockWordCount)).toEqual([0, 3, 0])
    expect(totalWordCount(blocks)).toBe(3)
  })

  it('normaliza o texto: é o que o editor precisa reconhecer como eco', () => {
    // o modelo de blocos descarta espaço em branco de sobra. Se o editor não
    // souber que "abc\n" volta como "abc", ele adota a versão normalizada e
    // recua o cursor — era o Enter que "não funcionava"
    const roundTrip = (text: string): string => serializeBlocks(blocksFromText(text))

    expect(roundTrip('abc\n')).toBe('abc')
    expect(roundTrip('abc\n\n')).toBe('abc')
    expect(roundTrip('abc\ndef')).toBe('abc def')
    expect(roundTrip('abc\n\ndef')).toBe('abc\n\ndef')
  })

  it('junta linhas soltas dentro do mesmo parágrafo', () => {
    const blocks = blocksFromText('primeira linha\nsegunda linha\n\noutro parágrafo')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('primeira linha segunda linha')
  })
})

describe('reconcileBlocks — estabilidade dos ids', () => {
  it('mantém o id dos parágrafos intocados ao inserir um novo acima', () => {
    const before = blocksFromText('parágrafo um\n\nparágrafo dois')
    const after = reconcileBlocks(before, 'parágrafo um\n\nNOVO\n\nparágrafo dois')

    expect(after).toHaveLength(3)
    expect(after[0].id).toBe(before[0].id)
    expect(after[2].id).toBe(before[1].id)
    expect(after[1].id).not.toBe(before[1].id)
  })

  it('mantém o id ao digitar dentro de um parágrafo', () => {
    const before = blocksFromText('o apresentador fala com calma')
    const after = reconcileBlocks(before, 'o apresentador fala com muita calma')
    expect(after[0].id).toBe(before[0].id)
  })

  it('mantém o id de um parágrafo movido de lugar', () => {
    const before = blocksFromText('alfa alfa alfa\n\nbeta beta beta')
    const after = reconcileBlocks(before, 'beta beta beta\n\nalfa alfa alfa')
    expect(after[0].id).toBe(before[1].id)
    expect(after[1].id).toBe(before[0].id)
  })

  it('gera id novo para um parágrafo que não parece com nenhum anterior', () => {
    const before = blocksFromText('alfa alfa alfa')
    const after = reconcileBlocks(before, 'alfa alfa alfa\n\nzzz qqq www')
    expect(after[0].id).toBe(before[0].id)
    expect(before.some((b) => b.id === after[1].id)).toBe(false)
  })

  it('não reaproveita o mesmo id duas vezes', () => {
    const before = blocksFromText('igual igual igual')
    const after = reconcileBlocks(before, 'igual igual igual\n\nigual igual igual')
    expect(new Set(after.map((b) => b.id)).size).toBe(2)
  })

  it('sobrevive a ida e volta pelo texto do editor', () => {
    const blocks = blocksFromText('§ Título\n\nfala aqui\n\n[direção]')
    const round = reconcileBlocks(blocks, serializeBlocks(blocks))
    expect(round.map((b) => b.id)).toEqual(blocks.map((b) => b.id))
    expect(round.map((b) => b.kind)).toEqual(blocks.map((b) => b.kind))
  })
})
