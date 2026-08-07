import { describe, expect, it } from 'vitest'
import { PLACEHOLDERS, capitularLinhasIguais, contarLinhasIguais, insertBlock, limparBlocosNoTrecho, tirarBloco, tirarCapitulo, tirarDirecao } from './insertBlock'
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

describe('capitular TODAS as linhas iguais à seleção', () => {
  /**
   * A prova é sempre a mesma: classificar o resultado em blocos e conferir
   * quais viraram `chapter`. Contar `##` no texto não valeria — dois `##` no
   * meio de um parágrafo não são dois capítulos, são fala com sujeira.
   */
  const capitulos = (texto: string): string[] =>
    blocksFromText(texto)
      .filter((b) => b.kind === 'chapter')
      .map((b) => b.text)

  it('pega as três ocorrências, e só as que estão sozinhas na linha', () => {
    const texto = [
      'BLOCO 1',
      '',
      'A fala fala de BLOCO 1 sem ser um título.',
      '',
      'BLOCO 1',
      '',
      'Outra fala.',
      '',
      'BLOCO 1'
    ].join('\n')
    expect(capitulos(capitularLinhasIguais(texto, 'BLOCO 1'))).toEqual([
      '## BLOCO 1',
      '## BLOCO 1',
      '## BLOCO 1'
    ])
    // a linha do meio segue sendo fala, com a palavra dentro
    expect(capitularLinhasIguais(texto, 'BLOCO 1')).toContain('A fala fala de BLOCO 1 sem ser um título.')
  })

  it('abre parágrafo quando a linha estava colada na de baixo', () => {
    /*
     * O caso que faria a marcação vazar para a tela do apresentador: sem a
     * linha em branco, `## HARI` continua dentro do mesmo parágrafo da fala e
     * o classificador o lê como fala.
     */
    const texto = 'HARI\nE agora vai começar.\n\nHARI\nSegunda fala.'
    const fora = capitularLinhasIguais(texto, 'HARI')
    expect(capitulos(fora)).toEqual(['## HARI', '## HARI'])
    expect(fora).toBe('## HARI\n\nE agora vai começar.\n\n## HARI\n\nSegunda fala.')
  })

  it('não duplica linha em branco onde ela já existe', () => {
    const texto = 'ABERTURA\n\nFala.'
    expect(capitularLinhasIguais(texto, 'ABERTURA')).toBe('## ABERTURA\n\nFala.')
  })

  it('rodar duas vezes dá o mesmo resultado', () => {
    // a linha já capitulada tem texto "## X", que não é igual a "X" — ela nem
    // volta a ser candidata
    const texto = 'BLOCO 1\n\nFala.\n\nBLOCO 1'
    const uma = capitularLinhasIguais(texto, 'BLOCO 1')
    expect(capitularLinhasIguais(uma, 'BLOCO 1')).toBe(uma)
  })

  it('seleção de mais de uma linha não faz nada', () => {
    // arrastar demais é comum; inventar marcação em cima disso, não
    const texto = 'BLOCO 1\n\nFala.'
    expect(capitularLinhasIguais(texto, 'BLOCO 1\n\nFala.')).toBe(texto)
  })

  it('seleção vazia ou só de espaços não faz nada', () => {
    const texto = 'BLOCO 1\n\nFala.'
    expect(capitularLinhasIguais(texto, '   ')).toBe(texto)
    expect(capitularLinhasIguais(texto, '')).toBe(texto)
  })

  it('a contagem bate com o que vai ser marcado', () => {
    // é o número que o menu mostra ANTES de agir — se ele mentir, o operador
    // aprova uma coisa e acontece outra
    const texto = 'X\n\nfala com X dentro\n\nX\n\nX'
    expect(contarLinhasIguais(texto, 'X')).toBe(3)
    expect(capitulos(capitularLinhasIguais(texto, 'X'))).toHaveLength(3)
  })

  it('espaços em volta da seleção não atrapalham', () => {
    const texto = 'BLOCO 1\n\nFala.'
    expect(capitularLinhasIguais(texto, '  BLOCO 1  ')).toBe('## BLOCO 1\n\nFala.')
  })
})

