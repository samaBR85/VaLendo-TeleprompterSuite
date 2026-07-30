import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import mammoth from 'mammoth'
import { cleanupPages, cleanupPlainText } from '@shared/cleanup'
import { htmlToScript, markdownToScript } from '@shared/markdown'
import { extractPdf } from './pdf'

export interface ImportedDocument {
  title: string
  text: string
  warnings: string[]
}

export const IMPORT_FILTERS = [
  { name: 'Todos os formatos aceitos', extensions: ['txt', 'text', 'md', 'markdown', 'docx', 'pdf'] },
  { name: 'Texto', extensions: ['txt', 'text'] },
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Word', extensions: ['docx'] },
  { name: 'PDF', extensions: ['pdf'] }
]

/**
 * Decodifica sem confiar na extensão.
 *
 * Roteiro antigo em .txt costuma vir em Windows-1252, e decodificar como UTF-8
 * enche o texto de losango preto. Se aparecer caractere de substituição, tenta
 * de novo na codificação legada.
 */
function decodeText(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer)
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer)

  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (!utf8.includes('�')) return utf8

  try {
    return new TextDecoder('windows-1252').decode(buffer)
  } catch {
    return utf8
  }
}

export async function importFile(filePath: string): Promise<ImportedDocument> {
  const title = basename(filePath, extname(filePath)).slice(0, 40) || 'Importado'
  const extension = extname(filePath).toLowerCase()
  const warnings: string[] = []

  switch (extension) {
    case '.md':
    case '.markdown': {
      const text = markdownToScript(decodeText(await readFile(filePath)))
      return { title, text, warnings }
    }

    case '.docx': {
      const { value, messages } = await mammoth.convertToHtml({ path: filePath })
      for (const message of messages.slice(0, 3)) {
        if (message.type === 'error') warnings.push(message.message)
      }
      return { title, text: htmlToScript(value), warnings }
    }

    case '.pdf': {
      const { pages, imageOnlyPages } = await extractPdf(new Uint8Array(await readFile(filePath)))
      if (imageOnlyPages.length > 0) {
        warnings.push(
          imageOnlyPages.length === pages.length
            ? 'Este PDF é digitalizado: não tem camada de texto. O OCR entra no próximo marco.'
            : `Sem camada de texto nas páginas ${imageOnlyPages.join(', ')} — ficaram de fora.`
        )
      }
      return { title, text: cleanupPages(pages), warnings }
    }

    default: {
      const text = cleanupPlainText(decodeText(await readFile(filePath)))
      return { title, text, warnings }
    }
  }
}
