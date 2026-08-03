import { describe, expect, it } from 'vitest'
import {
  apagarDigitoDoAlvo,
  bufferDoAlvoParaSegundos,
  CRONOMETRO_PARADO,
  empurrarDigitoDoAlvo,
  formatAlvo,
  formatClock,
  ppmForTarget,
  relogioIndependenteReading,
  secondsForWords,
  segundosDoCronometro,
  segundosDoRelogioIndependente,
  segundosParaBufferDoAlvo,
  stopwatchReading,
  timerReading,
  wordIndexAt
} from './pacing'
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
  video: VIDEO_PARADO,
  stopwatch: CRONOMETRO_PARADO,
  independentStartedAt: 0,
  loop: false,
  loopDelaySeconds: 0
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

describe('cronômetro', () => {
  it('fica parado no que tinha acumulado quando não está tocando', () => {
    expect(segundosDoCronometro({ base: 42, comecouEm: 0 }, false, 999_999)).toBe(42)
  })

  it('soma o tempo desde que a corrida atual começou', () => {
    expect(segundosDoCronometro({ base: 10, comecouEm: 1_000 }, true, 21_000)).toBe(30)
  })

  it('conta para baixo até o alvo, e depois passa a contar para cima', () => {
    const dentroDoAlvo = stopwatchReading({ base: 0, comecouEm: 0 }, true, 90_000, 180)
    expect(dentroDoAlvo).toEqual({ elapsed: '1:30', remaining: '1:30', estourou: false })

    const noAlvoExato = stopwatchReading({ base: 0, comecouEm: 0 }, true, 180_000, 180)
    expect(noAlvoExato).toEqual({ elapsed: '3:00', remaining: '0:00', estourou: false })

    const estourado = stopwatchReading({ base: 0, comecouEm: 0 }, true, 225_000, 180)
    expect(estourado).toEqual({ elapsed: '3:45', remaining: '0:45', estourou: true })
  })

  it('decorrido não tem teto: passa do alvo e continua contando', () => {
    const muitoDepois = stopwatchReading({ base: 0, comecouEm: 0 }, true, 600_000, 180)
    expect(muitoDepois.elapsed).toBe('10:00')
    expect(muitoDepois.estourou).toBe(true)
  })
})

describe('relógio independente', () => {
  it('fica em zero antes do primeiro play', () => {
    expect(segundosDoRelogioIndependente(0, 999_999)).toBe(0)
  })

  it('conta o tempo real desde que começou, sem nenhum "pausado"', () => {
    expect(segundosDoRelogioIndependente(1_000, 21_000)).toBe(20)
  })

  it('é justamente isto que o diferencia do cronômetro: não existe estado de pausa', () => {
    // o cronômetro (segundosDoCronometro) recebe `playing` e para de contar
    // quando é `false`; este nem aceita esse parâmetro — o tempo real é tudo
    // o que importa, dado que o texto pode pausar no meio sem afetar nada
    const comecouAs1000 = 1_000
    const dezSegundosDepois = 11_000
    const trintaSegundosDepois = 31_000
    expect(segundosDoRelogioIndependente(comecouAs1000, dezSegundosDepois)).toBe(10)
    expect(segundosDoRelogioIndependente(comecouAs1000, trintaSegundosDepois)).toBe(30)
  })

  it('conta contra o alvo do mesmo jeito que o cronômetro', () => {
    // startedAt=1_000 (não zero) — zero é o sentinela de "ainda não começou"
    const estourado = relogioIndependenteReading(1_000, 226_000, 180)
    expect(estourado).toEqual({ elapsed: '3:45', remaining: '0:45', estourou: true })
  })

  it('startedAt=0 é "ainda não começou", não "começou no instante zero"', () => {
    expect(relogioIndependenteReading(0, 999_999, 180).elapsed).toBe('0:00')
  })
})

describe('campo digitável do alvo', () => {
  const digitar = (texto: string): string =>
    [...texto].reduce((buffer, digito) => empurrarDigitoDoAlvo(buffer, digito), '')

  it('digitar "50" vira 0:00:50, mostrado como 00:50', () => {
    const buffer = digitar('50')
    expect(bufferDoAlvoParaSegundos(buffer)).toBe(50)
    expect(formatAlvo(bufferDoAlvoParaSegundos(buffer))).toBe('00:50')
  })

  it('digitar "140" vira 0:01:40, mostrado como 01:40', () => {
    const buffer = digitar('140')
    expect(bufferDoAlvoParaSegundos(buffer)).toBe(100)
    expect(formatAlvo(bufferDoAlvoParaSegundos(buffer))).toBe('01:40')
  })

  it('digitar "14500" vira 1:45:00, mostrado sem zero à esquerda na hora', () => {
    const buffer = digitar('14500')
    expect(bufferDoAlvoParaSegundos(buffer)).toBe(6300)
    expect(formatAlvo(bufferDoAlvoParaSegundos(buffer))).toBe('1:45:00')
  })

  it('o dígito mais antigo cai fora depois da sexta casa', () => {
    // sete dígitos: o primeiro "1" é empurrado para fora, sobra "234567"
    const buffer = digitar('1234567')
    expect(buffer).toBe('234567')
  })

  it('apagar remove o último dígito digitado, não o primeiro', () => {
    const cheio = digitar('14500')
    expect(apagarDigitoDoAlvo(cheio)).toBe('1450')
    expect(bufferDoAlvoParaSegundos(apagarDigitoDoAlvo(cheio))).toBe(890) // 0:14:50
  })

  it('o buffer nasce do valor já salvo, para editar em cima dele', () => {
    expect(segundosParaBufferDoAlvo(180)).toBe('000300')
    expect(segundosParaBufferDoAlvo(6300)).toBe('014500')
  })
})
