import type { Cartao, VideoClock } from './types'

/**
 * Formatos que o Chromium desenha e que valem oferecer.
 *
 * `.mov` fica de fora porque não toca — o container do QuickTime é recusado
 * mesmo quando o vídeo lá dentro é H.264. Como é justo o que sai de iPhone e
 * de muita ilha de edição, a recusa precisa acontecer na hora de subir, com o
 * motivo escrito, e não virar uma tela preta no meio do programa.
 */
export const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'ogv']

const TIPOS_VIDEO: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg'
}

export function ehVideo(nomeOuCaminho: string): boolean {
  return VIDEO_EXTENSIONS.includes(extensao(nomeOuCaminho))
}

export function tipoDoVideo(nomeOuCaminho: string): string {
  return TIPOS_VIDEO[`.${extensao(nomeOuCaminho)}`] ?? 'application/octet-stream'
}

function extensao(nomeOuCaminho: string): string {
  const ponto = nomeOuCaminho.lastIndexOf('.')
  return ponto < 0 ? '' : nomeOuCaminho.slice(ponto + 1).toLowerCase()
}

/** Relógio parado, que é como todo vídeo nasce. */
export const VIDEO_PARADO: VideoClock = {
  tocando: false,
  base: 0,
  comecouEm: 0,
  arrastando: false,
  volume: 1
}

/**
 * Em que segundo o vídeo está agora.
 *
 * Mesma ideia do relógio de rolagem: o estado guarda de onde partiu e quando,
 * e cada superfície calcula. Sem isto seria preciso mandar a posição quadro a
 * quadro para as outras janelas — que é o desenho que faz vídeo engasgar.
 */
export function posicaoDoVideo(
  clock: VideoClock,
  agora: number,
  duracao: number | undefined,
  loop = false
): number {
  const corrido = clock.tocando ? clock.base + Math.max(0, agora - clock.comecouEm) / 1000 : clock.base
  if (corrido < 0) return 0
  if (!duracao || duracao <= 0) return corrido

  // no fim, ou volta ao começo ou segura o último quadro — nunca some da tela
  if (loop) return corrido % duracao
  return Math.min(corrido, duracao)
}

/** O vídeo chegou ao fim e não repete: daqui para frente o quadro é o último. */
export function terminou(clock: VideoClock, agora: number, duracao: number | undefined, loop = false): boolean {
  if (loop || !duracao || duracao <= 0) return false
  return posicaoDoVideo(clock, agora, duracao, loop) >= duracao
}

/** m:ss, que é como se lê tempo de vídeo. */
export function tempoDeVideo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00'
  const inteiro = Math.floor(segundos)
  return `${Math.floor(inteiro / 60)}:${String(inteiro % 60).padStart(2, '0')}`
}

/**
 * O cartão pode ir ao ar?
 *
 * Um vídeo desvinculado — arquivo movido, renomeado, HD externo fora — não
 * pode subir. Um retângulo preto no meio do programa é pior do que o atalho
 * não fazer nada, porque o operador demora a entender que foi ele quem
 * acionou.
 */
export function podeIrAoAr(card: Cartao): boolean {
  return card.kind !== 'video' || card.vinculado !== false
}
