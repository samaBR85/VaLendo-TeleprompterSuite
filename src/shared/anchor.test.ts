import { describe, expect, it } from 'vitest'
import {
  anchorFromPixel,
  anchorFromWordIndex,
  composeLines,
  pixelFromAnchor,
  remapAnchor,
  totalWords,
  wordIndexFromAnchor,
  type Layout,
  type LineSpec
} from './anchor'
import { reconcileBlocks } from './text'
import type { Anchor, Block, LineRule } from './types'

const RULE: LineRule = { minWords: 3, maxWords: 6 }

/** Simula a medição do DOM: toda linha com a mesma altura. */
function withGeometry(lines: LineSpec[], lineHeight: number): Layout {
  return lines.map((line, i) => ({ ...line, top: i * lineHeight, height: lineHeight }))
}

function doc(...texts: string[]): Block[] {
  return reconcileBlocks([], texts.join('\n\n'))
}

describe('composeLines', () => {
  it('não recompõe as linhas quando só o corpo da fonte muda', () => {
    const blocks = doc('uma frase razoavelmente longa que precisa ocupar mais de uma linha inteira aqui')
    const lines = composeLines(blocks, RULE)

    // a geometria muda, a composição não — é o que garante trocar fonte sem refluxo
    const small = withGeometry(lines, 40)
    const large = withGeometry(lines, 120)

    expect(small.map((l) => l.text)).toEqual(large.map((l) => l.text))
    expect(small.map((l) => l.wordCount)).toEqual(large.map((l) => l.wordCount))
  })

  it('dá peso não-zero a direções e capítulos, para a rolagem não pular a altura deles', () => {
    // regressão: com peso zero, o relógio atravessa a linha inteira num
    // instante e o texto salta na tela bem em cima de uma anotação
    const blocks = doc('§ Abertura', 'duas palavras aqui agora', '[olhar câmera 2]')
    const lines = composeLines(blocks, RULE)

    const chapter = lines.find((l) => l.kind === 'chapter')
    const direction = lines.find((l) => l.kind === 'direction')

    expect(chapter?.wordCount).toBeGreaterThan(0)
    expect(direction?.wordCount).toBeGreaterThan(0)
    expect(totalWords(lines)).toBeGreaterThan(4)
  })

  it('mantém a régua em números inteiros', () => {
    // a contagem vira "Palavras" no rodapé: fração ali aparece como "108,5"
    const blocks = doc('§ Abertura', 'duas palavras aqui agora', '[pausa]')
    for (const rule of [
      { minWords: 4, maxWords: 7 },
      { minWords: 3, maxWords: 6 },
      { minWords: 1, maxWords: 2 }
    ]) {
      expect(Number.isInteger(totalWords(composeLines(blocks, rule))), JSON.stringify(rule)).toBe(true)
    }
  })

  it('atravessa direção e capítulo em pixel contínuo, sem salto', () => {
    const blocks = doc('fala antes da direção aqui', '[uma direção com bom tamanho de texto]', 'fala depois da direção aqui')
    const layout = withGeometry(composeLines(blocks, RULE), 50)

    let previousY = -1
    const totalScrollWords = totalWords(layout)
    for (let w = 0; w <= totalScrollWords; w += 0.25) {
      const anchor = anchorFromWordIndex(layout, w) as Anchor
      const y = pixelFromAnchor(layout, anchor) as number
      // nenhum incremento pequeno de w pode corresponder a um salto grande de pixel
      expect(y - previousY).toBeLessThan(30)
      previousY = y
    }
  })
})

describe('pixelFromAnchor e anchorFromPixel', () => {
  it('são inversos um do outro', () => {
    const blocks = doc('palavra um dois três quatro cinco seis sete oito nove dez onze doze')
    const layout = withGeometry(composeLines(blocks, RULE), 50)

    const anchor: Anchor = { blockId: blocks[0].id, wordOffset: 7 }
    const y = pixelFromAnchor(layout, anchor)
    expect(y).not.toBeNull()

    const back = anchorFromPixel(layout, y as number)
    expect(back?.blockId).toBe(anchor.blockId)
    expect(back?.wordOffset).toBeCloseTo(anchor.wordOffset, 5)
  })

  it('cresce de forma monotônica ao longo do documento', () => {
    const blocks = doc('a b c d e f g h i j k l m n o p q r s t')
    const layout = withGeometry(composeLines(blocks, RULE), 50)

    let previous = -1
    for (let w = 0; w <= 20; w += 0.5) {
      const anchor = anchorFromWordIndex(layout, w)
      const y = pixelFromAnchor(layout, anchor as Anchor) as number
      expect(y).toBeGreaterThanOrEqual(previous)
      previous = y
    }
  })

  it('devolve null para um bloco que não existe mais no layout', () => {
    const blocks = doc('alguma coisa escrita aqui')
    const layout = withGeometry(composeLines(blocks, RULE), 50)
    expect(pixelFromAnchor(layout, { blockId: 'inexistente', wordOffset: 0 })).toBeNull()
  })
})

