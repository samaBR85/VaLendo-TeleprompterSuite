import { describe, expect, it } from 'vitest'
import {
  ancoraEmPalavrasReais,
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
import { reconcileBlocks, words } from './text'
import type { Anchor, Block, PacingRule } from './types'

/** Velocidade constante é o padrão do app; o modo por palavras é a exceção. */
const RULE: PacingRule = { minWords: 3, maxWords: 6, uniformSpeed: true, deixas: [] }
const BY_WORDS: PacingRule = { ...RULE, uniformSpeed: false }

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
    const blocks = doc('## Abertura', 'duas palavras aqui agora', '[olhar câmera 2]')

    for (const rule of [RULE, BY_WORDS]) {
      const lines = composeLines(blocks, rule)
      expect(lines.find((l) => l.kind === 'chapter')?.wordCount).toBeGreaterThan(0)
      expect(lines.find((l) => l.kind === 'direction')?.wordCount).toBeGreaterThan(0)
    }
  })

  it('respeita a quebra de linha digitada pelo operador', () => {
    // duas frases curtas caberiam juntas numa linha de até 6 palavras, mas o
    // operador quebrou de propósito — a tela precisa mostrar como ele escreveu
    const blocks = doc('olha para a câmera\ne respira fundo')
    const lines = composeLines(blocks, RULE)

    expect(lines.map((l) => l.text)).toEqual(['olha para a câmera', 'e respira fundo'])
  })

  it('ainda divide a linha digitada que ficou comprida demais', () => {
    const blocks = doc('uma linha só que o operador escreveu bem comprida e não caberia nunca na tela inteira')
    const lines = composeLines(blocks, RULE)

    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(line.text.split(' ').length).toBeLessThanOrEqual(RULE.maxWords)
    }
  })

  it('a quebra digitada não vira palavra nem some do texto', () => {
    const blocks = doc('primeira parte aqui\nsegunda parte aqui')
    const lines = composeLines(blocks, RULE)

    expect(lines.map((l) => l.text).join(' ')).toBe('primeira parte aqui segunda parte aqui')
  })

  it('abre uma linha em branco entre parágrafos, como no editor', () => {
    // diagramação: o operador separou os blocos de propósito, e esse respiro
    // precisa existir na tela do apresentador
    const blocks = doc('primeiro parágrafo aqui', 'segundo parágrafo aqui')
    const lines = composeLines(blocks, RULE)

    expect(lines.map((l) => (l.spacer ? '(branco)' : l.text))).toEqual([
      'primeiro parágrafo aqui',
      '(branco)',
      'segundo parágrafo aqui'
    ])
  })

  it('não abre branco antes do primeiro nem depois do último parágrafo', () => {
    const lines = composeLines(doc('um só parágrafo aqui'), RULE)
    expect(lines.some((l) => l.spacer)).toBe(false)
  })

  it('a linha em branco pesa como as outras, senão a rolagem saltaria por cima', () => {
    const lines = composeLines(doc('primeiro parágrafo aqui', 'segundo parágrafo aqui'), RULE)
    const blank = lines.find((l) => l.spacer)

    expect(blank?.wordCount).toBeGreaterThan(0)
    for (const rule of [RULE, BY_WORDS]) {
      const spacer = composeLines(doc('um bloco', 'outro bloco'), rule).find((l) => l.spacer)
      expect(spacer?.wordCount, JSON.stringify(rule)).toBeGreaterThan(0)
    }
  })

  it('a linha em branco fica presa ao bloco de cima, para saltos caírem no texto', () => {
    const blocks = doc('primeiro parágrafo aqui', '## Bloco 2')
    const lines = composeLines(blocks, RULE)
    const blank = lines.find((l) => l.spacer)

    expect(blank?.blockId).toBe(blocks[0].id)

    // saltar para o capítulo cai na primeira linha dele, não no branco acima
    const layout = withGeometry(lines, 50)
    const y = pixelFromAnchor(layout, { blockId: blocks[1].id, wordOffset: 0 }) as number
    const chapterLine = layout.find((l) => l.blockId === blocks[1].id && !l.spacer)
    expect(y).toBe(chapterLine?.top)
  })

  it('atravessa direção e capítulo em pixel contínuo, sem salto', () => {
    const blocks = doc('fala antes da direção aqui', '[uma direção com bom tamanho de texto]', 'fala depois da direção aqui')
    const layout = withGeometry(composeLines(blocks, RULE), 50)

    let previousY = -1
    for (let w = 0; w <= totalWords(layout); w += 0.25) {
      const anchor = anchorFromWordIndex(layout, w) as Anchor
      const y = pixelFromAnchor(layout, anchor) as number
      // nenhum incremento pequeno de w pode corresponder a um salto grande de pixel
      expect(y - previousY).toBeLessThan(30)
      previousY = y
    }
  })
})

