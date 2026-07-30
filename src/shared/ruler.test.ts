import { describe, expect, it } from 'vitest'
import {
  PPM_MAX,
  PPM_MIN,
  PPM_STEP,
  SEGMENT_COUNT,
  filledSegments,
  ppmFromFraction,
  segmentColor,
  snapPpm
} from './ruler'

describe('a régua de ritmo', () => {
  it('tem uma barrinha por degrau, das pontas inclusive', () => {
    expect(SEGMENT_COUNT).toBe(23)
    expect(PPM_MIN + (SEGMENT_COUNT - 1) * PPM_STEP).toBe(PPM_MAX)
  })

  it('o ponto onde se clica é o valor', () => {
    expect(ppmFromFraction(0)).toBe(PPM_MIN)
    expect(ppmFromFraction(1)).toBe(PPM_MAX)
    expect(ppmFromFraction(0.5)).toBe(280)
  })

  it('não sai da faixa nem com o dedo fora da régua', () => {
    expect(ppmFromFraction(-3)).toBe(PPM_MIN)
    expect(ppmFromFraction(9)).toBe(PPM_MAX)
  })

  it('encaixa no degrau mais próximo', () => {
    expect(snapPpm(251)).toBe(260)
    expect(snapPpm(249)).toBe(240)
    expect(snapPpm(60)).toBe(60)
  })

  it('sempre acende ao menos uma barrinha, mesmo no mínimo', () => {
    // uma régua toda apagada pareceria controle desligado, não ritmo lento
    expect(filledSegments(PPM_MIN)).toBe(1)
    expect(filledSegments(PPM_MAX)).toBe(SEGMENT_COUNT)
    expect(filledSegments(280)).toBe(12)
  })

  it('aguenta ritmo fora da grade, vindo de workspace antigo', () => {
    // antes o atalho andava de 12 em 12, então há valores gravados fora dos
    // degraus de agora; eles precisam acender a régua sem estourar
    const acesas = filledSegments(250)
    expect(acesas).toBeGreaterThan(0)
    expect(acesas).toBeLessThanOrEqual(SEGMENT_COUNT)
    expect(filledSegments(9_999)).toBe(SEGMENT_COUNT)
    expect(filledSegments(-5)).toBe(1)
  })
})

describe('a cor da régua', () => {
  it('vai do ciano do iniciar ao vermelho do no ar', () => {
    // as pontas são as cores do app, e não cores novas: o mesmo verde-ciano do
    // botão de iniciar e o mesmo vermelho do no ar
    expect(segmentColor(0)).toBe('hsl(160 51% 58%)')
    expect(segmentColor(SEGMENT_COUNT - 1)).toBe('hsl(1 72% 59%)')
  })

  it('atravessa a roda de cor em vez de passar pelo cinza', () => {
    // interpolar em RGB entre essas duas cores passa por cinza-oliva e a cor
    // some no meio da régua; em HSL o meio é um amarelo-esverdeado vivo
    const meio = segmentColor(Math.floor((SEGMENT_COUNT - 1) / 2))
    const matiz = Number(/hsl\((\d+)/.exec(meio)![1])
    const saturacao = Number(/hsl\(\d+ (\d+)%/.exec(meio)![1])

    expect(matiz).toBeGreaterThan(60)
    expect(matiz).toBeLessThan(100)
    expect(saturacao).toBeGreaterThan(50)
  })

  it('esquenta sem voltar atrás, barrinha a barrinha', () => {
    const matizes = Array.from({ length: SEGMENT_COUNT }, (_, i) =>
      Number(/hsl\((\d+)/.exec(segmentColor(i))![1])
    )
    for (let i = 1; i < matizes.length; i += 1) {
      expect(matizes[i], `barrinha ${i}`).toBeLessThanOrEqual(matizes[i - 1])
    }
  })
})
