/**
 * O cartão de TELA: um fundo que o app desenha, com um recado por cima.
 *
 * A diferença para os outros cartões não é de aparência, é de natureza:
 * imagem e vídeo apontam para um ARQUIVO, e uma tela é só um punhado de
 * números. Disso decorre tudo que ela ganha de graça — não pesa dentro do
 * `.valendo`, não tem vínculo para quebrar, não precisa de miniatura gerada
 * nem de cópia leve para a rede, e a mesma folha de estilo serve para o
 * ladrilho de 176px da gaveta e para uma tela de 55 polegadas.
 *
 * Por isso a decisão do desenho mora AQUI, numa função pura, e não dentro do
 * componente: as três superfícies (transmissão, prévia e página da rede) já
 * são o mesmo `PrompterCanvas`, mas o ladrilho da gaveta e o da coluna de
 * assets não são — e um fundo que se desenha diferente na miniatura e no ar
 * é uma armadilha que só aparece com a câmera ligada.
 */

/** Onde o recado se apoia no quadro. */
export type PosicaoDoRecado = 'topo' | 'meio' | 'pe'

/** O que define o fundo de uma tela. */
export interface FundoDeTela {
  /** cor de partida — sozinha, quando `ate` não existe */
  de: string
  /** segunda cor: a presença dela é o que faz o fundo virar gradiente */
  ate?: string
  /** graus, no sentido do CSS: 0 sobe, 90 vai para a direita */
  angulo?: number
}

/** O recado desenhado sobre o fundo. Sem texto, a tela é só o fundo. */
export interface RecadoDeTela {
  texto: string
  /** proporção da ALTURA do quadro, não pixel: a tela do apresentador e o
      ladrilho da gaveta têm tamanhos muito diferentes, e um corpo em pixel
      sairia gigante num e ilegível no outro */
  corpoPct: number
  cor: string
  posicao: PosicaoDoRecado
}

export const CORPO_MIN = 4
export const CORPO_MAX = 24
export const ANGULO_PADRAO = 135

/** A tela que nasce ao apertar "+ Tela": um azul de estúdio, sem recado. */
export function telaNova(): { fundo: FundoDeTela; recado: RecadoDeTela } {
  return {
    fundo: { de: '#16253f' },
    recado: { texto: '', corpoPct: 11, cor: '#ffffff', posicao: 'meio' }
  }
}

const clamp = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor))

/** Uma cor que o CSS entende, ou o preto — nunca `undefined` na tela. */
function corSegura(valor: unknown): string {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : '#000000'
}

/**
 * O `background` do quadro.
 *
 * Uma cor só sai chapada, e não como um gradiente de uma parada só: chapado
 * é mais barato de compor e é o que o operador pediu quando escolheu chapado.
 */
export function fundoDaTela(fundo: FundoDeTela | undefined): string {
  const de = corSegura(fundo?.de)
  const ate = fundo?.ate
  if (!ate) return de
  // sem `?? ANGULO_PADRAO` um ângulo 0 viraria 135: zero é um ângulo legítimo
  const angulo = Number.isFinite(fundo?.angulo) ? (fundo?.angulo as number) : ANGULO_PADRAO
  return `linear-gradient(${angulo}deg, ${de}, ${corSegura(ate)})`
}

/**
 * Onde o recado se apoia, em `align-items` de um flex vertical.
 *
 * Topo e pé não encostam na borda: o quadro do apresentador quase sempre
 * está atrás de um vidro, e o que fica no último centímetro da tela é o que
 * o vidro come primeiro.
 */
export function apoioDoRecado(posicao: PosicaoDoRecado | undefined): 'flex-start' | 'center' | 'flex-end' {
  if (posicao === 'topo') return 'flex-start'
  if (posicao === 'pe') return 'flex-end'
  return 'center'
}

/**
 * O corpo do recado em pixel, medido contra a ALTURA do quadro.
 *
 * É o que faz o mesmo cartão parecer o mesmo cartão na miniatura de 99px de
 * altura e na saída de 1080 — a proporção é a mesma, o pixel não.
 */
export function corpoDoRecado(corpoPct: number | undefined, alturaDoQuadro: number): number {
  const pct = clamp(Number.isFinite(corpoPct) ? (corpoPct as number) : 11, CORPO_MIN, CORPO_MAX)
  return (alturaDoQuadro * pct) / 100
}
