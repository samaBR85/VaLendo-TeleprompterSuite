import { describe, expect, it } from 'vitest'
import { passoDaMiniatura, THUMB_DEFAULT, THUMB_MAX, THUMB_MIN } from './defaults'

/** onde este tamanho cai na faixa, em porcentagem */
function pct(valor: number): number {
  return Math.round(((valor - THUMB_MIN) / (THUMB_MAX - THUMB_MIN)) * 100)
}

describe('degraus do slider de miniatura', () => {
  it('nasce no meio da faixa', () => {
    expect(pct(THUMB_DEFAULT)).toBe(50)
  })

  // a faixa tem 56px, então 10% dela é 5,6px — não existe em pixel inteiro.
  // Cada degrau erra no máximo 1 ponto percentual por arredondamento, e é o
  // melhor possível sem mudar os limites reais da miniatura
  const PIXEL = 1

  it('um clique anda 10% do curso', () => {
    expect(Math.abs(pct(passoDaMiniatura(THUMB_DEFAULT, 1)) - 60)).toBeLessThanOrEqual(PIXEL)
    expect(Math.abs(pct(passoDaMiniatura(THUMB_DEFAULT, -1)) - 40)).toBeLessThanOrEqual(PIXEL)
  })

  it('não passa das pontas', () => {
    expect(passoDaMiniatura(THUMB_MAX, 1)).toBe(THUMB_MAX)
    expect(passoDaMiniatura(THUMB_MIN, -1)).toBe(THUMB_MIN)
  })

  it('dez cliques atravessam a faixa inteira, sem sobrar nem faltar', () => {
    // o motivo de a conta ser em porcentagem e não em pixels: somar
    // arredondamentos dez vezes iria derivando e nunca fecharia na ponta
    let valor = THUMB_MIN
    for (let i = 0; i < 10; i += 1) valor = passoDaMiniatura(valor, 1)
    expect(valor).toBe(THUMB_MAX)

    for (let i = 0; i < 10; i += 1) valor = passoDaMiniatura(valor, -1)
    expect(valor).toBe(THUMB_MIN)
  })

  it('um valor fora da grade cai na casa de 10% mais próxima antes de andar', () => {
    // arrastar o slider pousa em qualquer pixel; o degrau seguinte tem que
    // reencaixar na grade, senão o controle nunca mais bate em número redondo
    const solto = THUMB_MIN + 1 // ~2% da faixa
    expect(Math.abs(pct(passoDaMiniatura(solto, 1)) - 10)).toBeLessThanOrEqual(PIXEL)
  })
})
