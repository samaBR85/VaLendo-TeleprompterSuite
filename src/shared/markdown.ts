import { normalizeTypography } from './cleanup'

/**
 * Markdown -> roteiro.
 *
 * Não é um renderizador: é uma redução. Título vira capítulo (`§`), o resto
 * vira parágrafo falado e a marcação some — ninguém lê asterisco em voz alta.
 */
export function markdownToScript(markdown: string): string {
  const source = normalizeTypography(markdown)
  const out: string[] = []
  let inFence = false

  for (const raw of source.split('\n')) {
    const line = raw.trimEnd()

    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      out.push(line.trim())
      continue
    }

    if (line.trim().length === 0) {
      out.push('')
      continue
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s-*_]*$/.test(line)) {
      out.push('')
      continue
    }

    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      out.push('', `§ ${inline(heading[2])}`, '')
      continue
    }

    const setext = /^\s*(=|-){3,}\s*$/.exec(line)
    if (setext && out.length > 0 && out[out.length - 1].trim().length > 0) {
      out[out.length - 1] = `§ ${out[out.length - 1].replace(/^§\s*/, '')}`
      continue
    }

    let text = line
      .replace(/^\s{0,3}>\s?/, '')
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^\s*\d+[.)]\s+/, '')
      .replace(/^\s*\[[ xX]\]\s*/, '')

    out.push(inline(text))
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function inline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(?!\s)(.+?)(?<!\s)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/** HTML simples (saída do mammoth) -> roteiro, preservando os títulos. */
export function htmlToScript(html: string): string {
  const blocks: string[] = []
  const pattern = /<(h[1-6]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi

  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const text = inline(match[2].replace(/<br\s*\/?>/gi, ' '))
    if (text.length === 0) continue
    blocks.push(tag.startsWith('h') ? `§ ${text}` : text)
  }

  if (blocks.length === 0) return normalizeTypography(inline(html))
  return normalizeTypography(blocks.join('\n\n'))
}
