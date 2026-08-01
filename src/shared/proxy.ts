/**
 * O peso do vídeo que vai para a rede local.
 *
 * A tela do apresentador recebe sempre o arquivo original — ali não há rede no
 * caminho e qualidade é o que importa. A página da rede é outra coisa: serve
 * para conferência, atravessa o wi-fi do estúdio e chega num celular. Mandar
 * um master de 12 Mbps por ali engasga sem dar nada em troca.
 *
 * Os números abaixo foram medidos, não estimados: 30 segundos de 1080p com
 * movimento, recodificados pelo ffmpeg que viaja no app. O alvo é cumprido com
 * folga de menos de 2% — pedir 700 kbps entrega 707 — e a conversão roda de 30
 * a 50 vezes mais rápido que o tempo real.
 */
export type PerfilDeRede = 'original' | 'alta' | 'media' | 'leve' | 'minima'

export interface Perfil {
  id: PerfilDeRede
  largura: number
  altura: number
  /** vídeo, em kbps */
  kbps: number
  /** áudio, em kbps */
  audioKbps: number
}

export const PERFIS: Perfil[] = [
  { id: 'alta', largura: 1280, altura: 720, kbps: 2500, audioKbps: 128 },
  { id: 'media', largura: 960, altura: 540, kbps: 1200, audioKbps: 96 },
  { id: 'leve', largura: 854, altura: 480, kbps: 700, audioKbps: 96 },
  { id: 'minima', largura: 640, altura: 360, kbps: 400, audioKbps: 64 }
]

export const PERFIS_DA_REDE: PerfilDeRede[] = ['original', 'alta', 'media', 'leve', 'minima']

export function perfilPorId(id: PerfilDeRede): Perfil | null {
  return PERFIS.find((p) => p.id === id) ?? null
}

/**
 * Quanto um vídeo pesaria por minuto naquele perfil, em MB.
 *
 * Serve para a tela dizer o custo antes de o operador escolher: "leve" e
 * "mínima" não querem dizer nada sozinhos, e 5 MB por minuto quer.
 */
export function mbPorMinuto(perfil: Perfil): number {
  return ((perfil.kbps + perfil.audioKbps) * 60) / 8 / 1024
}