describe('índice global de palavras', () => {
  it('fecha nos dois sentidos atravessando blocos', () => {
    const blocks = doc('um dois três quatro cinco', '[direção]', 'seis sete oito nove dez onze doze')
    const lines = composeLines(blocks, RULE)

    for (const index of [0, 3, 5, 8, 11]) {
      const anchor = anchorFromWordIndex(lines, index)
      expect(anchor).not.toBeNull()
      expect(wordIndexFromAnchor(lines, anchor as Anchor)).toBeCloseTo(index, 5)
    }
  })
})

describe('remapAnchor — o teste que define o produto', () => {
  it('não move a âncora quando um parágrafo é inserido ACIMA do ponto de leitura', () => {
    const before = doc('primeiro parágrafo do roteiro', 'segundo parágrafo sendo lido agora')
    const anchor: Anchor = { blockId: before[1].id, wordOffset: 2 }

    const after = reconcileBlocks(
      before,
      ['primeiro parágrafo do roteiro', 'PARÁGRAFO NOVO ENFIADO NO MEIO', 'segundo parágrafo sendo lido agora'].join('\n\n')
    )

    const remapped = remapAnchor(before, after, anchor)
    expect(remapped).toEqual(anchor)
  })

  it('não move a âncora quando o texto acima é apagado', () => {
    const before = doc('primeiro parágrafo do roteiro', 'segundo parágrafo sendo lido agora')
    const anchor: Anchor = { blockId: before[1].id, wordOffset: 3 }

    const after = reconcileBlocks(before, 'segundo parágrafo sendo lido agora')

    expect(remapAnchor(before, after, anchor)).toEqual(anchor)
  })

  it('sobrevive à edição do próprio parágrafo ancorado', () => {
    const before = doc('primeiro parágrafo do roteiro', 'segundo parágrafo sendo lido agora')
    const anchor: Anchor = { blockId: before[1].id, wordOffset: 2 }

    const after = reconcileBlocks(
      before,
      ['primeiro parágrafo do roteiro', 'segundo parágrafo sendo lido agora mesmo, com mais texto no fim'].join('\n\n')
    )

    const remapped = remapAnchor(before, after, anchor)
    expect(remapped?.blockId).toBe(before[1].id)
    expect(remapped?.wordOffset).toBe(2)
  })

  it('cai no vizinho de cima quando o parágrafo ancorado é apagado', () => {
    const before = doc('primeiro parágrafo do roteiro', 'segundo parágrafo sendo lido agora', 'terceiro parágrafo')
    const anchor: Anchor = { blockId: before[1].id, wordOffset: 2 }

    const after = reconcileBlocks(before, ['primeiro parágrafo do roteiro', 'terceiro parágrafo'].join('\n\n'))

    const remapped = remapAnchor(before, after, anchor)
    expect(remapped?.blockId).toBe(before[0].id)
    expect(remapped?.wordOffset).toBe(4)
  })

  it('trava o pixel de leitura mesmo quando a fonte e a margem mudam junto com a edição', () => {
    const before = doc('parágrafo de cima que vai crescer bastante', 'trecho no ar sendo lido pelo apresentador agora')
    const anchor: Anchor = { blockId: before[1].id, wordOffset: 3 }

    const layoutBefore = withGeometry(composeLines(before, RULE), 48)
    const wordBefore = wordIndexFromAnchor(layoutBefore, anchor)

    // edita acima, muda a regra de palavras por linha e o corpo da fonte de uma vez
    const after = reconcileBlocks(
      before,
      [
        'parágrafo de cima que vai crescer bastante e agora ficou muito maior do que era antes',
        'trecho no ar sendo lido pelo apresentador agora'
      ].join('\n\n')
    )
    const remapped = remapAnchor(before, after, anchor) as Anchor
    const layoutAfter = withGeometry(composeLines(after, { minWords: 2, maxWords: 4 }), 96)

    // a palavra sob a marca de leitura é a mesma, ainda que o pixel e o índice global mudem
    expect(remapped.blockId).toBe(anchor.blockId)
    expect(remapped.wordOffset).toBe(anchor.wordOffset)
    expect(wordIndexFromAnchor(layoutAfter, remapped)).toBeGreaterThan(wordBefore)
    expect(pixelFromAnchor(layoutAfter, remapped)).not.toBeNull()
  })
})