/**
 * O botão de capítulo sobre um capítulo TIRA o capítulo.
 *
 * O operador relatou o sintoma: apertar de novo escrevia `## ## (BEAT)`, e o
 * título saía com um `##` visível na tela do apresentador.
 */
describe('desfazer o capítulo', () => {
  it('tira a marca da linha em que o cursor está, sem seleção nenhuma', () => {
    const texto = '## (BEAT)'
    const r = tirarCapitulo(texto, 4, 4)
    expect(r?.text).toBe('(BEAT)')
  })

  it('tira também quando a seleção pegou a linha inteira, com o ## junto', () => {
    // é o que o operador faz: o `##` está na tela, e ele seleciona o que vê
    const texto = '## (BEAT)'
    const r = tirarCapitulo(texto, 0, texto.length)
    expect(r?.text).toBe('(BEAT)')
  })

  it('o que sobrou fica selecionado, e apertar de novo devolve o capítulo', () => {
    const texto = '## (BEAT)'
    const tirado = tirarCapitulo(texto, 0, texto.length)!
    expect(tirado.text.slice(tirado.selectionStart, tirado.selectionEnd)).toBe('(BEAT)')
    const posto = insertBlock(tirado.text, tirado.selectionStart, tirado.selectionEnd, 'chapter')
    expect(posto.text).toBe('## (BEAT)')
  })

  it('não mexe no texto em volta', () => {
    const texto = 'HARI\n\n## (BEAT)\n\nE agora.'
    const r = tirarCapitulo(texto, 8, 8)
    expect(r?.text).toBe('HARI\n\n(BEAT)\n\nE agora.')
  })

  it('vale para qualquer marca que a LEITURA aceita, não só o ## que o botão escreve', () => {
    expect(tirarCapitulo('# ABERTURA', 3, 3)?.text).toBe('ABERTURA')
    expect(tirarCapitulo('#### BLOCO 2', 6, 6)?.text).toBe('BLOCO 2')
  })

  it('sobre linha comum devolve null — quem chama cai no inserir de sempre', () => {
    expect(tirarCapitulo('E agora The Bear', 2, 7)).toBeNull()
  })

  it('sobre linha vazia devolve null, senão o botão viraria um clique morto', () => {
    expect(tirarCapitulo('', 0, 0)).toBeNull()
    expect(tirarCapitulo('\n\n', 1, 1)).toBeNull()
  })

  it('seleção de várias linhas: tira quando TODAS são capítulo', () => {
    const texto = '## UM\n## DOIS'
    expect(tirarCapitulo(texto, 0, texto.length)?.text).toBe('UM\nDOIS')
  })

  it('seleção que mistura título e fala não é desfazer — pegou demais', () => {
    // ali o certo é o comportamento de sempre, e não decidir por quem selecionou
    expect(tirarCapitulo('## UM\nE agora', 0, 12)).toBeNull()
  })

  it('as linhas em branco entre os títulos ficam onde estavam', () => {
    const texto = '## UM\n\n## DOIS'
    expect(tirarCapitulo(texto, 0, texto.length)?.text).toBe('UM\n\nDOIS')
  })
})

/**
 * O mesmo no vizinho: o botão de direção sobre uma direção tira os colchetes.
 *
 * Só que a unidade aqui é o PARÁGRAFO e não a linha — o classificador entende
 * `[...]` olhando o parágrafo inteiro, então uma direção de três linhas tem o
 * colchete só na primeira e na última.
 */
