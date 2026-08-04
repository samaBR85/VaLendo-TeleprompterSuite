import type { Anchor, Block, BlockKind } from './types'

/**
 * A marca que o app **escreve** ao abrir um capítulo.
 *
 * Era `§` até a versão 173 — impossível de digitar em teclado normal. Agora é
 * `##`, que é Shift+3 duas vezes em qualquer layout, e de brinde é o mesmo
 * cabeçalho do Markdown, então roteiro colado de fora já chega marcado.
 */
export const CHAPTER_MARK = '##'

/**
 * Toda marca de capítulo ACEITA na leitura: de `#` a `######`.
 *
 * O `§` NÃO entra — foi decisão explícita do operador de não arrastar a forma
 * antiga. Um roteiro escrito antes da 173 abre com os títulos virando fala.
 */
const CHAPTER_RE = /^#{1,6}\s+/

export function words(text: string): string[] {
  return text.trim().length === 0 ? [] : text.trim().split(/\s+/)
}

export function blockWordCount(block: Block): number {
  return block.kind === 'speech' ? words(block.text).length : 0
}

/**
 * Só fala conta tempo; direções e títulos de capítulo ficam fora.
 *
 * E o NOME de quem fala também, quando há apresentadores registrados: "HARIANE"
 * está escrito no roteiro para o operador saber de quem é a fala, mas ninguém
 * o diz em voz alta. Contado, ele inflava a duração estimada — e o erro crescia
 * com o número de trocas de turno, que num roteiro de dois é a cada parágrafo.
 */
export function totalWordCount(blocks: Block[], nomes: string[] = []): number {
  const deixas = new Set(nomes.map((n) => n.trim().toLocaleLowerCase()))
  let n = 0
  for (const b of blocks) {
    if (b.kind !== 'speech' || deixas.size === 0) {
      n += blockWordCount(b)
      continue
    }
    for (const linha of b.text.split('\n')) {
      if (deixas.has(linha.trim().toLocaleLowerCase())) continue
      n += words(linha).length
    }
  }
  return n
}

function classify(paragraph: string): BlockKind {
  const t = paragraph.trim()
  if (/^\[[\s\S]*\]$/.test(t)) return 'direction'
  if (CHAPTER_RE.test(t)) return 'chapter'
  return 'speech'
}

export function chapterTitle(block: Block): string {
  return block.text.replace(CHAPTER_RE, '').trim()
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
 * Tira a marcação e devolve o texto simples: sem o `##` de capítulo e sem os
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
      if (CHAPTER_RE.test(limpo)) return limpo.replace(CHAPTER_RE, '')
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

/**
 * O caminho de volta: onde, no texto do editor, está a palavra que a
 * transmissão está lendo agora.
 *
 * A inversa exata de `anchorFromCaret`, e mora coladinha nela de propósito —
 * as duas leem a mesma `paragraphSpans` e a mesma reconciliação de ids, então
 * qualquer mudança na forma de partir o texto move as duas juntas. Separadas,
 * uma passaria a apontar meio parágrafo adiante da outra sem ninguém notar.
 *
 * Devolve o começo da palavra, não o fim: é ali que a marca do editor pousa, e
 * é o que faz "seguir a leitura" mostrar a palavra que está sendo dita em vez
 * da seguinte.
 */
export function caretFromAnchor(previousBlocks: Block[], text: string, anchor: Anchor): number | null {
  const spans = paragraphSpans(text)
  if (spans.length === 0) return null

  const index = reconcileBlocks(previousBlocks, text).findIndex((b) => b.id === anchor.blockId)
  const span = index === -1 ? undefined : spans[index]
  // bloco que não existe mais neste texto: melhor não mexer em nada do que
  // pousar a marca num parágrafo qualquer
  if (!span) return null

  if (anchor.wordOffset <= 0) return span.start

  /*
   * Anda `wordOffset` palavras contando os espaços do jeito que estão.
   *
   * `words()` normaliza (corta e colapsa espaço), então não dá para somar
   * comprimentos: dois espaços entre palavras, ou uma quebra de linha no meio
   * do parágrafo, deslocariam a conta e a marca cairia adiante do lugar. Aqui
   * a varredura é sobre o texto ORIGINAL, que é onde o cursor mora.
   */
  const parte = /\S+/g
  let achadas = 0
  let match: RegExpExecArray | null
  while ((match = parte.exec(span.text)) !== null) {
    if (achadas === anchor.wordOffset) return span.start + match.index
    achadas += 1
  }
  // pediram uma palavra além do fim do parágrafo — pousa no fim dele
  return span.start + span.text.length
}
