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
 * Decorrido/restante/estourou a partir de um segundo corrido já calculado.
 *
 * Base comum do modo Cronômetro e do modo Independente — os dois só diferem
 * em COMO chegam ao "quanto passou" (um segue o play do texto, o outro tem o
 * play próprio); a partir daí a conta contra o alvo é idêntica. Decorrido não
 * tem limite — nenhum dos dois modos sabe onde o roteiro termina, só quanto
 * tempo passou desde que ligaram. Restante é a distância até o alvo, nos dois
 * sentidos: antes de estourar conta para baixo, depois conta para cima.
 */
export function leituraDoAlvo(elapsedSeconds: number, targetSeconds: number): StopwatchReading {
  const diff = Math.max(0, targetSeconds) - elapsedSeconds
  return {
    elapsed: formatClock(elapsedSeconds),
    remaining: formatClock(Math.abs(diff)),
    estourou: diff < 0
  }
}

/** O que os relógios mostram no modo cronômetro — decorrido segue o play do texto. */
export function stopwatchReading(clock: StopwatchClock, playing: boolean, agora: number, targetSeconds: number): StopwatchReading {
  return leituraDoAlvo(segundosDoCronometro(clock, playing, agora), targetSeconds)
}

/**
 * Em que segundo o relógio independente está agora.
 *
 * Nasce com o primeiro play, do mesmo jeito que o cronômetro — a diferença é
 * que, uma vez começado, nada o pausa. `startedAt` é `0` até o primeiro play
 * (decorrido fica em zero); depois disso é fixo até o próximo reiniciar ou
 * troca de aba, e o decorrido é só `agora - startedAt`, sem nenhum `if
 * (playing)`. Pausar o texto vira invisível para ele de propósito.
 */
export function segundosDoRelogioIndependente(startedAt: number, agora: number): number {
  if (startedAt === 0) return 0
  return Math.max(0, agora - startedAt) / 1000
}

/** O que os relógios mostram no modo independente — decorrido não pausa com o texto. */
export function relogioIndependenteReading(startedAt: number, agora: number, targetSeconds: number): StopwatchReading {
  return leituraDoAlvo(segundosDoRelogioIndependente(startedAt, agora), targetSeconds)
}

/**
 * O alvo do cronômetro, digitado como numa calculadora de horário.
 *
 * Seis casas — HHMMSS — preenchidas da direita para a esquerda: cada dígito
 * novo empurra os anteriores para a esquerda, e o que passar da sexta casa
 * cai fora. É por isso que digitar "50" vira 0:00:50 e não 50:00:00 — o
 * dígito entra na casa dos segundos, não na das horas.
 */
export function empurrarDigitoDoAlvo(buffer: string, digito: string): string {
  return `${buffer}${digito}`.slice(-6)
}

export function apagarDigitoDoAlvo(buffer: string): string {
  return buffer.slice(0, -1)
}

/** De segundos totais para as seis casas do buffer, para o campo nascer com o valor que já estava salvo. */
export function segundosParaBufferDoAlvo(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}${String(s).padStart(2, '0')}`.slice(-6)
}

/** Do buffer de seis casas para segundos totais — completa com zeros à esquerda. */
export function bufferDoAlvoParaSegundos(buffer: string): number {
  const seis = buffer.padStart(6, '0')
  const h = Number(seis.slice(0, 2))
  const m = Number(seis.slice(2, 4))
  const s = Number(seis.slice(4, 6))
  return h * 3600 + m * 60 + s
}

/**
 * H:MM:SS quando há hora, MM:SS quando não há.
 *
 * Diferente de `formatClock` (usado nos relógios da transmissão, que nunca
 * passam de minutos): aqui os minutos vêm sempre com dois dígitos mesmo sem
 * hora — "00:50", não "0:50" — porque é o valor que a pessoa acabou de
 * digitar, e cada casa precisa continuar no lugar em que foi digitada.
 */
export function formatAlvo(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