describe('velocidade constante com linhas que dobram', () => {
  // o caso medido no app: linha de 1 fileira a 14px por amostra, linha
  // dobrada de 2 fileiras a 28px — o dobro da velocidade
  const script = doc('primeira linha curta', 'uma linha que dobra na tela', 'terceira linha curta')

  /** Geometria em que a linha do meio ocupa duas fileiras. */
  function withRows(lines: LineSpec[], rows: number[], rowHeight: number): Layout {
    let top = 0
    return lines.map((line, i) => {
      const height = rows[i] * rowHeight
      const placed = { ...line, top, height }
      top += height
      return placed
    })
  }

  it('a linha que dobra pesa o dobro', () => {
    const plain = composeLines(script, RULE)
    const rows = plain.map((_, i) => (i === 2 ? 2 : 1))
    const weighted = composeLines(script, RULE, rows)

    expect(weighted[2].wordCount).toBeCloseTo(weighted[0].wordCount * 2, 5)
  })

  it('atravessa a linha dobrada na mesma velocidade das demais', () => {
    const plain = composeLines(script, RULE)
    const rows = plain.map((_, i) => (i === 2 ? 2 : 1))
    const layout = withRows(composeLines(script, RULE, rows), rows, 50)

    const step = 0.25
    const deltas: number[] = []
    for (let w = 0; w + step <= totalWords(layout); w += step) {
      const from = pixelFromAnchor(layout, anchorFromWordIndex(layout, w) as Anchor) as number
      const to = pixelFromAnchor(layout, anchorFromWordIndex(layout, w + step) as Anchor) as number
      deltas.push(to - from)
    }

    expect(Math.max(...deltas) - Math.min(...deltas)).toBeLessThan(0.01)
  })

  it('sem medida, cai numa fileira por linha em vez de errar o peso', () => {
    const plain = composeLines(script, RULE)
    const stale = composeLines(script, RULE, [1, 2])

    // medida de tamanho errado é medida de outro texto: ignorar é mais seguro
    expect(stale.map((l) => l.wordCount)).toEqual(plain.map((l) => l.wordCount))
  })
})

