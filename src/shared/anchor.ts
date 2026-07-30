import type { Anchor, Block, BlockKind, LineRule } from './types'
import { senseLines } from './senseLines'
import { blockWordCount, words } from './text'

/** Linha composta, ainda sem geometria. */
export interface LineSpec {
  blockId: string
  kind: BlockKind
  text: string
  /**
   * Peso desta linha na linha do tempo de rolagem — quanto ela "custa" em
   * palavras para a marca de leitura atravessar. Direção e capítulo entram
   * aqui com o tamanho do próprio texto, nunca zero: se custassem zero, a
   * rolagem atravessaria a altura da linha inteira num único instante, e o
   * texto pularia na tela bem no meio de uma anotação em `[colchetes]` ou de
   * um título `§`. A contagem que existe para excluir direção e capítulo do
   * tempo de fala estimado é outra, deliberadamente separada desta: mora em
   * `totalWordCount` (text.ts), que opera em Block[], não em linha composta.
   */
  wordCount: number
  /** palavras percorridas dentro do bloco até o início desta linha */
  blockWordStart: number
  /** palavras percorridas no documento inteiro até o início desta linha */
  wordStart: number
}

export interface LineGeometry {
  top: number
  height: number
}

export type Line = LineSpec & LineGeometry
export type Layout = Line[]

/**
 * Compõe as linhas do documento. A composição depende só do texto e da regra
 * de palavras por linha — nunca do corpo da fonte. Por isso aumentar a fonte
 * não recompõe nada: as mesmas palavras seguem na mesma linha, só mais altas.
 */
export function composeLines(blocks: Block[], rule: LineRule): LineSpec[] {
  const out: LineSpec[] = []
  let globalWords = 0

  for (const block of blocks) {
    if (block.kind === 'speech') {
      const lines = senseLines(block.text, rule)
      let blockWords = 0
      for (const text of lines) {
        const wordCount = words(text).length
        out.push({
          blockId: block.id,
          kind: block.kind,
          text,
          wordCount,
          blockWordStart: blockWords,
          wordStart: globalWords
        })
        blockWords += wordCount
        globalWords += wordCount
      }
    } else {
      // peso não-zero de propósito — ver o comentário de `wordCount` em LineSpec.
      // piso na MÉDIA entre mínimo e máximo de palavras por linha, não no
      // mínimo: `senseLines` empacota a fala perto do teto, então uma linha
      // comum tem bem mais que `minWords` palavras na prática. Usar o mínimo
      // como piso deixava direção e capítulo "mais leves" que uma linha de
      // fala típica, e eles cruzavam a tela um pouco mais rápido — pequeno,
      // mas perceptível a quem opera o teleprompter todo dia.
      const typicalLineWords = (rule.minWords + rule.maxWords) / 2
      const wordCount = Math.max(words(block.text).length, typicalLineWords)
      out.push({
        blockId: block.id,
        kind: block.kind,
        text: block.text,
        wordCount,
        blockWordStart: 0,
        wordStart: globalWords
      })
      globalWords += wordCount
    }
  }

  return out
}

export function totalWords(lines: LineSpec[]): number {
  let n = 0
  for (const l of lines) n += l.wordCount
  return n
}

export function layoutHeight(layout: Layout): number {
  if (layout.length === 0) return 0
  const last = layout[layout.length - 1]
  return last.top + last.height
}

function linesOfBlock<T extends LineSpec>(lines: T[], blockId: string): T[] {
  return lines.filter((l) => l.blockId === blockId)
}

/**
 * Âncora -> pixel. Interpola dentro da linha para a rolagem sair contínua em
 * vez de saltar de linha em linha.
 */
export function pixelFromAnchor(layout: Layout, anchor: Anchor): number | null {
  const lines = linesOfBlock(layout, anchor.blockId)
  if (lines.length === 0) return null

  const blockWords = lines.reduce((n, l) => n + l.wordCount, 0)
  if (blockWords === 0) return lines[0].top

  for (const line of lines) {
    if (line.wordCount === 0) continue
    if (anchor.wordOffset < line.blockWordStart + line.wordCount) {
      const into = Math.max(0, anchor.wordOffset - line.blockWordStart)
      return line.top + (into / line.wordCount) * line.height
    }
  }

  const last = lines[lines.length - 1]
  return last.top + last.height
}

