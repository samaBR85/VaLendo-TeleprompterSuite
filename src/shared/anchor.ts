import type { Anchor, Block, BlockKind, PacingRule } from './types'
import { senseLines } from './senseLines'
import { blockWordCount, words } from './text'

/** Linha composta, ainda sem geometria. */
export interface LineSpec {
  blockId: string
  kind: BlockKind
  text: string
  /**
   * Peso desta linha na régua de rolagem — quanto ela "custa" para a marca de
   * leitura atravessar. Nunca zero: uma linha de peso zero seria atravessada
   * num instante, e como ela ocupa altura real na tela, o texto saltaria.
   *
   * Com `uniformSpeed` (o padrão) todas as linhas pesam igual, e como todas
   * têm a mesma altura, a rolagem anda em pixels constantes. A contagem de
   * palavras faladas de verdade é outra coisa, deliberadamente separada
   * desta: mora em `totalWordCount` (text.ts), que opera em Block[].
   */
  wordCount: number
  /** palavras percorridas dentro do bloco até o início desta linha */
  blockWordStart: number
  /** palavras percorridas no documento inteiro até o início desta linha */
  wordStart: number
  /**
   * Linha em branco de diagramação, vinda da linha em branco que separa dois
   * parágrafos no editor. Ocupa uma linha de altura na tela, como o operador
   * escreveu, e por isso pesa na régua como qualquer outra.
   */
  spacer?: boolean
}

export interface LineGeometry {
  top: number
  height: number
}

export type Line = LineSpec & LineGeometry
export type Layout = Line[]

interface LineDraft {
  blockId: string
  kind: BlockKind
  text: string
  words: number
  spacer?: boolean
}

/**
 * Quantas fileiras visuais cada linha composta ocupou de fato na tela, medido
 * pelo renderer.
 *
 * Uma linha composta pode não caber na largura e dobrar em duas ou três
 * fileiras. Ela então ocupa o dobro ou o triplo da altura, e se pesasse o
 * mesmo que uma linha de uma fileira, a rolagem passaria por ela no dobro da
 * velocidade. Medido no app: 149px por fileira, e a linha dobrada de 297px
 * cruzava a 28px por amostra contra 14px das demais.
 */
export type MeasuredRows = number[]

/**
 * Compõe as linhas do documento. A composição depende só do texto e da regra
 * de palavras por linha — nunca do corpo da fonte. Por isso aumentar a fonte
 * não recompõe nada: as mesmas palavras seguem na mesma linha, só mais altas.
 *
 * O peso de cada linha na régua de rolagem sai daqui. Com `uniformSpeed`, o
 * peso é proporcional à altura que a linha ocupa de fato — daí `rows`, medido
 * na tela. É isso que faz o texto subir sempre no mesmo número de pixels por
 * segundo, sem acelerar nem frear sozinho.
 */
export function composeLines(blocks: Block[], rule: PacingRule, rows?: MeasuredRows): LineSpec[] {
  const drafts: LineDraft[] = []
  let previous: Block | null = null

  for (const block of blocks) {
    // a linha em branco que separa dois parágrafos no editor é diagramação:
    // o operador abriu respiro ali de propósito, e ele precisa existir na tela
    // do apresentador. Fica presa ao bloco anterior para que saltar para um
    // capítulo ou marcador caia no texto, não no branco acima dele
    if (previous) {
      drafts.push({ blockId: previous.id, kind: previous.kind, text: '', words: 0, spacer: true })
    }
    previous = block

    if (block.kind === 'speech') {
      // a quebra de linha que o operador digitou é respeitada: ele a colocou
      // ali de propósito, para marcar respiração ou ênfase. A regra de
      // palavras por linha só entra depois, para dividir o que sobrou comprido
      for (const typed of block.text.split('\n')) {
        for (const text of senseLines(typed, rule)) {
          drafts.push({ blockId: block.id, kind: block.kind, text, words: words(text).length })
        }
      }
    } else {
      drafts.push({
        blockId: block.id,
        kind: block.kind,
        text: block.text,
        words: words(block.text).length
      })
    }
  }

  // a medição só vale se for do mesmo conjunto de linhas; texto editado desde
  // a última medida invalida tudo, e aí é melhor uma fileira por linha do que
  // pesos deslocados
  const measured = rows && rows.length === drafts.length ? rows : null
  const rowsOf = (index: number): number => Math.max(1, measured ? measured[index] : 1)

  const weightOf = lineWeigher(drafts, rule, rowsOf)
  const out: LineSpec[] = []
  let globalWords = 0
  let currentBlockId: string | null = null
  let blockWords = 0

  for (const [index, draft] of drafts.entries()) {
    if (draft.blockId !== currentBlockId) {
      currentBlockId = draft.blockId
      blockWords = 0
    }

    const wordCount = weightOf(draft, index)
    out.push({
      blockId: draft.blockId,
      kind: draft.kind,
      text: draft.text,
      wordCount,
      blockWordStart: blockWords,
      wordStart: globalWords,
      ...(draft.spacer ? { spacer: true } : {})
    })
    blockWords += wordCount
    globalWords += wordCount
  }

  return out
}

function lineWeigher(
  drafts: LineDraft[],
  rule: PacingRule,
  rowsOf: (index: number) => number
): (draft: LineDraft, index: number) => number {
  // linha de fala típica, usada como piso e como referência
  const typical = Math.max(1, (rule.minWords + rule.maxWords) / 2)

  if (rule.uniformSpeed) {
    // peso por FILEIRA, não por linha composta: uma linha que dobrou ocupa duas
    // fileiras de altura e precisa custar o dobro, senão a rolagem a atravessa
    // no dobro da velocidade
    let spoken = 0
    let rows = 0
    drafts.forEach((draft, index) => {
      if (draft.kind !== 'speech' || draft.spacer) return
      spoken += draft.words
      rows += rowsOf(index)
    })

    const perRow = rows > 0 ? Math.max(1, spoken / rows) : typical
    return (_draft, index) => perRow * rowsOf(index)
  }

  // ritmo por palavras: cada linha custa o que ela tem de fala. Direção,
  // capítulo e linha em branco não têm fala, mas ocupam altura na tela, então
  // recebem o piso — sem isso a rolagem saltaria por cima delas
  return (draft) =>
    draft.kind === 'speech' && !draft.spacer ? draft.words : Math.max(draft.words, typical)
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

/**
 * Confere que o bloco ainda existe e mantém a âncora dentro dele.
 *
 * Só há limite por baixo. Por cima quem fecha é `pixelFromAnchor`, que devolve
 * o fim do bloco quando o deslocamento passa dele — e é preciso ser assim:
 * `wordOffset` está na unidade da régua de rolagem, que com velocidade
 * constante não é o número de palavras do bloco. Limitar aqui pela contagem de
 * palavras puxaria a leitura para trás sem motivo.
 */
export function clampAnchor(blocks: Block[], anchor: Anchor): Anchor | null {
  const block = blocks.find((b) => b.id === anchor.blockId)
  if (!block) return null
  return { blockId: block.id, wordOffset: Math.max(0, anchor.wordOffset) }
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
