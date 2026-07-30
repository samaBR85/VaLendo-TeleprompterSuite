import type { LineRule } from './types'
import { words } from './text'

/**
 * Palavras que não devem terminar uma linha: quem lê em voz alta pega a linha
 * inteira num relance, e terminar em preposição ou artigo força uma micropausa
 * no lugar errado. É ofício de teleprompter, não estética.
 */
const WEAK_ENDINGS = new Set([
  // artigos e contrações
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'ao', 'aos', 'à', 'às', 'do', 'da', 'dos', 'das',
  'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas',
  'num', 'numa', 'dum', 'duma', 'deste', 'desta', 'desse', 'dessa',
  'neste', 'nesta', 'nesse', 'nessa', 'naquele', 'naquela',
  // preposições
  'de', 'em', 'por', 'para', 'pra', 'com', 'sem', 'sob', 'sobre',
  'entre', 'até', 'desde', 'após', 'ante', 'perante', 'contra', 'trás',
  // conjunções e relativos
  'e', 'ou', 'mas', 'que', 'se', 'como', 'quando', 'onde', 'porque',
  'pois', 'nem', 'nen', 'embora', 'enquanto', 'cujo', 'cuja', 'qual',
  // pronomes e determinantes
  'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa', 'este', 'esta',
  'esse', 'essa', 'aquele', 'aquela', 'isso', 'todo', 'toda', 'cada',
  // inglês, para roteiros bilíngues
  'the', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or',
  'but', 'with', 'from', 'by', 'as', 'is', 'was', 'that', 'this', 'my'
])

/** Pontuação fecha o pensamento: é sempre um bom lugar para terminar a linha. */
function isStrongEnding(token: string): boolean {
  return /[.,;:!?…"”')\]]$/.test(token)
}

function isWeakEnding(token: string): boolean {
  if (isStrongEnding(token)) return false
  const base = token.toLowerCase().replace(/^[¿¡("'[«]+/, '')
  return WEAK_ENDINGS.has(base)
}

export function normalizeRule(rule: LineRule): LineRule {
  const min = Math.max(1, Math.min(rule.minWords, rule.maxWords))
  const max = Math.max(min, rule.maxWords)
  return { minWords: min, maxWords: max }
}

/**
 * Quebra o texto em linhas respeitando mín/máx de palavras e evitando
 * terminar em palavra fraca. Determinística: a mesma entrada sempre dá a
 * mesma saída, o que é o que permite trocar o corpo da fonte sem recompor
 * as linhas — só a altura em pixels muda.
 */
export function senseLines(text: string, rule: LineRule): string[] {
  const { minWords, maxWords } = normalizeRule(rule)
  const tokens = words(text)
  if (tokens.length === 0) return []

  const lines: string[] = []
  let i = 0

  while (i < tokens.length) {
    const remaining = tokens.length - i
    let take = Math.min(maxWords, remaining)

    // recua enquanto a última palavra da linha for fraca e ainda sobrar texto
    while (take > minWords && remaining - take > 0 && isWeakEnding(tokens[i + take - 1])) {
      take -= 1
    }

    // não deixa a última linha órfã com uma palavra só
    if (remaining - take === 1 && take > minWords) take -= 1

    lines.push(tokens.slice(i, i + take).join(' '))
    i += take
  }

  return lines
}
