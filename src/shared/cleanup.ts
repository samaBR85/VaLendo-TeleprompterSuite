/**
 * Limpeza do texto importado.
 *
 * O que chega de um PDF ou de um .txt antigo não é roteiro: é o texto quebrado
 * do jeito que coube na página, com hífen no fim da linha, número de página no
 * meio e cabeçalho repetido em toda folha. Um teleprompter que engole isso cru
 * faz o apresentador ler "conti-" e depois "nuação".
 */

const TYPOGRAPHY: [RegExp, string][] = [
  [/\r\n?/g, '\n'],
  [/ /g, ' '], // espaço inquebrável, comum em PDF e Word
  [/[​-‍﻿]/g, ''], // largura zero e BOM no meio do texto
  [/[‘’‛]/g, "'"],
  [/[“”‟]/g, '"'],
  [/…/g, '...'],
  [/(?<=\S)--(?=\S)/g, '—'],
  [/[ \t]{2,}/g, ' '],
  [/[ \t]+\n/g, '\n'],
  [/\n{3,}/g, '\n\n']
]

export function normalizeTypography(text: string): string {
  let out = text
  for (const [pattern, replacement] of TYPOGRAPHY) out = out.replace(pattern, replacement)
  return out.trim()
}

const PAGE_NUMBER = /^\s*(p[áa]g(?:ina)?\.?\s*)?\d{1,4}(\s*(\/|de|of)\s*\d{1,4})?\s*$/i

export function isPageNumber(line: string): boolean {
  return PAGE_NUMBER.test(line)
}

/** "conti-\nnuação" -> "continuação". Só junta quando a próxima linha começa minúscula. */
export function dehyphenate(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const previous = out[out.length - 1]
    if (previous && /\p{Ll}-$/u.test(previous) && /^\p{Ll}/u.test(line.trim())) {
      out[out.length - 1] = previous.slice(0, -1) + line.trim()
      continue
    }
    out.push(line)
  }
  return out
}

const SENTENCE_END = /[.!?:]["')\]]?$/

/**
 * Junta as linhas que são continuação da mesma frase.
 *
 * Uma linha curta que não termina em pontuação é quase sempre título ou item de
 * lista, não meio de parágrafo — por isso o corte usa o comprimento mediano do
 * bloco como referência, e não um número fixo.
 */
export function joinWrappedLines(lines: string[]): string[] {
  const meaningful = lines.map((line) => line.trim()).filter((line) => line.length > 0)
  if (meaningful.length === 0) return []

  const lengths = meaningful.map((line) => line.length).sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)]
  const shortLine = median * 0.62

  const paragraphs: string[] = []
  let buffer: string[] = []

  const flush = (): void => {
    if (buffer.length > 0) paragraphs.push(buffer.join(' ').replace(/\s{2,}/g, ' ').trim())
    buffer = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.length === 0) {
      flush()
      continue
    }

    buffer.push(line)
    if (SENTENCE_END.test(line) || line.length < shortLine) flush()
  }

  flush()
  return paragraphs.filter((paragraph) => paragraph.length > 0)
}

/**
 * Remove cabeçalho e rodapé que se repetem na maioria das páginas, além dos
 * números de página soltos.
 */
export function stripPageFurniture(pages: string[][]): string[][] {
  const cleaned = pages.map((lines) => lines.filter((line) => !isPageNumber(line)))
  if (cleaned.length < 3) return cleaned

  const tally = new Map<string, number>()

  for (const lines of cleaned) {
    // posições únicas: numa página curta, "segunda" e "penúltima" são a mesma
    // linha, e contá-la duas vezes faria uma linha de roteiro passar por
    // cabeçalho e sumir
    const positions = new Set([0, 1, lines.length - 2, lines.length - 1])
    const seenOnThisPage = new Set<string>()

    for (const position of positions) {
      const key = lines[position]?.trim().toLowerCase()
      if (!key || seenOnThisPage.has(key)) continue
      seenOnThisPage.add(key)
      tally.set(key, (tally.get(key) ?? 0) + 1)
    }
  }

  const threshold = Math.max(2, Math.ceil(cleaned.length * 0.6))
  const furniture = new Set([...tally].filter(([, count]) => count >= threshold).map(([key]) => key))
  if (furniture.size === 0) return cleaned

  return cleaned.map((lines) => {
    const copy = [...lines]
    while (copy.length > 0 && furniture.has(copy[0].trim().toLowerCase())) copy.shift()
    while (copy.length > 0 && furniture.has(copy[copy.length - 1].trim().toLowerCase())) copy.pop()
    return copy
  })
}

const EXPLICIT_PAGE = /^\s*(p[áa]g(?:ina)?\.?\s*\d{1,4}|\d{1,4}\s*(\/|de|of)\s*\d{1,4})\s*$/i
const BARE_NUMBER = /^\s*\d{1,4}\s*$/

/**
 * Tira paginação de texto solto, onde não existe fronteira de página para ajudar.
 *
 * "Página 3" é sempre paginação. Um número sozinho só é descartado quando há
 * vários em ordem crescente — senão a contagem regressiva "3 / 2 / 1" de uma
 * abertura de programa iria embora junto.
 */
export function stripPaginationArtifacts(lines: string[]): string[] {
  const bare = lines
    .map((line, index) => ({ index, value: Number(line.trim()) }))
    .filter((entry) => BARE_NUMBER.test(lines[entry.index]))

  const paginated =
    bare.length >= 2 && bare.every((entry, i) => i === 0 || entry.value > bare[i - 1].value)
  const drop = new Set(paginated ? bare.map((entry) => entry.index) : [])

  return lines.filter((line, index) => !drop.has(index) && !EXPLICIT_PAGE.test(line))
}

/** Pipeline para texto solto: .txt, área de transferência, .docx já achatado. */
export function cleanupPlainText(text: string): string {
  const lines = stripPaginationArtifacts(normalizeTypography(text).split('\n'))
  return joinWrappedLines(dehyphenate(lines)).join('\n\n')
}

/** Pipeline para PDF, onde saber onde cada página começa e termina ajuda. */
export function cleanupPages(pages: string[][]): string {
  const stripped = stripPageFurniture(pages.map((lines) => lines.map((line) => normalizeTypography(line))))
  const paragraphs: string[] = []

  for (const lines of stripped) {
    const joined = joinWrappedLines(dehyphenate(lines))
    // uma página que termina no meio da frase continua na próxima
    const previous = paragraphs[paragraphs.length - 1]
    if (previous && joined.length > 0 && !SENTENCE_END.test(previous) && /^\p{Ll}/u.test(joined[0])) {
      paragraphs[paragraphs.length - 1] = `${previous} ${joined.shift()}`
    }
    paragraphs.push(...joined)
  }

  return paragraphs.join('\n\n')
}
