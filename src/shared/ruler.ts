/**
 * A régua de ritmo: uma barrinha por degrau, entre 60 e 500 palavras por minuto.
 *
 * O degrau é o mesmo para tudo — o que a barrinha vale, o que a seta do teclado
 * anda, o que o clique arredonda. Antes o atalho andava 12 ppm, um número que
 * não aparecia em lugar nenhum da tela; agora o passo é visível, e você vê
 * quanto vai mudar antes de mudar.
 */
export const PPM_MIN = 60
export const PPM_MAX = 500
export const PPM_STEP = 20

export const SEGMENT_COUNT = Math.round((PPM_MAX - PPM_MIN) / PPM_STEP) + 1

export function clampPpm(value: number): number {
  return Math.min(PPM_MAX, Math.max(PPM_MIN, Math.round(value)))
}

/** Encaixa no degrau mais próximo, sem sair da faixa. */
export function snapPpm(value: number): number {
  const passos = Math.round((value - PPM_MIN) / PPM_STEP)
  return clampPpm(PPM_MIN + passos * PPM_STEP)
}

/** Ritmo correspondente a um ponto da régua, com 0 na esquerda e 1 na direita. */
export function ppmFromFraction(fraction: number): number {
  const dentro = Math.min(1, Math.max(0, fraction))
  return snapPpm(PPM_MIN + dentro * (PPM_MAX - PPM_MIN))
}

/** Quantas barrinhas ficam acesas para este ritmo — pelo menos uma. */
export function filledSegments(ppm: number): number {
  const acesas = Math.round((clampPpm(ppm) - PPM_MIN) / PPM_STEP) + 1
  return Math.min(SEGMENT_COUNT, Math.max(1, acesas))
}

/**
 * Cor da barrinha, do verde ao vermelho.
 *
 * Interpolado em HSL, e não em RGB: em RGB o caminho entre essas duas cores
 * passa por cinza-oliva e a cor some no meio da régua. Em HSL ele percorre a
 * roda — verde, amarelo, laranja, vermelho —, devagar e verde à esquerda,
 * rápido e vermelho à direita.
 */
const LENTO = { h: 145, s: 60, l: 55 } // #46D17F, o mesmo verde do iniciar
const RAPIDO = { h: 0, s: 100, l: 65 } // #FF4D4D, o mesmo vermelho do no ar

export function segmentColor(index: number): string {
  const fracao = SEGMENT_COUNT > 1 ? Math.min(1, Math.max(0, index / (SEGMENT_COUNT - 1))) : 0
  const h = Math.round(LENTO.h + (RAPIDO.h - LENTO.h) * fracao)
  const s = Math.round(LENTO.s + (RAPIDO.s - LENTO.s) * fracao)
  const l = Math.round(LENTO.l + (RAPIDO.l - LENTO.l) * fracao)
  return `hsl(${h} ${s}% ${l}%)`
}