describe('desfazer a direção', () => {
  it('tira os colchetes da direção em que o cursor está', () => {
    expect(tirarDirecao('[entra o VT]', 5, 5)?.text).toBe('entra o VT')
  })

  it('tira quando a seleção pegou os colchetes junto, que é o que se vê na tela', () => {
    const texto = '[entra o VT]'
    expect(tirarDirecao(texto, 0, texto.length)?.text).toBe('entra o VT')
  })

  it('ida e volta pelo mesmo botão', () => {
    const tirado = tirarDirecao('[entra o VT]', 0, 12)!
    expect(tirado.text.slice(tirado.selectionStart, tirado.selectionEnd)).toBe('entra o VT')
    const posto = insertBlock(tirado.text, tirado.selectionStart, tirado.selectionEnd, 'direction')
    expect(posto.text).toBe('[entra o VT]')
  })

  it('direção de várias linhas sai inteira — é por parágrafo, não por linha', () => {
    const texto = 'HARI\n\n[entra o VT\ne sobe o som]\n\nE agora.'
    // cursor na segunda linha da direção: mesmo assim os dois colchetes saem
    expect(tirarDirecao(texto, 20, 20)?.text).toBe('HARI\n\nentra o VT\ne sobe o som\n\nE agora.')
  })

  it('sobre fala devolve null — quem chama cai no inserir de sempre', () => {
    expect(tirarDirecao('E agora The Bear', 2, 7)).toBeNull()
  })

  it('colchete só de um lado não é direção, e o classificador concorda', () => {
    expect(tirarDirecao('[entra o VT', 3, 3)).toBeNull()
    expect(kindsOf('[entra o VT')).toEqual(['speech'])
  })

  it('colchete vazio não vira clique morto: devolve null em vez de apagar tudo', () => {
    expect(tirarDirecao('[]', 1, 1)).toBeNull()
  })

  it('o `tirarBloco` manda cada tipo para a sua régua', () => {
    expect(tirarBloco('## (BEAT)', 4, 4, 'chapter')?.text).toBe('(BEAT)')
    expect(tirarBloco('[entra o VT]', 4, 4, 'direction')?.text).toBe('entra o VT')
    // e não confunde um com o outro
    expect(tirarBloco('## (BEAT)', 4, 4, 'direction')).toBeNull()
    expect(tirarBloco('[entra o VT]', 4, 4, 'chapter')).toBeNull()
  })
})

/**
 * O "remover formatação" com trecho escolhido.
 *
 * O de sempre varre o roteiro inteiro num clique. Este limpa só o que a
 * seleção encosta — e, ao contrário do desfazer de um botão só, aceita uma
 * seleção que mistura título, direção e fala.
 */
describe('limpar os blocos do trecho', () => {
  it('tira o capítulo', () => {
    expect(limparBlocosNoTrecho('## (BEAT)', 0, 9)?.text).toBe('(BEAT)')
  })

  it('tira a direção', () => {
    expect(limparBlocosNoTrecho('[entra o VT]', 0, 12)?.text).toBe('entra o VT')
  })

  it('numa seleção misturada, limpa cada parágrafo pelo que ele é', () => {
    const texto = '## BLOCO 1\n\n[entra o VT]\n\nE agora The Bear.'
    expect(limparBlocosNoTrecho(texto, 0, texto.length)?.text).toBe(
      'BLOCO 1\n\nentra o VT\n\nE agora The Bear.'
    )
  })

  it('não encosta em quem está fora da seleção', () => {
    const texto = '## UM\n\n## DOIS\n\n## TRES'
    // seleção só no do meio
    expect(limparBlocosNoTrecho(texto, 8, 12)?.text).toBe('## UM\n\nDOIS\n\n## TRES')
  })

  it('as linhas em branco passam intactas, uma a uma', () => {
    // desde a 1.5.0 elas pesam na régua: colapsá-las mudaria a duração estimada
    const texto = '## UM\n\n\n\n[dois]'
    expect(limparBlocosNoTrecho(texto, 0, texto.length)?.text).toBe('UM\n\n\n\ndois')
  })

  it('sobre fala pura devolve null — não gasta um passo de desfazer à toa', () => {
    expect(limparBlocosNoTrecho('E agora The Bear.', 0, 10)).toBeNull()
  })

  it('a direção de várias linhas sai inteira', () => {
    const texto = '[entra o VT\ne sobe o som]'
    expect(limparBlocosNoTrecho(texto, 2, 2)?.text).toBe('entra o VT\ne sobe o som')
  })
})
