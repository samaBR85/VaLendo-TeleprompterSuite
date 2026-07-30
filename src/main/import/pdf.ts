import { pathToFileURL } from 'node:url'

interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

interface Span {
  str: string
  x: number
  y: number
  width: number
  height: number
}

/** Largura mínima de corredor vazio, em fração da página, para valer como coluna. */
const GUTTER = 0.045

let loaded: Record<string, unknown> | null = null

/**
 * `pdfjs-dist` só existe como ESM e este bundle é CJS.
 *
 * O import dinâmico é preservado como `import()` de verdade na saída (o rollup
 * não o converte em `require`, que quebraria ao carregar um `.mjs`), então o
 * carregamento acontece só quando alguém importa um PDF de fato.
 */
async function loadPdfjs(): Promise<Record<string, unknown>> {
  if (loaded) return loaded
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as Record<
    string,
    unknown
  >

  try {
    const worker = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
    const options = pdfjs.GlobalWorkerOptions as { workerSrc: string }
    options.workerSrc = pathToFileURL(worker).href
  } catch {
    // sem worker o pdf.js cai para execução na própria thread, o que serve
    // para extrair texto de um roteiro
  }

  loaded = pdfjs
  return pdfjs
}

/**
 * Agrupa os fragmentos numa mesma linha visual.
 *
 * O PDF não tem linhas: tem pedaços de texto com coordenadas. Dois fragmentos
 * pertencem à mesma linha quando as bases estão a menos de meia altura de
 * distância — o que tolera sobrescrito e mudança de fonte no meio da frase.
 */
function groupIntoLines(spans: Span[]): string[] {
  if (spans.length === 0) return []

  const sorted = [...spans].sort((a, b) => b.y - a.y || a.x - b.x)
  const medianHeight =
    [...sorted].map((s) => s.height).sort((a, b) => a - b)[Math.floor(sorted.length / 2)] || 10
  const tolerance = Math.max(2, medianHeight * 0.5)

  const lines: Span[][] = []
  for (const span of sorted) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(current[0].y - span.y) <= tolerance) current.push(span)
    else lines.push([span])
  }

  return lines.map((line) => {
    const ordered = [...line].sort((a, b) => a.x - b.x)
    let text = ''
    let previousEnd: number | null = null

    for (const span of ordered) {
      // o PDF costuma não gravar o espaço entre fragmentos: deduz pelo vão
      if (previousEnd !== null && span.x - previousEnd > medianHeight * 0.18 && !/\s$/.test(text)) {
        text += ' '
      }
      text += span.str
      previousEnd = span.x + span.width
    }

    return text.replace(/\s{2,}/g, ' ').trim()
  })
}

/** Ponto de corte vertical que nenhum fragmento atravessa: o corredor entre colunas. */
function findGutter(spans: Span[], pageWidth: number): number | null {
  if (spans.length < 12) return null

  const minimum = pageWidth * GUTTER
  let best: { at: number; width: number } | null = null

  for (let ratio = 0.35; ratio <= 0.65; ratio += 0.01) {
    const at = pageWidth * ratio
    const crossing = spans.some((s) => s.x < at && s.x + s.width > at)
    if (crossing) continue

    const left = spans.filter((s) => s.x + s.width <= at)
    const right = spans.filter((s) => s.x >= at)
    if (left.length < 5 || right.length < 5) continue

    const gap = Math.min(...right.map((s) => s.x)) - Math.max(...left.map((s) => s.x + s.width))
    if (gap >= minimum && (!best || gap > best.width)) best = { at, width: gap }
  }

  return best?.at ?? null
}

export interface PdfExtraction {
  pages: string[][]
  /** páginas sem camada de texto, candidatas a OCR */
  imageOnlyPages: number[]
}

export async function extractPdf(data: Uint8Array): Promise<PdfExtraction> {
  const pdfjs = await loadPdfjs()
  const getDocument = pdfjs.getDocument as (options: unknown) => { promise: Promise<unknown> }

  const document = (await getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false
  }).promise) as {
    numPages: number
    getPage(n: number): Promise<{
      getTextContent(): Promise<{ items: TextItem[] }>
      getViewport(options: { scale: number }): { width: number }
    }>
  }

  const pages: string[][] = []
  const imageOnlyPages: number[] = []

  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number)
    const content = await page.getTextContent()
    const pageWidth = page.getViewport({ scale: 1 }).width

    const spans: Span[] = content.items
      .filter((item) => typeof item.str === 'string' && item.str.trim().length > 0)
      .map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height || Math.abs(item.transform[3]) || 10
      }))

    if (spans.reduce((n, s) => n + s.str.trim().length, 0) < 15) {
      imageOnlyPages.push(number)
      pages.push([])
      continue
    }

    const gutter = findGutter(spans, pageWidth)
    if (gutter === null) {
      pages.push(groupIntoLines(spans))
    } else {
      pages.push([
        ...groupIntoLines(spans.filter((s) => s.x + s.width <= gutter)),
        ...groupIntoLines(spans.filter((s) => s.x > gutter))
      ])
    }
  }

  return { pages, imageOnlyPages }
}
