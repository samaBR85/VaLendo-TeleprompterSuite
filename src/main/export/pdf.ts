import { BrowserWindow, app } from 'electron'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chapterTitle } from '@shared/text'
import type { Block } from '@shared/types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Página de leitura em papel, não a tela do prompter.
 *
 * O PDF é para imprimir e arquivar: fundo branco, corpo de texto normal, e a
 * marcação do roteiro virando estilo. As quebras de linha do operador viram
 * quebras de verdade, então a diagramação atravessa.
 */
function buildHtml(blocks: Block[], title: string): string {
  const corpo = blocks
    .map((block) => {
      const texto = escapeHtml(block.text).split('\n').join('<br>')
      if (block.kind === 'chapter') return `<h2>${escapeHtml(chapterTitle(block))}</h2>`
      if (block.kind === 'direction') return `<p class="direcao">${texto}</p>`
      return `<p>${texto}</p>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 22mm 20mm; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.55; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 18pt; }
  h2 { font-size: 13pt; text-transform: uppercase; letter-spacing: 0.08em; margin: 20pt 0 8pt;
       page-break-after: avoid; }
  p { margin: 0 0 10pt; }
  .direcao { color: #2F6FBF; font-style: italic; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${corpo}
</body>
</html>`
}

/**
 * Imprime numa janela oculta. Usa arquivo em vez de data URL porque roteiro
 * grande estoura o tamanho de URL, e acentuação em data URL depende de
 * codificação — com arquivo em UTF-8 não depende de nada.
 */
export async function buildPdf(blocks: Block[], title: string): Promise<Buffer> {
  const temp = join(app.getPath('temp'), `valendo-${process.pid}-${blocks.length}.html`)
  await writeFile(temp, buildHtml(blocks, title), 'utf8')

  const window = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, javascript: false }
  })

  try {
    await window.loadFile(temp)
    return await window.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      generateDocumentOutline: true
    })
  } finally {
    window.destroy()
    await unlink(temp).catch(() => {
      // arquivo temporário: o sistema limpa depois
    })
  }
}