describe('velocidade constante', () => {
  const script = doc(
    '## Abertura',
    'uma frase com bastante texto para render mais de uma linha composta aqui',
    '[pausa]',
    'outra frase, dessa vez curta',
    'e um fecho um pouco mais comprido para variar o tamanho das linhas'
  )

  it('dá o mesmo peso a toda linha, seja fala, direção ou capítulo', () => {
    const weights = composeLines(script, RULE).map((l) => l.wordCount)
    expect(new Set(weights).size).toBe(1)
  })

  it('anda sempre o mesmo tanto de pixel por unidade de tempo', () => {
    // é isto que o operador sente: o texto não acelera nem freia sozinho
    const layout = withGeometry(composeLines(script, RULE), 50)
    const step = 0.5

    const deltas: number[] = []
    for (let w = 0; w + step <= totalWords(layout); w += step) {
      const from = pixelFromAnchor(layout, anchorFromWordIndex(layout, w) as Anchor) as number
      const to = pixelFromAnchor(layout, anchorFromWordIndex(layout, w + step) as Anchor) as number
      deltas.push(to - from)
    }

    const min = Math.min(...deltas)
    const max = Math.max(...deltas)
    expect(max - min).toBeLessThan(0.01)
  })

  it('desligada, a velocidade oscila conforme as palavras da linha', () => {
    const layout = withGeometry(composeLines(script, BY_WORDS), 50)
    const step = 0.5

    const deltas: number[] = []
    for (let w = 0; w + step <= totalWords(layout); w += step) {
      const from = pixelFromAnchor(layout, anchorFromWordIndex(layout, w) as Anchor) as number
      const to = pixelFromAnchor(layout, anchorFromWordIndex(layout, w + step) as Anchor) as number
      deltas.push(to - from)
    }

    expect(Math.max(...deltas) - Math.min(...deltas)).toBeGreaterThan(1)
  })

  it('preserva a duração estimada: o peso total acompanha as palavras faladas', () => {
    const spoken = composeLines(script, BY_WORDS)
      .filter((l) => l.kind === 'speech')
      .reduce((total, l) => total + l.wordCount, 0)
    const uniform = totalWords(composeLines(script, RULE))

    // a régua constante inclui direção e capítulo, que ocupam tela mas não
    // são ditos — por isso é um pouco maior, nunca menor
    expect(uniform).toBeGreaterThanOrEqual(spoken)
    expect(uniform).toBeLessThan(spoken * 1.5)
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
    const layoutAfter = withGeometry(composeLines(after, { ...RULE, minWords: 2, maxWords: 4 }), 96)

    // a palavra sob a marca de leitura é a mesma, ainda que o pixel e o índice global mudem
    expect(remapped.blockId).toBe(anchor.blockId)
    expect(remapped.wordOffset).toBe(anchor.wordOffset)
    expect(wordIndexFromAnchor(layoutAfter, remapped)).toBeGreaterThan(wordBefore)
    expect(pixelFromAnchor(layoutAfter, remapped)).not.toBeNull()
  })
})

describe('ancoraEmPalavrasReais — a régua traduzida para o texto', () => {
  /*
   * O defeito que este teste tranca: com velocidade constante (o padrão), a
   * âncora vem em unidades da RÉGUA — todas as linhas pesam igual, mesmo tendo
   * seis palavras ou duas. Quem apontou a palavra no editor contando palavras
   * de verdade estourava o parágrafo, e a marca caía sempre na última linha.
   *
   * O parágrafo abaixo compõe quatro linhas de tamanhos diferentes (6, 6, 5 e
   * 2 palavras), que é o que faz as duas unidades divergirem de verdade.
   */
  const bloco = doc(
    'Boa noite. Hoje a gente vai falar sobre uma mudanca que ja esta acontecendo nos estudios do pais inteiro.'
  )
  const real = (lines: LineSpec[], wordOffset: number): number =>
    ancoraEmPalavrasReais(lines, { blockId: bloco[0].id, wordOffset }).wordOffset

  it('o começo de cada linha vira a palavra em que ela começa', () => {
    const lines = composeLines(bloco, RULE)
    const porLinha = lines.map((l) => words(l.text).length)
    expect(porLinha).toEqual([6, 6, 5, 2])

    // as unidades DIVERGEM: a régua reparte o bloco em pesos iguais
    expect(lines.map((l) => l.blockWordStart)).not.toEqual([0, 6, 12, 17])

    let acumulado = 0
    lines.forEach((line, i) => {
      expect(real(lines, line.blockWordStart), `linha ${i}`).toBe(acumulado)
      acumulado += porLinha[i]
    })
  })

  it('sem velocidade constante a conta é 1:1 — o número não muda', () => {
    const lines = composeLines(bloco, BY_WORDS)
    for (const offset of [0, 3, 7, 15]) expect(real(lines, offset)).toBe(offset)
  })

  it('nunca passa do total de palavras do bloco', () => {
    const lines = composeLines(bloco, RULE)
    expect(real(lines, 999)).toBe(words(bloco[0].text).length)
  })

  it('bloco desconhecido volta como veio, sem inventar posição', () => {
    const lines = composeLines(bloco, RULE)
    expect(ancoraEmPalavrasReais(lines, { blockId: 'sumiu', wordOffset: 4 })).toEqual({
      blockId: 'sumiu',
      wordOffset: 4
    })
  })
})

