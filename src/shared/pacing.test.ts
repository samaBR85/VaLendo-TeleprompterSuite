import { describe, expect, it } from 'vitest'
import { formatClock, ppmForTarget, secondsForWords, timerReading, wordIndexAt } from './pacing'
import { totalWordCount } from './text'
import { blocksFromText } from './text'
import type { Transport } from './types'
import { VIDEO_PARADO } from './video'

const stopped: Transport = {
  playing: false,
  ppm: 150,
  wordsAtStart: 12,
  startedAt: 1_000,
  blackout: false,
  frozen: false,
  card: null,
  video: VIDEO_PARADO
}

describe('relógio de rolagem', () => {
  it('fica parado quando não está tocando', () => {
    expect(wordIndexAt(stopped, 999_999)).toBe(12)
  })

  it('avança ppm/60 palavras por segundo', () => {
    const playing: Transport = { ...stopped, playing: true, wordsAtStart: 0, startedAt: 0 }
    expect(wordIndexAt(playing, 60_000)).toBeCloseTo(150, 5)
    expect(wordIndexAt(playing, 30_000)).toBeCloseTo(75, 5)
  })

  it('não anda para trás se o relógio do sistema recuar', () => {
    const playing: Transport = { ...stopped, playing: true, wordsAtStart: 20, startedAt: 10_000 }
    expect(wordIndexAt(playing, 5_000)).toBe(20)
  })
})

describe('ppm e duração', () => {
  it('fecham nos dois sentidos', () => {
    const seconds = secondsForWords(450, 150)
    expect(seconds).toBeCloseTo(180, 5)
    expect(ppmForTarget(450, seconds)).toBeCloseTo(150, 5)
  })

  it('não divide por zero', () => {
    expect(secondsForWords(100, 0)).toBe(0)
    expect(ppmForTarget(100, 0)).toBe(0)
  })

  it('ignora direções ao estimar a duração', () => {
    const blocks = blocksFromText('uma duas três quatro\n\n[isto não é falado e não conta tempo]')
    expect(totalWordCount(blocks)).toBe(4)
  })
})

describe('timerReading', () => {
  it('mostra decorrido e restante somando a duração total', () => {
    // 300 palavras a 150 ppm são 2:00 no total
    expect(timerReading(150, 300, 150)).toEqual({ elapsed: '1:00', remaining: '1:00' })
    expect(timerReading(0, 300, 150)).toEqual({ elapsed: '0:00', remaining: '2:00' })
  })

  it('não mostra tempo negativo quando a rolagem passa do fim', () => {
    // "-0:12" na cara do apresentador não ajuda em nada
    expect(timerReading(999, 300, 150)).toEqual({ elapsed: '2:00', remaining: '0:00' })
  })

  it('trata posição antes do início', () => {
    expect(timerReading(-50, 300, 150).elapsed).toBe('0:00')
  })

  it('aguenta roteiro vazio sem dividir por zero', () => {
    expect(timerReading(0, 0, 150)).toEqual({ elapsed: '0:00', remaining: '0:00' })
    expect(timerReading(0, 300, 0)).toEqual({ elapsed: '0:00', remaining: '0:00' })
  })
})

describe('formatClock', () => {
  it('formata minutos e segundos', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(74)).toBe('1:14')
    expect(formatClock(-5)).toBe('0:00')
  })
})
