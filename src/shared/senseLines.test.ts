import { describe, expect, it } from 'vitest'
import { normalizeRule, senseLines } from './senseLines'
import { words } from './text'

const WEAK = /\b(de|da|do|em|no|na|para|com|que|e|ou|o|a|os|as|um|uma|por|sobre)$/i

describe('senseLines', () => {
  it('respeita o máximo de palavras por linha', () => {
    const text = 'uma sequência bem longa de palavras comuns escritas apenas para encher várias linhas seguidas'
    for (const line of senseLines(text, { minWords: 2, maxWords: 5 })) {
      expect(words(line).length).toBeLessThanOrEqual(5)
    }
  })

  it('nunca termina uma linha em preposição ou artigo', () => {
    const text =
      'o apresentador precisa ler o texto com calma para que a plateia entenda a mensagem do programa de hoje'
    const lines = senseLines(text, { minWords: 3, maxWords: 6 })

    lines.slice(0, -1).forEach((line) => {
      expect(line).not.toMatch(WEAK)
    })
  })

  it('aceita terminar em palavra fraca se a pontuação fecha o trecho', () => {
    const lines = senseLines('ele contou tudo para a plateia, e ninguém acreditou naquela história', {
      minWords: 3,
      maxWords: 6
    })
    expect(lines.join(' | ')).toContain('plateia,')
  })

  it('não deixa a última linha órfã com uma palavra só', () => {
    const text = 'primeira segunda terceira quarta quinta sexta sétima'
    const lines = senseLines(text, { minWords: 2, maxWords: 6 })
    expect(words(lines[lines.length - 1]).length).toBeGreaterThan(1)
  })

  it('preserva todas as palavras, na ordem', () => {
    const text = 'nada pode ser perdido nem reordenado durante a quebra por sentido do roteiro inteiro'
    const lines = senseLines(text, { minWords: 3, maxWords: 5 })
    expect(lines.join(' ')).toBe(text)
  })

  it('é determinística e devolve vazio para texto vazio', () => {
    const rule = { minWords: 3, maxWords: 6 }
    const text = 'texto qualquer para conferir a estabilidade da função'
    expect(senseLines(text, rule)).toEqual(senseLines(text, rule))
    expect(senseLines('   ', rule)).toEqual([])
  })

  it('corrige regras invertidas em vez de travar', () => {
    expect(normalizeRule({ minWords: 9, maxWords: 3 })).toEqual({ minWords: 3, maxWords: 3 })
    expect(senseLines('uma duas três quatro cinco', { minWords: 9, maxWords: 3 }).length).toBeGreaterThan(0)
  })
})