describe('esconder o nome de quem fala tira a linha da régua', () => {
  /*
   * A parte perigosa da ferramenta. Esconder não pode ser "não desenhar": uma
   * linha invisível continuaria pesando na régua (a medição faz
   * `Math.max(1, …)`) e a leitura ficaria parada o tempo de uma linha em cada
   * troca de apresentador. Ela sai da COMPOSIÇÃO — e é isso que se cobra aqui.
   */
  const roteiro = doc('HARI\nboa noite a todos', 'ROBSON\nboa noite também')
  const comNome: PacingRule = { ...RULE, deixas: [] }
  const semNome: PacingRule = { ...RULE, deixas: [{ nome: 'HARI', oculto: true }, { nome: 'ROBSON', oculto: true }] }

  it('a linha do nome some da composição, e só ela', () => {
    const antes = composeLines(roteiro, comNome).filter((l) => !l.spacer)
    const depois = composeLines(roteiro, semNome).filter((l) => !l.spacer)

    expect(antes.map((l) => l.text)).toContain('HARI')
    expect(depois.map((l) => l.text)).not.toContain('HARI')
    expect(depois.map((l) => l.text)).not.toContain('ROBSON')
    // a fala continua inteira
    expect(depois.map((l) => l.text).join(' ')).toContain('boa noite a todos')
    expect(depois.length).toBe(antes.length - 2)
  })

  it('sem caixa: o nome registrado em minúscula esconde o escrito em maiúscula', () => {
    const linhas = composeLines(roteiro, { ...RULE, deixas: [{ nome: 'hari', oculto: true }] })
    expect(linhas.map((l) => l.text)).not.toContain('HARI')
    expect(linhas.map((l) => l.text)).toContain('ROBSON')
  })

  it('o texto do bloco NÃO muda — desligar traz o nome de volta', () => {
    composeLines(roteiro, semNome)
    expect(roteiro[0].text).toBe('HARI\nboa noite a todos')
    expect(composeLines(roteiro, comNome).map((l) => l.text)).toContain('HARI')
  })

  it('um parágrafo que só tem o nome NÃO fica sem linha nenhuma', () => {
    /*
     * Sem esta guarda o bloco não produziria linha alguma, e a âncora que
     * aponta para ele ficaria sem destino — a leitura pararia num bloco que
     * não existe mais na tela. Melhor um nome visível do que uma âncora órfã.
     */
    const soNome = doc('HARI', 'a fala vem no parágrafo seguinte')
    const linhas = composeLines(soNome, { ...RULE, deixas: [{ nome: 'HARI', oculto: true }] })
    expect(linhas.some((l) => l.blockId === soNome[0].id && !l.spacer)).toBe(true)
  })

  it('a régua encolhe, e a velocidade constante continua constante', () => {
    // menos linhas para atravessar, mesmo peso por linha: o texto sobe no
    // mesmo ritmo, o programa é que fica mais curto — e é a verdade, porque
    // ninguém lê o nome em voz alta
    const antes = composeLines(roteiro, comNome)
    const depois = composeLines(roteiro, semNome)
    expect(totalWords(depois)).toBeLessThan(totalWords(antes))

    const pesos = depois.filter((l) => l.kind === 'speech' && !l.spacer).map((l) => l.wordCount)
    expect(new Set(pesos).size).toBe(1)
  })
})
