import { edicaoEntre, remapearMarcas, type Marca } from './marcas'
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

/**
 * Esta linha já é um título de capítulo?
 *
 * Pergunta feita com a MESMA régua da leitura — de `#` a `######` —, e não só
 * com o `##` que o botão escreve. Um roteiro importado de outro lugar pode
 * trazer `# ABERTURA`, e para quem lê aquilo já é capítulo: o botão tem de
 * concordar com o que a tela mostra, não com o que ele mesmo teria escrito.
 */
export function ehLinhaDeCapitulo(linha: string): boolean {
  return CHAPTER_RE.test(linha.trim())
}

/** A mesma linha sem a marca, preservando o recuo que houver. */
export function semMarcaDeCapitulo(linha: string): string {
  return linha.replace(/^(\s*)#{1,6}\s+/, '$1')
}

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
  /** linhas em branco entre este parágrafo e o seguinte; 1 é o respiro normal */
  respiros: number
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
  /*
   * O `split` guarda o separador (grupo de captura) e por isso os separadores
   * chegam intercalados com os parágrafos — dá para MEDIR o respiro sem uma
   * segunda varredura. Um separador de N quebras são N-1 linhas em branco:
   * `\n\n` é uma linha vazia entre dois parágrafos, que é o respiro normal.
   */
  for (const chunk of text.replace(/\r\n?/g, '\n').split(/(\n{2,})/)) {
    if (chunk.trim().length > 0) spans.push({ text: chunk, start: offset, respiros: 1 })
    else if (chunk.length > 1 && spans.length > 0) spans[spans.length - 1].respiros = chunk.length - 1
    offset += chunk.length
  }
  return spans
}

function splitParagraphs(text: string): string[] {
  return paragraphSpans(text).map((span) => span.text)
}

