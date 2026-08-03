import { describe, expect, it } from 'vitest'
import {
  anchorFromCaret,
  blockWordCount,
  blocksFromText,
  hasFormatting,
  reconcileBlocks,
  serializeBlocks,
  stripFormatting,
  totalWordCount,
  words
} from './text'

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

  it('preserva a quebra de linha que o operador digitou', () => {
    // ele colocou ali de propósito: a quebra precisa chegar até a tela do
    // apresentador, não virar espaço
    const blocks = blocksFromText('primeira linha\nsegunda linha\n\noutro parágrafo')

    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('primeira linha\nsegunda linha')
    expect(blocks[1].text).toBe('outro parágrafo')
  })

  it('faz ida e volta pelo editor sem alterar o texto', () => {
    // o editor compara o que recebe com o que mandou; toda diferença aqui é
    // uma chance de o cursor pular sozinho enquanto se digita
    const roundTrip = (text: string): string => serializeBlocks(blocksFromText(text))

    expect(roundTrip('abc\n')).toBe('abc\n')
    expect(roundTrip('abc\ndef')).toBe('abc\ndef')
    expect(roundTrip('abc\n\ndef')).toBe('abc\n\ndef')
    // linha em branco no fim não tem parágrafo para sustentar, e é descartada
    expect(roundTrip('abc\n\n')).toBe('abc')
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

describe('anchorFromCaret — o "Go To" do rodapé da edição', () => {
  it('acha o bloco e a palavra certos dentro de um parágrafo de fala', () => {
    const text = 'boa noite a todos\n\nsegundo parágrafo aqui'
    const blocks = blocksFromText(text)

    // cursor logo depois de "boa noite" (9 caracteres) — 2 palavras percorridas
    const anchor = anchorFromCaret(blocks, text, 9)
    expect(anchor).toEqual({ blockId: blocks[0].id, wordOffset: 2 })
  })

  it('pousa no início da linha para capítulo e direção, sem contar palavras', () => {
    const text = '§ Abertura\n\n[olhar câmera 2]'
    const blocks = blocksFromText(text)

    const noCapitulo = anchorFromCaret(blocks, text, 5)
    expect(noCapitulo).toEqual({ blockId: blocks[0].id, wordOffset: 0 })

    const naDirecao = anchorFromCaret(blocks, text, text.length - 3)
    expect(naDirecao).toEqual({ blockId: blocks[1].id, wordOffset: 0 })
  })

  it('cursor no respiro entre parágrafos pousa no início do seguinte', () => {
    const text = 'primeiro\n\nsegundo'
    const blocks = blocksFromText(text)
    const gap = text.indexOf('\n\n') + 1 // dentro da quebra dupla, antes do segundo parágrafo

    const anchor = anchorFromCaret(blocks, text, gap)
    expect(anchor).toEqual({ blockId: blocks[1].id, wordOffset: 0 })
  })

  it('mantém o id do bloco mesmo com digitação ainda não confirmada pelo main', () => {
    const before = blocksFromText('o apresentador fala com calma')
    // "muita" foi digitado agora mesmo; before ainda não sabe disso
    const draft = 'o apresentador fala com muita calma'
    const caret = draft.length

    const anchor = anchorFromCaret(before, draft, caret)
    expect(anchor?.blockId).toBe(before[0].id)
    expect(anchor?.wordOffset).toBe(words(draft).length)
  })

  it('texto vazio não tem para onde ir', () => {
    expect(anchorFromCaret([], '', 0)).toBeNull()
  })
})

describe('remover formatação', () => {
  it('tira as marcas e mantém as palavras', () => {
    // é "remover formatação", como em qualquer editor — e não "apagar trecho"
    const texto = '§ Abertura\n\nBoa noite.\n\n[olhar câmera 2 · pausa]\n\n## Bloco 2\n\nFim.'
    expect(stripFormatting(texto)).toBe('Abertura\n\nBoa noite.\n\nolhar câmera 2 · pausa\n\nBloco 2\n\nFim.')
  })

  it('tudo vira fala, e por isso o roteiro passa a durar mais', () => {
    const antes = blocksFromText('§ Abertura\n\n[pausa longa]\n\nBoa noite.')
    const depois = blocksFromText(stripFormatting('§ Abertura\n\n[pausa longa]\n\nBoa noite.'))

    expect(antes.map((b) => b.kind)).toEqual(['chapter', 'direction', 'speech'])
    expect(depois.every((b) => b.kind === 'speech')).toBe(true)
    expect(totalWordCount(depois)).toBeGreaterThan(totalWordCount(antes))
  })

  it('a direção de várias linhas sai inteira', () => {
    // classificar é por PARÁGRAFO: olhar linha a linha deixaria o fecho do
    // colchete para trás e a direção viraria meia direção
    expect(stripFormatting('[olhar câmera 2\ne esperar o VT]')).toBe('olhar câmera 2\ne esperar o VT')
  })

  it('texto já simples não muda em nada', () => {
    // o botão só existe quando há o que tirar; sem isso ele seria um clique
    // que suja o histórico sem mexer no roteiro
    const simples = 'Boa noite.\n\nHoje a gente vai falar sobre uma mudança.'
    expect(stripFormatting(simples)).toBe(simples)
    expect(hasFormatting(blocksFromText(simples))).toBe(false)
    expect(hasFormatting(blocksFromText('§ Abertura\n\nBoa noite.'))).toBe(true)
  })

  it('não confunde colchete no meio da frase com direção', () => {
    const meio = 'Ele disse [textualmente] que não vem.'
    expect(stripFormatting(meio)).toBe(meio)
  })
})
