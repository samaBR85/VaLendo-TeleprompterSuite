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
