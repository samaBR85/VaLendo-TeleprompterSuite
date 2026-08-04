import type { Tab } from './types'

/** o `gap-[3px]` da fileira de abas — entra na conta do vão que se abre */
export const RESPIRO = 3

export interface Arrasto {
  tabId: string
  /** onde a aba pousaria se soltasse agora, medido ANTES de ela sair da fila */
  sobre: number
  /**
   * A largura da ficha arrastada, mais o respiro.
   *
   * Medida, e não uma constante como na gaveta de cartões: lá os ladrilhos
   * têm todos 160px, aqui as fichas dividem a linha entre si — e a ativa
   * ainda é mais larga que as outras. O vão que se abre é do tamanho da que
   * saiu, então o número tem de vir dela.
   */
  larguraPx: number
}

/**
 * Quanto a aba no índice `i` desliza para revelar o vão de pouso.
 *
 * Só quem está ENTRE a origem e o alvo se mexe, como numa lista arrastável de
 * verdade: as outras ficam paradas. A própria aba arrastada também não desliza
 * — ela já está sob o ponteiro, e movê-la faria a ficha fugir da mão.
 */
export function deslocamentoDoArrasto(tabs: Tab[], arrasto: Arrasto | null, i: number): number {
  if (!arrasto) return 0
  const origem = tabs.findIndex((t) => t.id === arrasto.tabId)
  if (origem === -1 || tabs[i]?.id === arrasto.tabId) return 0
  /*
   * A MESMA conta do reducer (`tab/reorder`): tirar a aba de `origem` desloca
   * os índices depois dela, então o pouso real é um a menos quando ela anda
   * para a frente. Se as duas contas divergirem, a prévia mostra um vão e o
   * soltar entrega outro — e o operador aprende a não confiar na animação.
   */
  const alvo = origem < arrasto.sobre ? arrasto.sobre - 1 : arrasto.sobre
  if (origem < alvo && i > origem && i <= alvo) return -arrasto.larguraPx
  if (origem > alvo && i >= alvo && i < origem) return arrasto.larguraPx
  return 0
}
