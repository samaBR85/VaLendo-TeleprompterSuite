import type { Anchor, Block, BlockKind, PacingRule } from './types'
import { senseLines } from './senseLines'
import { chaveDoNome } from './apresentadores'
import { marcasDaFatia, type Marca } from './marcas'
import { blockWordCount, words } from './text'

/**
 * Onde cada linha composta começa e termina DENTRO do texto de origem.
 *
 * `senseLines` devolve as linhas já montadas — palavras juntadas por um espaço
 * —, e o texto que sai pode não ser um recorte literal do que entrou: dois
 * espaços seguidos no original viram um só. Procurar a linha pronta com um
 * `indexOf` erraria nesses casos, e o erro apareceria como palavra pintada
 * fora do lugar.
 *
 * Por isso a conta é feita PALAVRA a palavra: cada uma é um recorte literal da
 * origem, e elas aparecem lá na mesma ordem. O começo da linha é onde cai a
 * primeira, o fim é onde acaba a última, e o que houver de espaço entre elas
 * fica dentro da fatia — que é o certo, porque é o que a linha ocupa.
 */
function fatiasDasLinhas(origem: string, linhas: string[]): { de: number; ate: number }[] {
  const fora: { de: number; ate: number }[] = []
  let cursor = 0
  for (const linha of linhas) {
    const palavras = words(linha)
    let de = -1
    let ate = cursor
    for (const palavra of palavras) {
      const onde = origem.indexOf(palavra, cursor)
      if (onde === -1) break
      if (de === -1) de = onde
      ate = onde + palavra.length
      cursor = ate
    }
    fora.push({ de: de === -1 ? cursor : de, ate })
  }
  return fora
}

