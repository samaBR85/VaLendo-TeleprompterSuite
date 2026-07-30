import type { Transport } from './types'

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

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
