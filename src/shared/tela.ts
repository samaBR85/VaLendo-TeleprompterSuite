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

/**
 * Alinhamento do parágrafo dentro do recado.
 *
 * Os mesmos três valores de `Appearance.align`, e de propósito: são os
 * valores que o CSS entende em `text-align`, então não há tradução no meio
 * do caminho onde errar, e os rótulos dos 6 idiomas já existem.
 */
export type AlinhamentoDoRecado = 'left' | 'center' | 'right'

/**
 * Os seis fundos que se mexem.
 *
 * Seis, e não um editor de efeitos: o operador está ali para conduzir um
 * programa. Todos são lentos de propósito — um fundo apressado atrás de um
 * recado briga com quem está lendo, e o cartão existe para ser lido.
 */
export type AnimacaoDeFundo = 'deriva' | 'respiro' | 'varredura' | 'ondas' | 'barras' | 'poeira'

export const ANIMACOES: AnimacaoDeFundo[] = [
  'deriva',
  'respiro',
  'varredura',
  'ondas',
  'barras',
  'poeira'
]

/** Quantas peças cada efeito que não cabe em pseudo-elemento precisa. */
export const BARRAS = 18

/**
 * Os atrasos de cada ponto da Poeira, embaralhados à mão.
 *
 * A primeira versão calculava o atraso a partir do índice, e as colunas
 * estando igualmente espaçadas o resultado foi uma DIAGONAL perfeita
 * atravessando o quadro — lia como um padrão, não como poeira. O que se quer
 * aqui é desordem, e desordem não sai de uma progressão.
 *
 * Escritos e não sorteados de propósito: o mesmo cartão tem de sair igual na
 * miniatura, na prévia e na tela do apresentador, e `Math.random()` daria
 * três poeiras diferentes ao mesmo tempo.
 */
export const ATRASOS_DA_POEIRA = [-0.5, -6.2, -2.8, -9.1, -4, -7.7, -1.3, -10.4, -3.5, -8.6, -5.4, -2]

/** Quantos pontos — sai da tabela, para os dois não poderem discordar. */
export const POEIRA = ATRASOS_DA_POEIRA.length

/** O que define o fundo de uma tela. */
export interface FundoDeTela {
  /** cor de partida — sozinha, quando `ate` não existe */
  de: string
  /** segunda cor: a presença dela é o que faz o fundo virar gradiente */
  ate?: string
  /** graus, no sentido do CSS: 0 sobe, 90 vai para a direita */
  angulo?: number
  /**
   * Qual efeito anima o fundo. Ausente é o normal: uma tela parada.
   *
   * As duas cores continuam valendo — o efeito é COMO elas se mexem, não uma
   * paleta pronta. É o que permite ligar a animação num fundo já escolhido
   * sem apagar e refazer o cartão.
   */
  animacao?: AnimacaoDeFundo
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
  alinhamento: AlinhamentoDoRecado
}

export const CORPO_MIN = 4
export const CORPO_MAX = 24
export const ANGULO_PADRAO = 135

/** A tela que nasce ao apertar "+ Tela": um azul de estúdio, sem recado. */
export function telaNova(): { fundo: FundoDeTela; recado: RecadoDeTela } {
  return {
    fundo: { de: '#16253f' },
    recado: { texto: '', corpoPct: 11, cor: '#ffffff', posicao: 'meio', alinhamento: 'center' }
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
 * Qual efeito anima este fundo, ou `null` se ele está parado.
 *
 * Um valor que não é dos seis vira `null` em vez de virar uma classe CSS que
 * não existe: um `.tela-fulano` sem regra nenhuma não dá erro, ele só deixa
 * o cartão sem fundo — e um cartão sem fundo no ar é o roteiro aparecendo por
 * baixo do que deveria estar cobrindo ele.
 */
export function animacaoDoFundo(fundo: FundoDeTela | undefined): AnimacaoDeFundo | null {
  const nome = fundo?.animacao
  return nome && ANIMACOES.includes(nome) ? nome : null
}

/** A classe do efeito, para o CSS fazer o resto. */
export function classeDoFundo(fundo: FundoDeTela | undefined): string | undefined {
  const nome = animacaoDoFundo(fundo)
  return nome ? `tela-fundo tela-${nome}` : undefined
}

/**
 * As duas cores como variáveis CSS.
 *
 * O efeito é escrito em `styles.css` e as cores vêm daqui — é o que permite
 * seis efeitos com a paleta de cada cartão, sem seis folhas de estilo. Sem a
 * segunda cor escolhida, ela repete a primeira: um efeito que precisa de duas
 * e recebe uma some, e sumir sem avisar é pior que ficar monocromático.
 */
export function coresDoFundo(fundo: FundoDeTela | undefined): Record<string, string> {
  const de = corSegura(fundo?.de)
  return { '--tela-de': de, '--tela-ate': fundo?.ate ? corSegura(fundo.ate) : de }
}

/**
 * O alinhamento do parágrafo, com o centro como padrão.
 *
 * O padrão não é enfeite: as telas criadas ANTES deste controle existir não
 * têm o campo, e elas foram escritas centralizadas. Sem este `??` o CSS
 * herdaria o alinhamento do início — e o recado que o operador deixou no
 * meio amanheceria encostado na esquerda, na tela do apresentador, sem que
 * ninguém tivesse mexido em nada.
 */
export function alinhamentoDoRecado(alinhamento: AlinhamentoDoRecado | undefined): AlinhamentoDoRecado {
  return alinhamento === 'left' || alinhamento === 'right' ? alinhamento : 'center'
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
