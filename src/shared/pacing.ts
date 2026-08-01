import type { StopwatchClock, Transport } from './types'

/**
 * Posição do relógio de rolagem, em índice global de palavras.
 *
 * Deliberadamente calculada, não transmitida: o main guarda apenas
 * `{ppm, wordsAtStart, startedAt}` e cada janela deriva a própria posição.
 * Nenhuma mensagem por frame, e portanto nenhuma deriva entre a prévia do
 * operador e o que o apresentador vê.
 */
export function wordIndexAt(transport: Transport, now: number): number {
  if (!transport.playing) return transport.wordsAtStart
  const elapsed = Math.max(0, (now - transport.startedAt) / 1000)
  return transport.wordsAtStart + (transport.ppm / 60) * elapsed
}

export function secondsForWords(wordCount: number, ppm: number): number {
  if (ppm <= 0) return 0
  return (wordCount / ppm) * 60
}

/** Modo duração-alvo: quantas palavras por minuto para caber no tempo pedido. */
export function ppmForTarget(wordCount: number, seconds: number): number {
  if (seconds <= 0) return 0
  return (wordCount / seconds) * 60
}

export interface TimerReading {
  elapsed: string
  remaining: string
}

/**
 * O que os relógios da transmissão mostram neste instante.
 *
 * O restante nunca passa a ser negativo: quando o roteiro acaba e a rolagem
 * continua, "-0:12" na cara do apresentador não ajuda em nada.
 */
export function timerReading(wordIndex: number, totalWords: number, ppm: number): TimerReading {
  const read = Math.min(Math.max(0, wordIndex), totalWords)
  return {
    elapsed: formatClock(secondsForWords(read, ppm)),
    remaining: formatClock(secondsForWords(totalWords - read, ppm))
  }
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Relógio parado, que é como todo cronômetro nasce. */
export const CRONOMETRO_PARADO: StopwatchClock = { base: 0, comecouEm: 0 }

/**
 * Em que segundo o cronômetro está agora.
 *
 * Mesmo desenho do relógio do vídeo: o estado guarda de onde partiu e
 * quando, e cada janela calcula sozinha — sem mandar o segundo quadro a
 * quadro. `playing` é o mesmo play/pausa do transporte; o cronômetro não tem
 * o seu próprio, porque os dois sempre andam juntos.
 */
export function segundosDoCronometro(clock: StopwatchClock, playing: boolean, agora: number): number {
  if (!playing) return clock.base
  return clock.base + Math.max(0, agora - clock.comecouEm) / 1000
}

export interface StopwatchReading extends TimerReading {
  /** o alvo estourou: "remaining" passou a contar quanto já passou dele */
  estourou: boolean
}

/**
 * O que os relógios mostram no modo cronômetro.
 *
 * Decorrido é o segundo corrido, sem limite — o cronômetro não pára sozinho
 * no fim do roteiro, porque ele não sabe onde o roteiro termina, só quanto
 * tempo passou desde o play. Restante é a distância até o alvo, nos dois
 * sentidos: antes de estourar conta para baixo, depois conta para cima.
 */
export function stopwatchReading(clock: StopwatchClock, playing: boolean, agora: number, targetSeconds: number): StopwatchReading {
  const elapsedSeconds = segundosDoCronometro(clock, playing, agora)
  const diff = Math.max(0, targetSeconds) - elapsedSeconds
  return {
    elapsed: formatClock(elapsedSeconds),
    remaining: formatClock(Math.abs(diff)),
    estourou: diff < 0
  }
}
