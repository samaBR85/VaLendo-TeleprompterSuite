import type { Block, BlockKind } from './types'

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

/**
 * Divide em parágrafos por linha em branco, preservando as quebras simples.
 *
 * A quebra que o operador digitou fica no texto do bloco de propósito: ela é
 * intencional e precisa aparecer na tela do apresentador. Quem transforma isso
 * em linhas é `composeLines`.
 */
function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim().length > 0)
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

export function blocksFromText(text: string): Block[] {
  return reconcileBlocks([], text)
}