/** Pixel -> âncora. Inverso de `pixelFromAnchor`. */
export function anchorFromPixel(layout: Layout, y: number): Anchor | null {
  if (layout.length === 0) return null

  for (const line of layout) {
    if (y < line.top + line.height) {
      if (line.wordCount === 0) return { blockId: line.blockId, wordOffset: 0 }
      const f = Math.min(1, Math.max(0, (y - line.top) / line.height))
      return { blockId: line.blockId, wordOffset: line.blockWordStart + f * line.wordCount }
    }
  }

  const last = layout[layout.length - 1]
  return { blockId: last.blockId, wordOffset: last.blockWordStart + last.wordCount }
}

/** Índice global de palavras -> âncora. É por aqui que o relógio de rolagem entra. */
export function anchorFromWordIndex(lines: LineSpec[], wordIndex: number): Anchor | null {
  if (lines.length === 0) return null
  if (wordIndex <= 0) return { blockId: lines[0].blockId, wordOffset: 0 }

  for (const line of lines) {
    if (line.wordCount === 0) continue
    if (wordIndex < line.wordStart + line.wordCount) {
      return { blockId: line.blockId, wordOffset: line.blockWordStart + (wordIndex - line.wordStart) }
    }
  }

  const speech = lines.filter((l) => l.wordCount > 0)
  const last = speech[speech.length - 1] ?? lines[lines.length - 1]
  return { blockId: last.blockId, wordOffset: last.blockWordStart + last.wordCount }
}

export function wordIndexFromAnchor(lines: LineSpec[], anchor: Anchor): number {
  const owned = linesOfBlock(lines, anchor.blockId)
  if (owned.length === 0) return 0
  for (const line of owned) {
    if (line.wordCount === 0) continue
    if (anchor.wordOffset < line.blockWordStart + line.wordCount) {
      return line.wordStart + (anchor.wordOffset - line.blockWordStart)
    }
  }
  const last = owned[owned.length - 1]
  return last.wordStart + last.wordCount
}

export function clampAnchor(blocks: Block[], anchor: Anchor): Anchor | null {
  const block = blocks.find((b) => b.id === anchor.blockId)
  if (!block) return null
  const max = blockWordCount(block)
  return { blockId: block.id, wordOffset: Math.min(Math.max(0, anchor.wordOffset), max) }
}

/**
 * Reposiciona a âncora depois de uma edição.
 *
 * O caso que importa: o bloco continua existindo (mesmo id), então a âncora
 * fica **exatamente onde estava** — inserir ou apagar parágrafos acima do
 * ponto de leitura não move nada. Se o bloco ancorado foi apagado, procura o
 * vizinho de cima que sobreviveu e ancora no fim dele; se não houver, o de
 * baixo, no início.
 */
export function remapAnchor(oldBlocks: Block[], newBlocks: Block[], anchor: Anchor | null): Anchor | null {
  if (!anchor) return newBlocks.length > 0 ? { blockId: newBlocks[0].id, wordOffset: 0 } : null

  const survived = clampAnchor(newBlocks, anchor)
  if (survived) return survived

  const index = oldBlocks.findIndex((b) => b.id === anchor.blockId)
  if (index === -1) return newBlocks.length > 0 ? { blockId: newBlocks[0].id, wordOffset: 0 } : null

  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = newBlocks.find((b) => b.id === oldBlocks[i].id)
    if (candidate) return { blockId: candidate.id, wordOffset: blockWordCount(candidate) }
  }

  for (let i = index + 1; i < oldBlocks.length; i += 1) {
    const candidate = newBlocks.find((b) => b.id === oldBlocks[i].id)
    if (candidate) return { blockId: candidate.id, wordOffset: 0 }
  }

  return newBlocks.length > 0 ? { blockId: newBlocks[0].id, wordOffset: 0 } : null
}
