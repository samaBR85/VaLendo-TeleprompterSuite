import { describe, expect, it } from 'vitest'
import { PLACEHOLDERS, insertBlock } from './insertBlock'
import { blocksFromText } from './text'

/** O que importa de verdade: o bloco inserido é reconhecido como tal. */
function kindsOf(text: string): string[] {
  return blocksFromText(text).map((b) => b.kind)
}

describe('insertBlock — fronteiras de parágrafo', () => {
  it('cria capítulo de verdade ao inserir no meio de um parágrafo', () => {
    const value = 'primeira frase do roteiro aqui'
    const cursor = 'primeira frase'.length
    const { text } = insertBlock(value, cursor, cursor, 'chapter')

    expect(kindsOf(text)).toEqual(['speech', 'chapter', 'speech'])
  })

  it('cria direção de verdade ao inserir no meio de um parágrafo', () => {
    const value = 'primeira frase do roteiro aqui'
    const cursor = 'primeira frase'.length
    const { text } = insertBlock(value, cursor, cursor, 'direction')

    expect(kindsOf(text)).toEqual(['speech', 'direction', 'speech'])
  })

  it('não acumula linhas em branco quando já está numa', () => {
    const value = 'parágrafo um\n\nparágrafo dois'
    const cursor = 'parágrafo um\n\n'.length
    const { text } = insertBlock(value, cursor, cursor, 'chapter')

    expect(text).toBe('parágrafo um\n\n## Título do capítulo\n\nparágrafo dois')
    expect(kindsOf(text)).toEqual(['speech', 'chapter', 'speech'])
  })

  it('não abre linha em branco no começo do documento', () => {
    const { text } = insertBlock('', 0, 0, 'chapter')
    expect(text).toBe('## Título do capítulo')
    expect(kindsOf(text)).toEqual(['chapter'])
  })

  it('completa a linha em branco que falta quando há só uma quebra', () => {
    const value = 'parágrafo um\n'
    const { text } = insertBlock(value, value.length, value.length, 'direction')
    expect(text).toBe('parágrafo um\n\n[direção de cena]')
    expect(kindsOf(text)).toEqual(['speech', 'direction'])
  })
})

describe('insertBlock — conteúdo e seleção', () => {
  it('usa o texto selecionado como conteúdo do bloco', () => {
    const value = 'Abertura do programa'
    const { text } = insertBlock(value, 0, 'Abertura'.length, 'chapter')

    expect(text.startsWith('## Abertura')).toBe(true)
    expect(text).not.toContain('## Título do capítulo')
  })

  it('deixa o miolo selecionado, sem pegar a marcação junto', () => {
    const result = insertBlock('', 0, 0, 'chapter')
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe(PLACEHOLDERS.chapter)

    const direction = insertBlock('', 0, 0, 'direction')
    expect(direction.text.slice(direction.selectionStart, direction.selectionEnd)).toBe(
      PLACEHOLDERS.direction
    )
  })

  it('seleciona o texto que veio da seleção original', () => {
    const value = 'Abertura do programa'
    const result = insertBlock(value, 0, 'Abertura'.length, 'chapter')
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('Abertura')
  })

  it('ignora espaço em volta da seleção', () => {
    const value = '  Abertura  resto'
    const result = insertBlock(value, 0, '  Abertura  '.length, 'chapter')
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('Abertura')
  })

  it('aguenta posições de cursor fora dos limites', () => {
    expect(() => insertBlock('abc', -5, 999, 'chapter')).not.toThrow()
    const result = insertBlock('abc', 999, 999, 'direction')
    expect(result.text).toContain('[direção de cena]')
  })
})
