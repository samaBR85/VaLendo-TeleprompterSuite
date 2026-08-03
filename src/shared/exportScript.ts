import { chapterTitle, serializeBlocks } from './text'
import type { Block } from './types'

export type ExportFormat = 'txt' | 'md' | 'docx' | 'pdf'

export const EXPORT_FORMATS: { format: ExportFormat; label: string; extension: string }[] = [
  { format: 'txt', label: 'Texto', extension: 'txt' },
  { format: 'md', label: 'Markdown', extension: 'md' },
  { format: 'docx', label: 'Word', extension: 'docx' },
  { format: 'pdf', label: 'PDF', extension: 'pdf' }
]

/** Filtros do diálogo de salvar, na ordem em que aparecem. */
export const EXPORT_FILTERS = [
  { name: 'Texto', extensions: ['txt'] },
  { name: 'Word', extensions: ['docx'] },
  { name: 'PDF', extensions: ['pdf'] },
  { name: 'Markdown', extensions: ['md'] }
]

/**
 * Nome sugerido no diálogo, a partir do título da aba.
 *
 * Tira o que o Windows não aceita em nome de arquivo: sem isso o diálogo abre
 * com um nome que ele mesmo recusa na hora de gravar, e o operador leva um erro
 * sem entender de onde veio.
 */
export function defaultFileName(title: string): string {
  const limpo = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  // um nome só de traços é tecnicamente válido e inútil de ler: se não sobrou
  // letra nem número, o nome genérico serve melhor
  return `${/[\p{L}\p{N}]/u.test(limpo) ? limpo : 'roteiro'}.txt`
}

export function formatOf(filePath: string): ExportFormat {
  const extension = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase()
  return EXPORT_FORMATS.find((f) => f.extension === extension)?.format ?? 'txt'
}

/**
 * O .txt é o texto do editor, letra por letra.
 *
 * Nada de reformatar: as linhas em branco são a diagramação que o operador
 * escolheu, e `[direções]` e `## capítulos` são a marcação que o próprio app lê
 * de volta. Salvar e reimportar tem que devolver o mesmo roteiro.
 */
export function toPlainText(blocks: Block[]): string {
  return `${serializeBlocks(blocks)}\n`
}

/** No Markdown a marcação vira a do formato, para o arquivo abrir bonito fora daqui. */
export function toMarkdown(blocks: Block[], title: string): string {
  const corpo = blocks.map((block) => {
    if (block.kind === 'chapter') return `## ${chapterTitle(block)}`
    if (block.kind === 'direction') return `_${block.text}_`
    // no Markdown a quebra de linha simples é ignorada; dois espaços a mantêm,
    // e a diagramação do operador é justamente o que não pode se perder
    return block.text.split('\n').join('  \n')
  })

  return `# ${title}\n\n${corpo.join('\n\n')}\n`
}
