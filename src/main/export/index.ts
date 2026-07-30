import { writeFile } from 'node:fs/promises'
import { formatOf, toMarkdown, toPlainText, type ExportFormat } from '@shared/exportScript'
import type { Block } from '@shared/types'
import { buildDocx } from './docx'
import { buildPdf } from './pdf'

export { EXPORT_FILTERS, defaultFileName } from '@shared/exportScript'

/** Grava o roteiro no formato que a extensão do arquivo pedir. */
export async function exportScript(filePath: string, blocks: Block[], title: string): Promise<ExportFormat> {
  const format = formatOf(filePath)

  switch (format) {
    case 'docx':
      await writeFile(filePath, await buildDocx(blocks, title))
      break
    case 'pdf':
      await writeFile(filePath, await buildPdf(blocks, title))
      break
    case 'md':
      await writeFile(filePath, toMarkdown(blocks, title), 'utf8')
      break
    default:
      await writeFile(filePath, toPlainText(blocks), 'utf8')
  }

  return format
}
