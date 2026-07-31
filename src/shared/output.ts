import type { Appearance } from './types'

export interface Size {
  width: number
  height: number
}

/**
 * Espelhar e girar são compensação de hardware, não estilo.
 *
 * O teleprompter físico devolve a imagem por um vidro semiespelhado, e cada
 * equipamento monta esse vidro de um jeito — por isso o operador precisa
 * espelhar ou girar a saída até o apresentador conseguir ler. Isso vale só
 * para o monitor que alimenta o vidro: na prévia do operador e na página de
 * conferência da rede local, o mesmo giro deixaria o texto ilegível para
 * quem está lendo direto da tela, sem vidro nenhum no caminho.
 */
export function appliesOutputTransforms(surface: 'broadcast' | 'preview'): boolean {
  return surface === 'broadcast'
}

/** O giro de 90° e 270° troca a largura pela altura. */
export function isQuarterTurn(rotation: Appearance['rotation']): boolean {
  return rotation === 90 || rotation === 270
}

/**
 * Tamanho do palco onde o texto é composto.
 *
 * Girado um quarto de volta, o texto é escrito numa área com a largura e a
 * altura trocadas — e é essa largura que decide onde cada linha quebra. Não
 * depende de a superfície aplicar o giro ou não: a prévia precisa quebrar as
 * linhas exatamente onde a transmissão vai quebrar, senão deixa de ser
 * prévia do que o apresentador vai ler.
 */
export function stageSize(rotation: Appearance['rotation'], viewport: Size): Size {
  return isQuarterTurn(rotation) ? { width: viewport.height, height: viewport.width } : viewport
}

/**
 * Tamanho da caixa desenhada na tela.
 *
 * Com o giro aplicado, a caixa é a saída física: um palco de 1080×1920 gira
 * e passa a ocupar os 1920×1080 do monitor. Sem aplicar o giro, o palco fica
 * em pé como foi composto, e a caixa precisa acompanhá-lo — do contrário ele
 * seria recortado em cima e embaixo por uma caixa deitada.
 */
export function canvasBox(
  rotation: Appearance['rotation'],
  viewport: Size,
  outputTransforms: boolean
): Size {
  return outputTransforms ? viewport : stageSize(rotation, viewport)
}