/** Linha composta, ainda sem geometria. */
export interface LineSpec {
  blockId: string
  kind: BlockKind
  text: string
  /**
   * Cor e formatação desta LINHA, com os índices contados a partir dela.
   *
   * A marca é guardada por bloco, e um bloco vira várias linhas — então uma
   * palavra pintada em cima de uma quebra precisa aparecer nas duas metades,
   * cada uma medida da sua própria linha. Recortar aqui, na composição, é o
   * que garante isso nas TRÊS telas de uma vez: elas desenham todas a partir
   * desta mesma lista.
   */
  marcas?: Marca[]
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
  /**
   * De quem é esta fala, quando o roteiro tem apresentadores.
   *
   * Carimbado na composição, e não descoberto depois lendo o texto: a linha
   * do nome pode ter sido ESCONDIDA da saída, e aí não sobra nada para ler —
   * era exatamente assim que a cor se perdia ao ligar o HIDE. Aqui a resposta
   * viaja com a linha, escondida ou não.
   */
  dono?: string
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
  dono?: string
  marcas?: Marca[]
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
/** As marcas de um pedaço, ou nada — linha sem marca não carrega o campo. */
function recorte(marcas: Marca[] | undefined, de: number, ate: number): { marcas?: Marca[] } {
  if (!marcas || marcas.length === 0) return {}
  const fatia = marcasDaFatia(marcas, de, ate)
  return fatia.length > 0 ? { marcas: fatia } : {}
}

export function composeLines(blocks: Block[], rule: PacingRule, rows?: MeasuredRows): LineSpec[] {
  const drafts: LineDraft[] = []
  // as deixas por nome comparável — sem caixa, como em todo o resto
  const deixas = new Map(rule.deixas.map((d) => [chaveDoNome(d.nome), d]))
  let previous: Block | null = null
  /* quem está falando agora. Atravessa parágrafos e sobrevive a capítulo e
     direção — eles interrompem o roteiro, não o turno de quem fala. */
  let dono: string | undefined

  for (const block of blocks) {
    // a linha em branco que separa dois parágrafos no editor é diagramação:
    // o operador abriu respiro ali de propósito, e ele precisa existir na tela
    // do apresentador. Fica presa ao bloco anterior para que saltar para um
    // capítulo ou marcador caia no texto, não no branco acima dele
    if (previous) {
      /*
       * TANTOS espaçadores quanto o operador pulou. Ele digita três linhas em
       * branco para afastar um assunto do outro, e até aqui as três viravam
       * uma só na tela do apresentador — o afastamento existia no editor e
       * sumia justo onde ele importa.
       *
       * `respiros` ausente é uma linha, que é o caso de sempre e de todo
       * `.valendo` gravado antes disto.
       */
      for (let i = 0; i < (previous.respiros ?? 1); i += 1) {
        drafts.push({ blockId: previous.id, kind: previous.kind, text: '', words: 0, spacer: true, dono })
      }
    }
    previous = block

    if (block.kind === 'speech') {
      // a quebra de linha que o operador digitou é respeitada: ele a colocou
      // ali de propósito, para marcar respiração ou ênfase. A regra de
      // palavras por linha só entra depois, para dividir o que sobrou comprido
      /*
       * O nome de quem fala pode sair da saída — e sair de VERDADE, não virar
       * linha em branco: uma linha invisível continuaria pesando na régua (a
       * medição faz `Math.max(1, …)`), e a leitura ficaria parada o tempo de
       * uma linha inteira a cada troca de apresentador.
       *
       * Some da COMPOSIÇÃO, nunca do texto: o roteiro guardado não muda uma
       * letra, e desligar o interruptor traz o nome de volta na hora.
       *
       * A não ser que sobrasse um bloco VAZIO — um parágrafo que só tem o nome,
       * sem fala embaixo. Ele deixaria de produzir qualquer linha, e as âncoras
       * que apontam para ele ficariam sem destino. Melhor um nome visível do
       * que uma âncora órfã.
       */
      const digitadas = block.text.split('\n')
      const escondida = (typed: string): boolean => deixas.get(chaveDoNome(typed))?.oculto === true
      const sobraAlgo = digitadas.some((typed) => !escondida(typed))

      // onde cada linha DIGITADA começa dentro do bloco. Sobe sempre, mesmo
      // nas escondidas: o `continue` pula o desenho, não a régua
      let base = 0
      for (const typed of digitadas) {
        const aqui = base
        // +1 pela quebra de linha que o `split` comeu
        base += typed.length + 1

        // a deixa manda no turno mesmo quando não vai ser desenhada
        const quem = deixas.get(chaveDoNome(typed))
        if (quem) dono = quem.nome
        if (quem?.oculto && sobraAlgo) continue

        const compostas = senseLines(typed, rule)
        const fatias = fatiasDasLinhas(typed, compostas)
        compostas.forEach((text, i) => {
          const fatia = fatias[i]
          drafts.push({
            blockId: block.id,
            kind: block.kind,
            text,
            words: words(text).length,
            dono,
            ...recorte(block.marcas, aqui + fatia.de, aqui + fatia.ate)
          })
        })
      }
    } else {
      drafts.push({
        blockId: block.id,
        kind: block.kind,
        text: block.text,
        words: words(block.text).length,
        dono,
        ...recorte(block.marcas, 0, block.text.length)
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
      // sem esta linha as marcas morriam aqui, caladas: o LineSpec é montado
      // campo a campo, e um `...spread` não dispara o aviso de propriedade a
      // mais do compilador. Quem pegou foi o teste
      ...(draft.marcas ? { marcas: draft.marcas } : {}),
      wordCount,
      blockWordStart: blockWords,
      wordStart: globalWords,
      ...(draft.spacer ? { spacer: true } : {}),
      ...(draft.dono ? { dono: draft.dono } : {})
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

/**
 * Traduz uma âncora da régua de rolagem para PALAVRAS DE VERDADE dentro do
 * bloco.
 *
 * As duas coisas se parecem e não são a mesma: `wordOffset` vem em unidades da
 * régua, e com `uniformSpeed` (o padrão) cada linha pesa o mesmo,
 * independentemente de ter duas palavras ou dez. Quem precisa apontar a
 * palavra no TEXTO — o editor seguindo a leitura — não pode usar esse número
 * cru: ele estoura o parágrafo e a marca cai sempre na última linha.
 *
 * A conversão é por linha, que é a unidade que os dois lados entendem: acha em
 * qual linha do bloco a âncora caiu, soma as palavras reais das linhas
 * anteriores e avança dentro dela na mesma proporção. Com `uniformSpeed`
 * desligado a proporção é 1:1 e a conta devolve a palavra exata.
 */
export function ancoraEmPalavrasReais(lines: LineSpec[], anchor: Anchor): Anchor {
  const owned = linesOfBlock(lines, anchor.blockId)
  if (owned.length === 0) return anchor

  let reais = 0
  for (const line of owned) {
    if (line.wordCount === 0) continue
    if (anchor.wordOffset < line.blockWordStart + line.wordCount) {
      const fracao = (anchor.wordOffset - line.blockWordStart) / line.wordCount
      return { blockId: anchor.blockId, wordOffset: reais + Math.floor(fracao * words(line.text).length) }
    }
    reais += words(line.text).length
  }
  return { blockId: anchor.blockId, wordOffset: reais }
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
