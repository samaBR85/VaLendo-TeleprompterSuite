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
  it('o medidor tem degrau próprio, mais grosso que o do ritmo', () => {
    // desacoplados de propósito: a régua estreita não comporta uma barrinha
    // por degrau de 20 ppm sem cada uma sair de um tamanho
    expect(SEGMENT_COUNT).toBe(11)
    expect(SEGMENT_COUNT).toBeLessThan(Math.round((PPM_MAX - PPM_MIN) / PPM_STEP) + 1)
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
    // 280 é o meio exato da faixa: metade das barrinhas, arredondando para cima
    expect(filledSegments(280)).toBe(6)
  })

  it('acende de ponta a ponta sem pular nem repetir barrinha', () => {
    // cada barrinha precisa ser alcançável: uma que nunca acende é um degrau
    // que o operador vê e não consegue pousar em cima
    const alcancadas = new Set<number>()
    for (let ppm = PPM_MIN; ppm <= PPM_MAX; ppm += 1) alcancadas.add(filledSegments(ppm))
    expect(alcancadas.size).toBe(SEGMENT_COUNT)
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
  it('vai do verde-ciano do iniciar ao vermelho do no ar', () => {
    // as pontas são as cores do app, e não cores novas: o mesmo verde-ciano
    // do botão de iniciar (devagar) e o mesmo vermelho do no ar (rápido)
    expect(segmentColor(0)).toBe('hsl(145 60% 55%)')
    expect(segmentColor(SEGMENT_COUNT - 1)).toBe('hsl(0 100% 65%)')
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
