import type { Apresentador, BlockKind } from './types'

/**
 * Quem fala cada trecho do roteiro, e de que cor.
 *
 * Um roteiro de dois apresentadores traz o nome de quem fala numa linha
 * sozinha, e a fala embaixo:
 *
 *     HARI
 *     E agora The Bear vai pra última temporada...
 *
 * O app NÃO inventa sintaxe para isso — nada de `@HARI` ou marcação nova. O
 * operador registra o nome que já está escrito, e é o casamento com esse texto
 * que decide onde cada cor começa. Assim um `.txt` vindo da redação funciona
 * como veio, sem uma edição sequer.
 *
 * A regra mora aqui, e não nas telas, porque ela vale em DUAS composições
 * diferentes: as linhas compostas da transmissão (quebradas por sentido) e as
 * linhas do editor (quebradas onde o operador digitou). Escrita duas vezes,
 * uma delas divergiria no primeiro ajuste — e a cor do editor deixaria de
 * corresponder à do apresentador.
 */

/**
 * Cores de partida, na ordem em que são oferecidas.
 *
 * Nenhuma é a cor do texto normal nem a de capítulo (âmbar) ou direção (azul):
 * apresentador tem de se distinguir do que já é sistema. Também não há
 * vermelho puro — é a cor de "no ar" em toda a mesa, e um nome vermelho leria
 * como alerta.
 */
export const CORES_DE_APRESENTADOR = ['#7ee0a8', '#8ab4ff', '#f2a3d4', '#ffd479', '#a99bff', '#7fe3e0']

/** A próxima cor livre — só repete quando as seis já estão em uso. */
export function proximaCor(usadas: string[]): string {
  const emUso = new Set(usadas.map((c) => c.toLowerCase()))
  return CORES_DE_APRESENTADOR.find((c) => !emUso.has(c.toLowerCase())) ?? CORES_DE_APRESENTADOR[0]
}

/**
 * A forma comparável de um nome: sem espaço nas pontas, sem caixa.
 *
 * Ignorar a caixa é decisão do operador, e tem razão de ofício: em roteiro o
 * nome vem em maiúscula por convenção, mas ninguém digita sempre igual — e
 * "Hari" e "HARI" são a mesma pessoa na frente da câmera.
 */
export function chaveDoNome(nome: string): string {
  return nome.trim().toLocaleLowerCase()
}

/** Este texto é a deixa de algum apresentador? Devolve qual, ou nada. */
export function apresentadorDaLinha(
  texto: string,
  apresentadores: Apresentador[]
): Apresentador | undefined {
  const chave = chaveDoNome(texto)
  if (chave === '') return undefined
  return apresentadores.find((a) => chaveDoNome(a.nome) === chave)
}

/** O mínimo que a regra precisa saber de uma linha, venha ela de onde vier. */
export interface LinhaPintavel {
  kind: BlockKind
  text: string
  /**
   * De quem é esta fala, quando a composição já sabe.
   *
   * As linhas da SAÍDA chegam carimbadas por `composeLines` — e é o carimbo
   * que sustenta a cor quando a linha do nome foi escondida. As linhas do
   * EDITOR não têm carimbo: lá o nome está sempre visível, e o texto basta.
   */
  dono?: string
}

/**
 * A cor de cada linha, na ordem — `null` onde a cor do apresentador não vale.
 *
 * Três regras, todas pedidas pelo operador:
 *
 * 1. A linha do NOME não recebe a cor do texto: ela é a deixa, e ganha
 *    tratamento próprio na tela (ver `ehDeixa`).
 * 2. Capítulo e direção mantêm as cores que já têm — âmbar e azul —, porque
 *    são do sistema e não de quem fala.
 * 3. E, justamente por serem do sistema, eles NÃO trocam o turno: depois de um
 *    capítulo, quem estava falando continua falando. Só outro nome muda isso.
 */
export function coresDasLinhas(linhas: LinhaPintavel[], apresentadores: Apresentador[]): (string | null)[] {
  if (apresentadores.length === 0) return linhas.map(() => null)

  const porNome = new Map(apresentadores.map((a) => [chaveDoNome(a.nome), a]))
  let corrente: string | null = null

  return linhas.map((linha) => {
    // o carimbo da composição vem primeiro: ele responde mesmo quando a linha
    // do nome não existe mais na saída
    const carimbado = linha.dono ? porNome.get(chaveDoNome(linha.dono)) : undefined
    if (carimbado) corrente = carimbado.cor

    if (linha.kind !== 'speech') return null

    const dono = porNome.get(chaveDoNome(linha.text))
    if (dono) {
      corrente = dono.cor
      // a linha do NOME não recebe a cor do corpo: ela é a deixa, e tem
      // tratamento próprio na tela
      return null
    }
    return corrente
  })
}

/**
 * As deixas como a composição precisa delas: o nome de cada um e se sai da tela.
 *
 * `global` força todos, como o OVERLAY dos cartões: ligado, os interruptores
 * individuais ficam travados e acesos; desligado, cada apresentador decide
 * sozinho pelo próprio `oculto`.
 */
export function deixasDaSaida(
  apresentadores: Apresentador[],
  global: boolean
): { nome: string; oculto: boolean }[] {
  return apresentadores.map((a) => ({ nome: a.nome, oculto: global || (a.oculto ?? false) }))
}

/** Esta linha é a deixa de um apresentador? Serve para desenhá-la diferente. */
export function ehDeixa(linha: LinhaPintavel, apresentadores: Apresentador[]): Apresentador | undefined {
  if (linha.kind !== 'speech') return undefined
  return apresentadorDaLinha(linha.text, apresentadores)
}

/**
 * O nome deste apresentador ainda existe no roteiro?
 *
 * Editar "HARI" para "HARI OLIVEIRA" no texto desfaz o casamento em silêncio:
 * a cor simplesmente some, e não há como adivinhar por quê. O chip nos Ajustes
 * usa esta resposta para acusar o par perdido — e aí o RELINK reaponta o mesmo
 * apresentador (mesma cor, mesmo id) para o nome novo.
 */
export function temParNoRoteiro(textos: string[], apresentador: Apresentador): boolean {
  const chave = chaveDoNome(apresentador.nome)
  return textos.some((t) => chaveDoNome(t) === chave)
}

/**
 * Todas as linhas que podem ser deixa, para conferir os pares.
 *
 * QUALQUER linha de um parágrafo de fala, não só a primeira: quem escreve
 * roteiro de dois apresentadores encadeia as falas no mesmo parágrafo, e a
 * troca de turno no meio dele é legítima —
 *
 *     HARI
 *     Faz sentido?
 *     ROBSON
 *     Faz.
 *
 * é um parágrafo só, com duas deixas dentro. Aceitar só a primeira linha
 * deixaria o ROBSON sem cor.
 */
export function linhasCandidatas(blocos: { kind: BlockKind; text: string }[]): string[] {
  const fora: string[] = []
  for (const b of blocos) {
    if (b.kind !== 'speech') continue
    for (const linha of b.text.split('\n')) fora.push(linha)
  }
  return fora
}
