import { describe, expect, it } from 'vitest'
import {
  cleanupPages,
  cleanupPlainText,
  dehyphenate,
  isPageNumber,
  joinWrappedLines,
  normalizeTypography,
  stripPageFurniture,
  stripPaginationArtifacts
} from './cleanup'

describe('normalizeTypography', () => {
  it('troca espaço inquebrável por espaço comum', () => {
    expect(normalizeTypography('boa noite')).toBe('boa noite')
  })

  it('remove caracteres de largura zero e BOM no meio do texto', () => {
    expect(normalizeTypography('bo​a‍noi﻿te')).toBe('boanoite')
  })

  it('endireita aspas curvas', () => {
    expect(normalizeTypography('“boa” noite’s')).toBe('"boa" noite\'s')
  })

  it('desmonta reticências tipográficas', () => {
    expect(normalizeTypography('pausa… agora')).toBe('pausa... agora')
  })

  it('colapsa espaços repetidos e linhas em branco demais', () => {
    expect(normalizeTypography('um    dois\n\n\n\ntrês')).toBe('um dois\n\ntrês')
  })
})

describe('dehyphenate', () => {
  it('remonta a palavra quebrada no fim da linha', () => {
    expect(dehyphenate(['conti-', 'nuação da frase'])).toEqual(['continuação da frase'])
  })

  it('preserva hífen legítimo quando a próxima linha começa maiúscula', () => {
    expect(dehyphenate(['Fala com o Silva-', 'Souza agora'])).toEqual(['Fala com o Silva-', 'Souza agora'])
  })
})

describe('isPageNumber', () => {
  it('reconhece as formas usuais', () => {
    for (const line of ['12', '  7  ', 'Página 3', 'pag. 4', '2 de 10', '5 / 20']) {
      expect(isPageNumber(line), line).toBe(true)
    }
  })

  it('não confunde com texto que começa por número', () => {
    expect(isPageNumber('3 pessoas chegaram')).toBe(false)
  })
})

describe('joinWrappedLines', () => {
  it('junta linhas que continuam a mesma frase', () => {
    const lines = [
      'Boa noite. Hoje a gente vai falar sobre uma mudança',
      'que já está acontecendo nos estúdios do país inteiro.'
    ]
    expect(joinWrappedLines(lines)).toEqual([
      'Boa noite. Hoje a gente vai falar sobre uma mudança que já está acontecendo nos estúdios do país inteiro.'
    ])
  })

  it('separa parágrafos na linha em branco', () => {
    expect(joinWrappedLines(['primeiro parágrafo aqui', '', 'segundo parágrafo aqui'])).toHaveLength(2)
  })

  it('trata linha curta sem pontuação como fim de parágrafo', () => {
    const lines = [
      'Título curto',
      'Um parágrafo bem mais longo do que a linha anterior para firmar a mediana',
      'e a continuação natural dele que segue por aqui também com bom tamanho.'
    ]
    const paragraphs = joinWrappedLines(lines)
    expect(paragraphs[0]).toBe('Título curto')
    expect(paragraphs).toHaveLength(2)
  })

  it('devolve vazio para entrada vazia', () => {
    expect(joinWrappedLines(['', '   '])).toEqual([])
  })
})

describe('stripPageFurniture', () => {
  it('remove cabeçalho repetido na maioria das páginas', () => {
    const pages = [
      ['JORNAL DA NOITE', 'conteúdo da primeira'],
      ['JORNAL DA NOITE', 'conteúdo da segunda'],
      ['JORNAL DA NOITE', 'conteúdo da terceira'],
      ['JORNAL DA NOITE', 'conteúdo da quarta']
    ]
    expect(stripPageFurniture(pages)).toEqual([
      ['conteúdo da primeira'],
      ['conteúdo da segunda'],
      ['conteúdo da terceira'],
      ['conteúdo da quarta']
    ])
  })

  it('remove números de página soltos', () => {
    expect(stripPageFurniture([['texto', '1'], ['texto', '2']])).toEqual([['texto'], ['texto']])
  })

  it('não remove uma linha que só aparece em uma página', () => {
    const pages = [['único', 'a'], ['comum', 'b'], ['comum', 'c'], ['comum', 'd']]
    expect(stripPageFurniture(pages)[0]).toEqual(['único', 'a'])
  })

  it('não confunde a linha do meio de uma página curta com cabeçalho', () => {
    // regressão: numa página de 3 linhas, "segunda" e "penúltima" são a mesma
    // linha, e contá-la duas vezes fazia texto de roteiro sumir
    const pages = [
      ['CABEÇALHO', 'primeira página tem bastante conteúdo', 'e mais uma linha aqui'],
      ['CABEÇALHO', 'linha do meio que não pode sumir', 'fecho da segunda página'],
      ['CABEÇALHO', 'terceira página com conteúdo', 'e o fecho dela']
    ]
    const result = stripPageFurniture(pages)

    expect(result.flat()).toContain('linha do meio que não pode sumir')
    expect(result.flat()).not.toContain('CABEÇALHO')
  })
})

describe('stripPaginationArtifacts', () => {
  it('tira "Página N" e "N de M" sempre', () => {
    expect(stripPaginationArtifacts(['fala', 'Página 3', 'mais fala', '2 de 10'])).toEqual([
      'fala',
      'mais fala'
    ])
  })

  it('tira números soltos quando formam uma sequência crescente', () => {
    expect(stripPaginationArtifacts(['fala', '1', 'mais fala', '2'])).toEqual(['fala', 'mais fala'])
  })

  it('preserva a contagem regressiva de abertura', () => {
    expect(stripPaginationArtifacts(['3', '2', '1', 'no ar'])).toEqual(['3', '2', '1', 'no ar'])
  })

  it('preserva um número solto isolado, que pode ser fala', () => {
    expect(stripPaginationArtifacts(['o resultado foi', '42'])).toEqual(['o resultado foi', '42'])
  })
})

describe('cleanupPlainText', () => {
  it('entrega parágrafos separados por linha em branco', () => {
    const raw = 'Boa noite. Hoje a gente\nvai falar sobre uma mudan-\nça importante.\n\nSegundo bloco do roteiro.'
    expect(cleanupPlainText(raw)).toBe(
      'Boa noite. Hoje a gente vai falar sobre uma mudança importante.\n\nSegundo bloco do roteiro.'
    )
  })
})

describe('cleanupPages', () => {
  it('costura a frase que atravessa a virada de página', () => {
    const pages = [
      ['O apresentador precisa continuar a leitura sem tropeçar na quebra de'],
      ['página que o documento original trouxe de brinde para atrapalhar.']
    ]
    expect(cleanupPages(pages)).toBe(
      'O apresentador precisa continuar a leitura sem tropeçar na quebra de página que o documento original trouxe de brinde para atrapalhar.'
    )
  })

  it('não cola quando a próxima página começa frase nova', () => {
    const pages = [['Primeira frase completa da página.'], ['Segunda frase começa aqui.']]
    expect(cleanupPages(pages).split('\n\n')).toHaveLength(2)
  })
})
