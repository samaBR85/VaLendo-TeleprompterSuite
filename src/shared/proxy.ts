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

/**
 * A escada desce em peso, não em tamanho.
 *
 * A primeira versão encolhia a resolução a cada degrau, até 640x360. Estava
 * errado para o que este app mostra: cartão é quase sempre imagem parada ou
 * com pouco movimento — um standby, um logo, um recado —, e o H.264 gasta
 * bits em movimento, quase nada em imagem estática. Então 1080p com bitrate
 * baixo fica ótimo num standby, enquanto 432p fica borrado por mais bitrate
 * que se dê. Quem confere pelo celular quer ler o que está escrito na arte.
 *
 * Os quatro são 16:9 exato e de lados pares, e isso não é capricho. O tamanho
 * é um teto, não uma imposição: a conversão encaixa o vídeo dentro dele
 * preservando a proporção do original, para um retrato de celular não sair
 * esticado. Quando o teto tem a mesma proporção da fonte, a conta fecha
 * redonda e a caixa é exatamente o que sai. Quando não tem, sobra resto — o
 * perfil leve já foi 854x480, a convenção de "480p widescreen" que na verdade
 * é 1,779 e não 1,778, e um 1920x1080 ali dentro dava 480,375 de altura. O
 * H.264 recusa lado ímpar, e a conversão falhava só nesse perfil.
 */
export const PERFIS: Perfil[] = [
  { id: 'alta', largura: 1920, altura: 1080, kbps: 2500, audioKbps: 128 },
  { id: 'media', largura: 1920, altura: 1080, kbps: 1200, audioKbps: 96 },
  { id: 'leve', largura: 1280, altura: 720, kbps: 800, audioKbps: 96 },
  { id: 'minima', largura: 1280, altura: 720, kbps: 400, audioKbps: 64 }
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
