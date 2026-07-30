import { describe, expect, it } from 'vitest'
import { TIMER_POSITIONS, timerCell } from './types'

describe('grade de posições do relógio', () => {
  it('tem nove posições, em três linhas de três', () => {
    expect(TIMER_POSITIONS).toHaveLength(3)
    for (const row of TIMER_POSITIONS) expect(row).toHaveLength(3)
    expect(new Set(TIMER_POSITIONS.flat()).size).toBe(9)
  })

  it('devolve a célula de cada posição, de cima para baixo e da esquerda para a direita', () => {
    expect(timerCell('topLeft')).toEqual({ row: 0, column: 0 })
    expect(timerCell('topRight')).toEqual({ row: 0, column: 2 })
    expect(timerCell('middleCenter')).toEqual({ row: 1, column: 1 })
    expect(timerCell('bottomLeft')).toEqual({ row: 2, column: 0 })
    expect(timerCell('bottomRight')).toEqual({ row: 2, column: 2 })
  })

  it('a célula bate com onde a posição está na grade desenhada', () => {
    // a grade do inspetor e o posicionamento na tela saem da mesma constante;
    // este teste é o que impede as duas de desandarem
    TIMER_POSITIONS.forEach((row, rowIndex) => {
      row.forEach((position, columnIndex) => {
        expect(timerCell(position), position).toEqual({ row: rowIndex, column: columnIndex })
      })
    })
  })

  it('não quebra com posição desconhecida', () => {
    expect(timerCell('inexistente' as never)).toEqual({ row: 0, column: 2 })
  })
})
