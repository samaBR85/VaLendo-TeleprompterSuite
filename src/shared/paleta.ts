/**
 * A paleta curta, e a conta que diz se uma cor se lê no fundo.
 *
 * O seletor oferecia sessenta e um quadrados numa grade de matiz × claridade.
 * Ela é completa e é péssima para o trabalho de verdade: escolher a cor de um
 * apresentador não é escolher UMA cor bonita, é escolher mais uma cor que se
 * distinga das que já estão na mesma tela. Numa grade organizada por matiz,
 * duas casas vizinhas são quase a mesma cor — e o operador só descobre isso no
 * vidro, com o programa correndo.
 *
 * Estas doze são escolhidas pelo critério oposto: SEPARAÇÃO. Estão espalhadas
 * pelo círculo de matiz, têm claridade parecida entre si (nenhuma some no
 * preto, nenhuma estoura), e sobrevivem às formas comuns de daltonismo — não
 * há aqui um par vermelho/verde que dependa de enxergar a diferença entre os
 * dois para o apresentador saber de quem é a fala.
 *
 * A grade inteira continua existindo, atrás do "mais cores": quem precisa casar
 * uma marca com a arte de um canal precisa do tom exato, e esse caso é real.
 */
export const PALETA_CURTA = [
  '#F0E442',
  '#F5A93A',
  '#FF8A5B',
  '#F3A0C6',
  '#B79BFF',
  '#56B4E9',
  '#4FD3AE',
  '#FFFFFF'
] as const

/**
 * Luminância relativa, como a WCAG define.
 *
 * Não é o brilho ingênuo (média dos canais): o olho enxerga o verde muito mais
 * que o azul, e a conta pesa cada canal por isso. Sem esse peso, um azul
 * escuro e um verde escuro pareceriam igualmente legíveis, e só um deles é.
 */
export function luminancia(hex: string): number {
  const canal = (de: number): number => {
    const c = parseInt(hex.slice(de, de + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

/** A razão de contraste entre duas cores, de 1 (iguais) a 21 (preto e branco). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const claro = Math.max(la, lb)
  const escuro = Math.min(la, lb)
  return (claro + 0.05) / (escuro + 0.05)
}

/**
 * 7:1 — o degrau AAA, e não o AA de 4,5:1.
 *
 * A régua da web é feita para quem lê a meio metro, parado, num escritório
 * iluminado. Aqui o texto atravessa um vidro semiespelhado, que come parte da
 * luz, e é lido a três metros por alguém que não pode voltar atrás para
 * conferir a palavra. O degrau mais exigente é o que corresponde a isso.
 */
export const CONTRASTE_MINIMO = 7

export function legivelNo(cor: string, fundo: string): boolean {
  return contraste(cor, fundo) >= CONTRASTE_MINIMO
}

/**
 * A mesma cor, vista por quem não distingue vermelho de verde.
 *
 * Deuteranopia é a mais comum das cegueiras de cor — cerca de um homem em
 * doze. Para esses olhos, um vermelho e um verde de brilho parecido são a
 * MESMA cor, e um roteiro que separa HARI de ROBSON por essa diferença não
 * separa nada.
 *
 * A conta é a aproximação de Machado (2009) em severidade total, aplicada em
 * RGB linear e não no valor do arquivo: os canais do sRGB são comprimidos para
 * a tela, e misturá-los antes de descomprimir mistura números, não luz.
 *
 * Serve para CONFERIR a paleta, não para desenhar nada — nenhuma tela do app
 * mostra a simulação. Ela existe para o teste poder cobrar a promessa em vez
 * de acreditar nela.
 */
export function comoDeuteranopo(hex: string): string {
  const linear = (de: number): number => {
    const c = parseInt(hex.slice(de, de + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = [linear(1), linear(3), linear(5)]
  const m = [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ]
  const devolta = (v: number): string => {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0')
  }
  const canal = (linha: number[]): string => devolta(linha[0] * r + linha[1] * g + linha[2] * b)
  return `#${canal(m[0])}${canal(m[1])}${canal(m[2])}`
}
