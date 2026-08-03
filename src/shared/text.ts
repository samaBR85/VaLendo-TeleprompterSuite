import type { Anchor, Block, BlockKind } from './types'

export function words(text: string): string[] {
  return text.trim().length === 0 ? [] : text.trim().split(/\s+/)
}

export function blockWordCount(block: Block): number {
  return block.kind === 'speech' ? words(block.text).length : 0
}

/** Só fala conta tempo; direções e títulos de capítulo ficam fora. */
export function totalWordCount(blocks: Block[]): number {
  let n = 0
  for (const b of blocks) n += blockWordCount(b)
  return n
}

function classify(paragraph: string): BlockKind {
  const t = paragraph.trim()
  if (/^\[[\s\S]*\]$/.test(t)) return 'direction'
  if (/^(#{1,6}|§)\s+/.test(t)) return 'chapter'
  return 'speech'
}

export function chapterTitle(block: Block): string {
  return block.text.replace(/^(#{1,6}|§)\s+/, '').trim()
}

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `b${Date.now().toString(36)}${idCounter.toString(36)}`
}

interface ParagraphSpan {
  text: string
  /** onde este parágrafo começa no texto normalizado — usado por `anchorFromCaret` */
  start: number
}

/**
 * Divide em parágrafos por linha em branco, preservando as quebras simples e
 * a posição de cada um no texto original.
 *
 * A quebra que o operador digitou fica no texto do bloco de propósito: ela é
 * intencional e precisa aparecer na tela do apresentador. Quem transforma isso
 * em linhas é `composeLines`.
 */
function paragraphSpans(text: string): ParagraphSpan[] {
  const spans: ParagraphSpan[] = []
  let offset = 0
  for (const chunk of text.replace(/\r\n?/g, '\n').split(/(\n{2,})/)) {
    if (chunk.trim().length > 0) spans.push({ text: chunk, start: offset })
    offset += chunk.length
  }
  return spans
}

function splitParagraphs(text: string): string[] {
  return paragraphSpans(text).map((span) => span.text)
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  const max = Math.max(a.length, b.length)
  if (max === 0) return 1
  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1
  }
  return (prefix + suffix) / max
}

/**
 * Converte o texto do editor em blocos **reaproveitando os ids anteriores**.
 *
 * Sem isso a âncora de leitura morre a cada tecla: se cada re-parse gerasse
 * ids novos, `remapAnchor` não teria a que se agarrar. Parágrafos intocados
 * mantêm o id por igualdade de texto; o parágrafo sendo digitado mantém o id
 * por similaridade de prefixo/sufixo.
 */
export function reconcileBlocks(previous: Block[], text: string): Block[] {
  const paragraphs = splitParagraphs(text)
  const used = new Set<string>()
  const result: (Block | null)[] = paragraphs.map(() => null)

  // 1. mesma posição e mesmo texto — o caso mais comum, e o mais barato
  paragraphs.forEach((p, i) => {
    const old = previous[i]
    if (old && old.text === p && !used.has(old.id)) {
      used.add(old.id)
      result[i] = { id: old.id, kind: classify(p), text: p }
    }
  })

  // 2. texto idêntico em outra posição — parágrafo movido
  paragraphs.forEach((p, i) => {
    if (result[i]) return
    const old = previous.find((b) => b.text === p && !used.has(b.id))
    if (old) {
      used.add(old.id)
      result[i] = { id: old.id, kind: classify(p), text: p }
    }
  })

  // 3. parágrafo alterado: casa com o vizinho mais próximo ainda livre
  paragraphs.forEach((p, i) => {
    if (result[i]) return
    let best: { block: Block; score: number } | null = null
    for (let j = Math.max(0, i - 2); j <= Math.min(previous.length - 1, i + 2); j += 1) {
      const old = previous[j]
      if (!old || used.has(old.id)) continue
      const score = similarity(old.text, p)
      if (score >= 0.4 && (!best || score > best.score)) best = { block: old, score }
    }
    if (best) {
      used.add(best.block.id)
      result[i] = { id: best.block.id, kind: classify(p), text: p }
    }
  })

  return paragraphs.map((p, i) => result[i] ?? { id: newId(), kind: classify(p), text: p })
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks.map((b) => b.text).join('\n\n')
}

/**
 * Tira a marcação e devolve o texto simples: sem `§`/`#` de capítulo e sem os
 * colchetes de direção.
 *
 * As PALAVRAS ficam — é "remover formatação", como em qualquer editor, e não
 * "apagar trecho". Uma direção vira parágrafo de fala, um título de capítulo
 * vira parágrafo de fala, e o roteiro passa a durar mais, porque só fala conta
 * tempo. Isso é visível de imediato (a contagem no cabeçalho da Edição muda) e
 * desfazível pelo Mod+Z de sempre — que é o motivo de não haver pergunta antes.
 *
 * Trabalha por PARÁGRAFO, e não por linha, porque é assim que o modelo
 * classifica: uma direção pode ocupar várias linhas dentro dos mesmos
 * colchetes, e olhar linha a linha deixaria metade dela para trás.
 */
export function stripFormatting(text: string): string {
  return splitParagraphs(text)
    .map((paragrafo) => {
      const limpo = paragrafo.trim()
      if (/^\[[\s\S]*\]$/.test(limpo)) return limpo.slice(1, -1).trim()
      if (/^(#{1,6}|§)\s+/.test(limpo)) return limpo.replace(/^(#{1,6}|§)\s+/, '')
      return limpo
    })
    .filter((paragrafo) => paragrafo.length > 0)
    .join('\n\n')
}

/** Há o que remover? É o que decide se o botão fica aceso ou apagado. */
export function hasFormatting(blocks: Block[]): boolean {
  return blocks.some((b) => b.kind !== 'speech')
}

export function blocksFromText(text: string): Block[] {
  return reconcileBlocks([], text)
}

/**
 * Onde o cursor do editor está, em termos que o transporte entende: bloco +
 * palavras percorridas dentro dele. É o "Go To" — reaproveita a mesma
 * reconciliação de ids que o editor já faz a cada tecla, para que a âncora
 * caia no bloco certo mesmo com a digitação ainda não confirmada pelo main.
 *
 * Capítulo e direção não têm fala para contar — pousa no início da linha.
 * Um cursor no respiro entre dois parágrafos pousa no início do seguinte.
 */
export function anchorFromCaret(previousBlocks: Block[], text: string, caret: number): Anchor | null {
  const spans = paragraphSpans(text)
  if (spans.length === 0) return null

  const found = spans.findIndex((span) => caret <= span.start + span.text.length)
  const index = found === -1 ? spans.length - 1 : found
  const span = spans[index]

  const block = reconcileBlocks(previousBlocks, text)[index]
  if (!block) return null
  if (block.kind !== 'speech') return { blockId: block.id, wordOffset: 0 }

  const offsetInParagraph = Math.max(0, Math.min(span.text.length, caret - span.start))
  return { blockId: block.id, wordOffset: words(span.text.slice(0, offsetInParagraph)).length }
}