/** O respiro só é gravado quando é MAIOR que o normal — o `.valendo` não engorda à toa. */
function comRespiros(respiros: number): { respiros?: number } {
  return respiros > 1 ? { respiros } : {}
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
 *
 * As MARCAS de cor e formatação viajam por aqui pelo mesmo caminho do id, e é
 * de propósito: elas são presas ao bloco, então o lugar certo de carregá-las
 * de um texto para o outro é exatamente onde se decide qual bloco novo é a
 * continuação de qual bloco velho. Em qualquer outro lugar seria preciso
 * refazer esta mesma conta de casamento — e as duas divergiriam no primeiro
 * ajuste.
 *
 * Parágrafo intocado leva as marcas como estão; parágrafo editado leva as
 * marcas remapeadas pela edição que aconteceu DENTRO dele. Parágrafo que
 * nasceu agora não tem marca — não havia de onde herdar.
 *
 * O caso que se perde: juntar dois parágrafos apagando a linha em branco entre
 * eles. O resultado casa por similaridade com UM dos dois, e as marcas do
 * outro somem. É aceito — recuperar isso exigiria casar um bloco novo com
 * dois velhos, e o `Ctrl+Z` devolve.
 */
/** Bloco sem marca nenhuma não carrega o campo — o `.valendo` não engorda à toa. */
function comMarcas(marcas: Marca[] | undefined): { marcas?: Marca[] } {
  return marcas && marcas.length > 0 ? { marcas } : {}
}

export function reconcileBlocks(previous: Block[], text: string): Block[] {
  const spans = paragraphSpans(text)
  const paragraphs = spans.map((s) => s.text)
  /* o respiro vem do TEXTO, nunca do bloco antigo: é diagramação de agora, e
     quem acabou de apagar duas linhas em branco espera que elas sumam */
  const respiro = (i: number): { respiros?: number } => comRespiros(spans[i]?.respiros ?? 1)
  const used = new Set<string>()
  const result: (Block | null)[] = paragraphs.map(() => null)

  // 1. mesma posição e mesmo texto — o caso mais comum, e o mais barato
  paragraphs.forEach((p, i) => {
    const old = previous[i]
    if (old && old.text === p && !used.has(old.id)) {
      used.add(old.id)
      result[i] = { id: old.id, kind: classify(p), text: p, ...comMarcas(old.marcas), ...respiro(i) }
    }
  })

  // 2. texto idêntico em outra posição — parágrafo movido
  paragraphs.forEach((p, i) => {
    if (result[i]) return
    const old = previous.find((b) => b.text === p && !used.has(b.id))
    if (old) {
      used.add(old.id)
      result[i] = { id: old.id, kind: classify(p), text: p, ...comMarcas(old.marcas), ...respiro(i) }
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
      // o parágrafo mudou: as marcas dele mudam junto, pela edição que
      // aconteceu aqui dentro
      const edicao = edicaoEntre(best.block.text, p)
      const marcas = best.block.marcas?.length
        ? remapearMarcas(best.block.marcas, edicao ? [edicao] : [])
        : undefined
      result[i] = { id: best.block.id, kind: classify(p), text: p, ...comMarcas(marcas), ...respiro(i) }
    }
  })

  return paragraphs.map((p, i) => result[i] ?? { id: newId(), kind: classify(p), text: p, ...respiro(i) })
}

/**
 * Blocos de volta a texto, RESPEITANDO o respiro de cada um.
 *
 * O separador entre dois blocos é `respiros + 1` quebras de linha: uma linha
 * em branco — o caso de sempre — são duas quebras. Sem isto a ida e volta
 * achatava três linhas em branco numa só, e o editor apagaria a diagramação do
 * operador na cara dele toda vez que o texto passasse por aqui.
 */
export function serializeBlocks(blocks: Block[]): string {
  return blocks
    .map((b, i) => (i === 0 ? b.text : '\n'.repeat((blocks[i - 1].respiros ?? 1) + 1) + b.text))
    .join('')
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
/** Um pedaço de um bloco, nas coordenadas DELE. */
export interface FatiaDeBloco {
  blockId: string
  de: number
  ate: number
}

/**
 * Reparte um trecho do texto INTEIRO nas fatias de cada bloco que ele cruza.
 *
 * O editor trabalha no texto inteiro — a seleção que o operador faz com o mouse
 * vai de um número a outro do roteiro todo. As marcas, não: elas moram DENTRO
 * de um bloco, com índices contados a partir dele. Alguém tem de traduzir, e é
 * esta função.
 *
 * Usa a mesma `paragraphSpans` de `anchorFromCaret` de propósito: se um dia a
 * forma de partir o texto em parágrafos mudar, as duas mudam juntas. Cada uma
 * com a sua cópia da conta seria a receita para a marca e a âncora
 * discordarem sobre onde começa o segundo parágrafo.
 *
 * O que fica ENTRE dois parágrafos — a linha em branco que os separa — não
 * pertence a bloco nenhum, e simplesmente não entra em fatia nenhuma.
 */
export function fatiasPorBloco(blocks: Block[], de: number, ate: number): FatiaDeBloco[] {
  if (ate <= de) return []
  const spans = paragraphSpans(serializeBlocks(blocks))
  const fora: FatiaDeBloco[] = []

  spans.forEach((span, i) => {
    const bloco = blocks[i]
    if (!bloco) return
    const inicio = Math.max(span.start, de)
    const fim = Math.min(span.start + span.text.length, ate)
    if (fim <= inicio) return
    fora.push({ blockId: bloco.id, de: inicio - span.start, ate: fim - span.start })
  })

  return fora
}

/**
 * O caminho de volta: as marcas de todos os blocos, nas coordenadas do texto
 * INTEIRO.
 *
 * É o que o editor precisa para desenhar. Ele trabalha numa string só — a
 * mesma que o `textarea` mostra —, então uma marca guardada como "do 2 ao 6 do
 * terceiro parágrafo" não lhe serve de nada até virar "do 118 ao 122".
 *
 * Espelho exato de `fatiasPorBloco`, e pela mesma `paragraphSpans`: as duas
 * traduzem entre os mesmos dois sistemas de coordenadas, em direções opostas.
 * Uma conta própria aqui seria a receita para o editor pintar meia palavra ao
 * lado do que a transmissão pinta.
 */
export function marcasNoTexto(blocks: Block[]): Marca[] {
  const spans = paragraphSpans(serializeBlocks(blocks))
  const fora: Marca[] = []
  spans.forEach((span, i) => {
    for (const marca of blocks[i]?.marcas ?? []) {
      fora.push({ ...marca, de: span.start + marca.de, ate: span.start + marca.ate })
    }
  })
  return fora
}

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
