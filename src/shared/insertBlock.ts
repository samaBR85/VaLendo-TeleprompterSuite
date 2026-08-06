import { CHAPTER_MARK } from './text'

export type InsertKind = 'chapter' | 'direction'

export interface InsertResult {
  text: string
  /** miolo do bloco já selecionado, para o operador digitar por cima */
  selectionStart: number
  selectionEnd: number
}

export const PLACEHOLDERS: Record<InsertKind, string> = {
  chapter: 'Título do capítulo',
  direction: 'direção de cena'
}

/**
 * Insere um capítulo ou uma direção no ponto do cursor.
 *
 * O classificador de blocos trabalha por parágrafo, e parágrafo é o que está
 * entre linhas em branco. Sem garantir essas fronteiras, "## Título" enfiado no
 * meio de um parágrafo continuaria sendo texto falado — apareceria a marcação
 * na tela do apresentador em vez de virar um capítulo. Por isso as linhas em
 * branco ao redor são acrescentadas só quando ainda não existem.
 */
export function insertBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: InsertKind
): InsertResult {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))

  const selected = value.slice(start, end).trim()
  const content = selected.length > 0 ? selected : PLACEHOLDERS[kind]
  const block = kind === 'chapter' ? `${CHAPTER_MARK} ${content}` : `[${content}]`

  const before = value.slice(0, start)
  const after = value.slice(end)

  const prefix = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = after.length === 0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'

  // pula o colchete ou o "## " antes do miolo: o cursor precisa cair no texto,
  // não na marcação
  const contentOffset = kind === 'chapter' ? CHAPTER_MARK.length + 1 : 1
  const contentStart = before.length + prefix.length + contentOffset

  return {
    text: before + prefix + block + suffix + after,
    selectionStart: contentStart,
    selectionEnd: contentStart + content.length
  }
}

/**
 * Transforma em capítulo TODA linha cujo texto inteiro é igual ao selecionado.
 *
 * O caso que isto resolve: um roteiro com "BLOCO 1", "BLOCO 2", "INTERVALO"
 * repetidos ao longo de meia hora. Marcar um a um é trabalho de rolar o
 * roteiro inteiro procurando com o olho — e o olho pula um.
 *
 * "Linha inteira" é a regra, e é restritiva de propósito: só entra a linha em
 * que o termo está SOZINHO. Uma palavra no meio de uma fala nunca vira título
 * por acidente, por mais que se repita.
 *
 * A linha em branco antes e depois não é enfeite. O classificador trabalha por
 * PARÁGRAFO — o que está entre linhas em branco —, então um `##` encravado no
 * meio de um parágrafo continuaria sendo fala, e a marcação apareceria na tela
 * do apresentador em vez de virar capítulo. Elas só entram onde ainda não
 * existem.
 *
 * Idempotente de graça: uma linha que já é `## BLOCO 1` tem texto
 * `"## BLOCO 1"`, que não é igual a `"BLOCO 1"` — ela nem chega a ser
 * candidata. Rodar duas vezes dá o mesmo resultado.
 */
export function capitularLinhasIguais(texto: string, termo: string): string {
  const alvo = termo.trim()
  // termo de mais de uma linha nunca é "uma linha inteira" — e o silêncio aqui
  // é melhor que uma marcação criativa em cima de uma seleção que o operador
  // fez por engano arrastando demais
  if (alvo === '' || alvo.includes('\n')) return texto

  const linhas = texto.split('\n')
  const fora: string[] = []
  for (let i = 0; i < linhas.length; i += 1) {
    if (linhas[i].trim() !== alvo) {
      fora.push(linhas[i])
      continue
    }
    if (fora.length > 0 && fora[fora.length - 1].trim() !== '') fora.push('')
    fora.push(`${CHAPTER_MARK} ${alvo}`)
    if (i + 1 < linhas.length && linhas[i + 1].trim() !== '') fora.push('')
  }
  return fora.join('\n')
}

/** Quantas linhas o "todos" pegaria — o número que o menu mostra antes de agir. */
export function contarLinhasIguais(texto: string, termo: string): number {
  const alvo = termo.trim()
  if (alvo === '' || alvo.includes('\n')) return 0
  return texto.split('\n').filter((l) => l.trim() === alvo).length
}
