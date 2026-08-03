/**
 * A escala da interface do OPERADOR — e só dela.
 *
 * Software profissional escala a interface INTEIRA, não só as letras: aumentar
 * só o texto deixa ícone, borda e alvo de clique no tamanho de antes, e o que
 * era legível vira uma tela de rótulos grandes com botões pequenos demais para
 * acertar no meio de uma gravação. Quem faz isso aqui é o `setZoomFactor` do
 * Chromium (o mesmo do zoom de navegador, e o mesmo caminho que o VS Code usa):
 * tudo — texto, ícone, filete, respiro — cresce junto e o layout se refaz
 * honestamente no tamanho novo, inclusive a decisão de a barra do transporte
 * caber em uma linha ou duas.
 *
 * **Nunca na transmissão nem na página da rede.** O corpo do texto lá é ajuste
 * de leitura do apresentador, medido para a distância dele até a tela; mexer
 * nele por causa do conforto de quem opera mudaria, sem avisar, o que o
 * apresentador está lendo. O zoom vive no processo de renderização de cada
 * janela, então aplicar aqui não vaza para as outras — mas o motivo de só a
 * janela do operador chamar isto é esse, e não um detalhe de implementação.
 *
 * A régua de rolagem também não se mexe: `PrompterStage` desenha o palco no
 * tamanho real da saída (1920×1080, por exemplo) e só encolhe com `scale()`,
 * de modo que a quebra de linha medida ali não depende do tamanho da janela.
 * Medido de 80% a 160%: o mapa de fileiras sai idêntico.
 *
 * Onde fica gravado: num arquivo do processo principal (`ui.json`), por
 * máquina — ver `main/uiScale.ts` para o porquê de não ser nem o `AppState`
 * (viajaria dentro do `.valendo`) nem o `localStorage` (não sobrevive em
 * origem `file://`).
 */

export const UI_SCALE_MIN = 0.8
export const UI_SCALE_MAX = 1.6
export const UI_SCALE_STEP = 0.05

/** Encaixa no degrau mais próximo, sem sair da faixa. */
export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  const passos = Math.round(value / UI_SCALE_STEP)
  // arredonda o ruído de ponto flutuante (0.15000000000000002) antes de limitar
  const limpo = Math.round(passos * UI_SCALE_STEP * 100) / 100
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, limpo))
}

/**
 * A escala com que a janela nasceu. Não há leitura de arquivo aqui: o main
 * aplicou o valor gravado no construtor da janela, então perguntar ao próprio
 * quadro já devolve a verdade — e sem um instante em 100% antes de corrigir.
 */
export function loadUiScale(): number {
  return clampUiScale(window.valendo.getZoom())
}

/** Aplica na hora e manda gravar para a próxima abertura. */
export function applyUiScale(scale: number): number {
  const escala = clampUiScale(scale)
  window.valendo.setZoom(escala)
  return escala
}
