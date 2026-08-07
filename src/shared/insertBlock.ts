import { CHAPTER_MARK, ehLinhaDeCapitulo, semMarcaDeCapitulo } from './text'

export type InsertKind = 'chapter' | 'direction'

export interface InsertResult {
  text: string
  /** miolo do bloco já selecionado, para o operador digitar por cima */
  selectionStart: number
  selectionEnd: number
}

export const PLACEHOLDERS: Record<InsertKind, string> = {
  chapter: 'Título do capítulo',
  direction: 'direção de cena'
}

/**
 * Insere um capítulo ou uma direção no ponto do cursor.
 *
 * O classificador de blocos trabalha por parágrafo, e parágrafo é o que está
 * entre linhas em branco. Sem garantir essas fronteiras, "## Título" enfiado no
 * meio de um parágrafo continuaria sendo texto falado — apareceria a marcação
 * na tela do apresentador em vez de virar um capítulo. Por isso as linhas em
 * branco ao redor são acrescentadas só quando ainda não existem.
 */
export function insertBlock(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: InsertKind
): InsertResult {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))

  const selected = value.slice(start, end).trim()
  const content = selected.length > 0 ? selected : PLACEHOLDERS[kind]
  const block = kind === 'chapter' ? `${CHAPTER_MARK} ${content}` : `[${content}]`

  const before = value.slice(0, start)
  const after = value.slice(end)

  const prefix = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = after.length === 0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'

  // pula o colchete ou o "## " antes do miolo: o cursor precisa cair no texto,
  // não na marcação
  const contentOffset = kind === 'chapter' ? CHAPTER_MARK.length + 1 : 1
  const contentStart = before.length + prefix.length + contentOffset

  return {
    text: before + prefix + block + suffix + after,
    selectionStart: contentStart,
    selectionEnd: contentStart + content.length
  }
}

/**
 * O botão de capítulo sobre um capítulo TIRA o capítulo.
 *
 * Antes ele só sabia acrescentar: apertar sobre uma linha que já era título
 * escrevia `## ## (BEAT)` — a marca em cima da marca, e o título saía com um
 * `##` visível na tela do apresentador. Um botão que só sabe pôr obriga a
 * desfazer no braço, apagando dois caracteres com o cursor, no meio de um
 * roteiro que pode estar no ar.
 *
 * Devolve `null` quando não há o que tirar, e é isso que o chamador usa para
 * cair no caminho de inserir. A decisão é por LINHA e não pelo texto
 * selecionado: o operador tanto seleciona o título inteiro (com o `##` junto,
 * porque ele está ali na tela) quanto só clica no meio dele, e as duas coisas
 * têm de significar a mesma.
 *
 * Numa seleção de várias linhas, todas as que têm texto precisam ser capítulo.
 * Uma seleção que mistura título e fala não é "desfazer capítulo" — é uma
 * seleção que pegou demais, e ali o certo é o comportamento de sempre.
 */
export function tirarCapitulo(value: string, selectionStart: number, selectionEnd: number): InsertResult | null {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))

  // as linhas que a seleção encosta, inteiras — o `+1` pula o `\n` achado
  const inicio = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const achado = value.indexOf('\n', end)
  const fim = achado === -1 ? value.length : achado

  const linhas = value.slice(inicio, fim).split('\n')
  const comTexto = linhas.filter((l) => l.trim() !== '')
  if (comTexto.length === 0 || !comTexto.every(ehLinhaDeCapitulo)) return null

  const limpas = linhas.map((l) => (l.trim() === '' ? l : semMarcaDeCapitulo(l))).join('\n')

  return {
    text: value.slice(0, inicio) + limpas + value.slice(fim),
    // o que sobrou fica selecionado: mostra o que mudou, e apertar o botão de
    // novo devolve o capítulo — o gesto é reversível nos dois sentidos
    selectionStart: inicio,
    selectionEnd: inicio + limpas.length
  }
}

/**
 * As bordas do PARÁGRAFO que a seleção encosta — o que está entre linhas em
 * branco.
 *
 * É a unidade da direção, e não a linha: o classificador entende `[...]` como
 * direção olhando o parágrafo inteiro, então uma direção pode ocupar três
 * linhas com o colchete só na primeira e na última. Tirar por linha deixaria
 * meia direção no roteiro.
 */
