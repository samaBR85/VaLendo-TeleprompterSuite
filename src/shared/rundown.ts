import type { LineSpec } from './anchor'
import { totalWords } from './anchor'
import { chapterTitle, totalWordCount } from './text'
import type { Block, Marker } from './types'

/** Um marcador dentro de um trecho, com a posição dele na régua de rolagem. */
export interface RundownMarker {
  marker: Marker
  /** mesma unidade de `LineSpec.wordStart` — onde este marcador cai na régua */
  rulerStart: number
}

export interface Segment {
  /**
   * Bloco pelo qual se navega até este trecho — o próprio capítulo, ou o
   * primeiro bloco do roteiro quando ele começa sem um capítulo. Nunca nulo:
   * saltar para um trecho é sempre `{ blockId, wordOffset: 0 }`, o mesmo
   * mecanismo que "próximo capítulo" já usa.
   */
  blockId: string
  /** vazio quando o roteiro começa sem capítulo — quem desenha decide o rótulo */
  title: string
  /** início deste trecho na régua de rolagem */
  rulerStart: number
  /** quanto da régua este trecho ocupa — nunca negativo */
  rulerSpan: number
  /** palavras de fato faladas neste trecho; direção e capítulo não contam */
  spokenWords: number
  markers: RundownMarker[]
}

/**
 * Corta o roteiro em trechos por capítulo, para o rundown e a linha do tempo.
 *
 * Cada `§` já delimita um trecho — nada novo para o operador escrever. A
 * duração de cada um sai da mesma régua que já governa a rolagem (`lines`,
 * vinda de `composeLines`), não de uma conta paralela: é a garantia de que o
 * tempo mostrado aqui bate com o tempo que a rolagem de verdade vai levar.
 *
 * A posição de um marcador na régua é a do início do bloco em que ele está —
 * não uma posição própria, porque marcador nunca teve uma: saltar para um
 * marcador sempre pousou no começo do bloco (`marker.next`, `marker.goto.N`),
 * então é essa a posição que a linha do tempo também usa. Inventar uma
 * distância própria dentro do bloco exigiria um campo que não existe.
 */
export function buildRundown(blocks: Block[], lines: LineSpec[], markers: Marker[]): Segment[] {
  if (blocks.length === 0) return []

  const rulerStartByBlock = new Map<string, number>()
  for (const line of lines) {
    // o marcador de vão entre dois blocos carrega o id do bloco ANTERIOR; sem
    // pular ele, um bloco vazio registraria a posição do vão como se fosse a
    // própria, quando o correto é procurar uma linha de conteúdo de verdade
    if (line.spacer) continue
    if (!rulerStartByBlock.has(line.blockId)) rulerStartByBlock.set(line.blockId, line.wordStart)
  }

  const boundaries: { blockIndex: number; blockId: string; title: string }[] = []
  blocks.forEach((block, index) => {
    if (block.kind === 'chapter') boundaries.push({ blockIndex: index, blockId: block.id, title: chapterTitle(block) })
  })

  // roteiro que começa com fala antes do primeiro capítulo (ou sem capítulo
  // nenhum) ainda precisa de um primeiro trecho — sem título, porque não há
  // um `§` para tirar um
  if (boundaries.length === 0 || boundaries[0].blockIndex > 0) {
    boundaries.unshift({ blockIndex: 0, blockId: blocks[0].id, title: '' })
  }

  const total = totalWords(lines)

  return boundaries.map((boundary, i) => {
    const nextBoundary = boundaries[i + 1]
    const nextBlockIndex = nextBoundary?.blockIndex ?? blocks.length
    const slice = blocks.slice(boundary.blockIndex, nextBlockIndex)
    const sliceIds = new Set(slice.map((b) => b.id))

    const rulerStart = rulerStartByBlock.get(boundary.blockId) ?? 0
    const rulerEnd = nextBoundary ? (rulerStartByBlock.get(nextBoundary.blockId) ?? total) : total

    const segmentMarkers: RundownMarker[] = markers
      .filter((m) => sliceIds.has(m.blockId))
      .map((m) => ({ marker: m, rulerStart: rulerStartByBlock.get(m.blockId) ?? rulerStart }))

    return {
      blockId: boundary.blockId,
      title: boundary.title,
      rulerStart,
      rulerSpan: Math.max(0, rulerEnd - rulerStart),
      spokenWords: totalWordCount(slice),
      markers: segmentMarkers
    }
  })
}

/** Em qual trecho a régua está agora — o último cujo início é menor ou igual à posição. */
export function segmentIndexAt(segments: Segment[], rulerPosition: number): number {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (rulerPosition >= segments[i].rulerStart) return i
  }
  return 0
}
