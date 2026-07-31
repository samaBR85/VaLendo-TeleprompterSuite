import { describe, expect, it } from 'vitest'
import { composeLines, totalWords } from './anchor'
import { buildRundown, segmentIndexAt } from './rundown'
import { reconcileBlocks, totalWordCount } from './text'
import type { Marker, PacingRule } from './types'

const RULE: PacingRule = { minWords: 3, maxWords: 6, uniformSpeed: true }

function doc(...texts: string[]) {
  return reconcileBlocks([], texts.join('\n\n'))
}

describe('buildRundown', () => {
  it('roteiro vazio não tem trecho nenhum', () => {
    expect(buildRundown([], [], [])).toEqual([])
  })

  it('sem nenhum capítulo, o roteiro inteiro é um trecho só, sem título', () => {
    const blocks = doc('primeira fala do roteiro', 'segunda fala do roteiro')
    const lines = composeLines(blocks, RULE)

    const segments = buildRundown(blocks, lines, [])

    expect(segments).toHaveLength(1)
    expect(segments[0].title).toBe('')
    expect(segments[0].blockId).toBe(blocks[0].id)
    expect(segments[0].rulerSpan).toBe(totalWords(lines))
    expect(segments[0].spokenWords).toBe(totalWordCount(blocks))
  })

  it('cada § vira um trecho, com o título sem o símbolo', () => {
    const blocks = doc('§ Abertura', 'boa noite a todos', '§ Bloco 2', 'e seguimos em frente')
    const lines = composeLines(blocks, RULE)

    const segments = buildRundown(blocks, lines, [])

    expect(segments.map((s) => s.title)).toEqual(['Abertura', 'Bloco 2'])
    expect(segments.map((s) => s.blockId)).toEqual([blocks[0].id, blocks[2].id])
  })

  it('fala antes do primeiro capítulo vira um trecho líder sem título', () => {
    const blocks = doc('isso aqui não tem capítulo em cima', '§ Abertura', 'agora sim tem')
    const lines = composeLines(blocks, RULE)

    const segments = buildRundown(blocks, lines, [])

    expect(segments).toHaveLength(2)
    expect(segments[0].title).toBe('')
    expect(segments[0].blockId).toBe(blocks[0].id)
    expect(segments[1].title).toBe('Abertura')
  })

  it('a régua dos trechos soma exatamente a régua do documento inteiro', () => {
    const blocks = doc(
      '§ Abertura',
      'boa noite. hoje a gente vai falar sobre uma mudança grande.',
      '[olhar câmera 2]',
      '§ Bloco 2',
      'e seguimos com a segunda parte da matéria de hoje.',
      '§ Encerramento',
      'é isso por hoje. até a próxima.'
    )
    const lines = composeLines(blocks, RULE)

    const segments = buildRundown(blocks, lines, [])
    const soma = segments.reduce((n, s) => n + s.rulerSpan, 0)

    // arredondamento de ponto flutuante entre trechos: soma bate por perto,
    // não bit a bit
    expect(soma).toBeCloseTo(totalWords(lines), 6)
  })

  it('as palavras faladas dos trechos somam exatamente o total do documento', () => {
    const blocks = doc('§ Abertura', 'primeira fala aqui', '§ Bloco 2', 'segunda fala aqui também')
    const lines = composeLines(blocks, RULE)

    const segments = buildRundown(blocks, lines, [])
    const soma = segments.reduce((n, s) => n + s.spokenWords, 0)

    expect(soma).toBe(totalWordCount(blocks))
  })

  it('dois capítulos vizinhos, sem fala entre eles, ainda pesam alguma coisa na régua', () => {
    // regressão do mesmo tipo que anchor.ts já cobre para composeLines: peso
    // zero faria a rolagem atravessar o trecho num instante
    const blocks = doc('§ Abertura', '§ Bloco 2', 'só aqui tem fala de verdade')
    const lines = composeLines(blocks, RULE)

    const segments = buildRundown(blocks, lines, [])

    expect(segments[0].spokenWords).toBe(0)
    expect(segments[0].rulerSpan).toBeGreaterThan(0)
  })

  it('um marcador cai no trecho do bloco em que ele está, não em outro', () => {
    const blocks = doc('§ Abertura', 'fala do primeiro trecho', '§ Bloco 2', 'fala do segundo trecho')
    const lines = composeLines(blocks, RULE)
    const alvo = blocks[3] // "fala do segundo trecho"
    const marker: Marker = { id: 'm1', blockId: alvo.id, label: 'entra convidado' }

    const segments = buildRundown(blocks, lines, [marker])

    expect(segments[0].markers).toHaveLength(0)
    expect(segments[1].markers).toHaveLength(1)
    expect(segments[1].markers[0].marker).toBe(marker)
  })

  it('a posição do marcador na régua é o início do bloco dele — o mesmo que "ir para o marcador" já usa', () => {
    const blocks = doc('§ Abertura', 'primeira fala aqui', 'segunda fala aqui')
    const lines = composeLines(blocks, RULE)
    const segundoBloco = blocks[2]
    const marker: Marker = { id: 'm1', blockId: segundoBloco.id, label: 'x' }

    const segments = buildRundown(blocks, lines, [marker])
    const inicioDoBloco = lines.find((l) => l.blockId === segundoBloco.id && !l.spacer)?.wordStart

    expect(segments[0].markers[0].rulerStart).toBe(inicioDoBloco)
  })

  it('marcador em bloco que não existe mais não aparece em trecho nenhum', () => {
    const blocks = doc('§ Abertura', 'fala qualquer')
    const lines = composeLines(blocks, RULE)
    const marker: Marker = { id: 'm1', blockId: 'bloco-que-sumiu', label: 'x' }

    const segments = buildRundown(blocks, lines, [marker])

    expect(segments.flatMap((s) => s.markers)).toHaveLength(0)
  })
})

describe('segmentIndexAt', () => {
  const blocks = doc('§ Abertura', 'fala um', '§ Bloco 2', 'fala dois', '§ Encerramento', 'fala três')
  const lines = composeLines(blocks, RULE)
  const segments = buildRundown(blocks, lines, [])

  it('antes do início, cai no primeiro trecho', () => {
    expect(segmentIndexAt(segments, -5)).toBe(0)
  })

  it('exatamente no início de um trecho, cai nele', () => {
    expect(segmentIndexAt(segments, segments[1].rulerStart)).toBe(1)
  })

  it('no meio de um trecho, continua nele', () => {
    expect(segmentIndexAt(segments, segments[1].rulerStart + 0.1)).toBe(1)
  })

  it('depois do fim, cai no último trecho', () => {
    expect(segmentIndexAt(segments, totalWords(lines) + 999)).toBe(segments.length - 1)
  })
})