function limitesDoParagrafo(value: string, start: number, end: number): [number, number] {
  let inicio = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const primeiroFim = value.indexOf('\n', end)
  let fim = primeiroFim === -1 ? value.length : primeiroFim

  while (inicio > 0) {
    const anteriorFim = inicio - 1
    const anteriorInicio = value.lastIndexOf('\n', anteriorFim - 1) + 1
    if (value.slice(anteriorInicio, anteriorFim).trim() === '') break
    inicio = anteriorInicio
  }

  while (fim < value.length) {
    const seguinteInicio = fim + 1
    const achado = value.indexOf('\n', seguinteInicio)
    const seguinteFim = achado === -1 ? value.length : achado
    if (value.slice(seguinteInicio, seguinteFim).trim() === '') break
    fim = seguinteFim
  }

  return [inicio, fim]
}

/**
 * O botão de direção sobre uma direção TIRA os colchetes.
 *
 * O mesmo defeito do capítulo, no vizinho: apertar de novo escrevia
 * `[[entra o VT]]`. Só que a unidade aqui é o parágrafo, não a linha — ver
 * `limitesDoParagrafo`.
 *
 * Devolve `null` quando não há o que tirar, e o chamador cai no inserir.
 */
export function tirarDirecao(value: string, selectionStart: number, selectionEnd: number): InsertResult | null {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))
  const [inicio, fim] = limitesDoParagrafo(value, start, end)

  const trecho = value.slice(inicio, fim)
  const miolo = trecho.trim()
  // a mesma prova que o classificador faz para chamar aquilo de direção
  if (!/^\[[\s\S]*\]$/.test(miolo)) return null

  const semColchetes = miolo.slice(1, -1).trim()
  if (semColchetes === '') return null

  const recuo = trecho.length - trecho.trimStart().length
  const de = inicio + recuo

  return {
    text: value.slice(0, de) + semColchetes + value.slice(de + miolo.length),
    selectionStart: de,
    selectionEnd: de + semColchetes.length
  }
}

/** Sobre um bloco do mesmo tipo, o botão desfaz. `null` quando não há o que desfazer. */
export function tirarBloco(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: InsertKind
): InsertResult | null {
  return kind === 'chapter'
    ? tirarCapitulo(value, selectionStart, selectionEnd)
    : tirarDirecao(value, selectionStart, selectionEnd)
}

/**
 * Transforma em capítulo TODA linha cujo texto inteiro é igual ao selecionado.
 *
 * O caso que isto resolve: um roteiro com "BLOCO 1", "BLOCO 2", "INTERVALO"
 * repetidos ao longo de meia hora. Marcar um a um é trabalho de rolar o
 * roteiro inteiro procurando com o olho — e o olho pula um.
 *
 * "Linha inteira" é a regra, e é restritiva de propósito: só entra a linha em
 * que o termo está SOZINHO. Uma palavra no meio de uma fala nunca vira título
 * por acidente, por mais que se repita.
 *
 * A linha em branco antes e depois não é enfeite. O classificador trabalha por
 * PARÁGRAFO — o que está entre linhas em branco —, então um `##` encravado no
 * meio de um parágrafo continuaria sendo fala, e a marcação apareceria na tela
 * do apresentador em vez de virar capítulo. Elas só entram onde ainda não
 * existem.
 *
 * Idempotente de graça: uma linha que já é `## BLOCO 1` tem texto
 * `"## BLOCO 1"`, que não é igual a `"BLOCO 1"` — ela nem chega a ser
 * candidata. Rodar duas vezes dá o mesmo resultado.
 */
export function capitularLinhasIguais(texto: string, termo: string): string {
  const alvo = termo.trim()
  // termo de mais de uma linha nunca é "uma linha inteira" — e o silêncio aqui
  // é melhor que uma marcação criativa em cima de uma seleção que o operador
  // fez por engano arrastando demais
  if (alvo === '' || alvo.includes('\n')) return texto

  const linhas = texto.split('\n')
  const fora: string[] = []
  for (let i = 0; i < linhas.length; i += 1) {
    if (linhas[i].trim() !== alvo) {
      fora.push(linhas[i])
      continue
    }
    if (fora.length > 0 && fora[fora.length - 1].trim() !== '') fora.push('')
    fora.push(`${CHAPTER_MARK} ${alvo}`)
    if (i + 1 < linhas.length && linhas[i + 1].trim() !== '') fora.push('')
  }
  return fora.join('\n')
}

/** Quantas linhas o "todos" pegaria — o número que o menu mostra antes de agir. */
export function contarLinhasIguais(texto: string, termo: string): number {
  const alvo = termo.trim()
  if (alvo === '' || alvo.includes('\n')) return 0
  return texto.split('\n').filter((l) => l.trim() === alvo).length
}
