import type { AjudaId } from './ajuda'
import type { AppState, CardOverlayStyle, Cartao } from './types'

/**
 * Quantos cartões ganham atalho de teclado: Ctrl+Shift+1 a 9.
 *
 * Não é um teto de cartões. Já foi — o programa parava no sexto porque só
 * havia seis atalhos, e enquanto os cartões viviam num modal o atalho era o
 * único jeito rápido de acionar. Com a gaveta, as artes estão à vista e o
 * clique serve; do décimo em diante o cartão existe e funciona, só não tem
 * tecla própria.
 */
export const CARTOES_COM_ATALHO = 9

/**
 * O cartão que está na tela do apresentador, ou nada.
 *
 * Um só lugar decide isso, porque quatro superfícies desenham a partir dele:
 * a transmissão, a prévia do operador, a prévia da Mesa e a página da rede.
 */
export function cartaoNoAr(state: AppState): Cartao | null {
  if (!state.transport.card) return null
  return state.cards.find((c) => c.id === state.transport.card) ?? null
}

/** Id novo, curto o bastante para virar nome de arquivo sem susto. */
export function novoCartaoId(agora: number, semente: number): string {
  return `c${agora.toString(36)}${semente.toString(36)}`
}

/**
 * Identifica um arrasto de reordenar cartão, para distinguir de um arrasto
 * de arquivo do sistema operacional — a gaveta e a coluna de assets aceitam
 * os dois tipos de solta, cada um com sua reação própria.
 */
export const CARD_DRAG_MIME = 'application/x-valendo-card'

/**
 * O MIME do arrasto de ABA, separado do de cartão.
 *
 * Separado porque a gaveta e a fileira de abas convivem na mesma tela, e o
 * `dragover` de cada uma pergunta pelo tipo antes de aceitar. Com um MIME só,
 * arrastar um cartão para cima das abas pareceria um alvo válido — e soltar
 * ali reordenaria alguma coisa que não é aquela.
 */
export const TAB_DRAG_MIME = 'application/x-valendo-tab'

/**
 * Os três estilos de legibilidade do OVERLAY, na ordem em que aparecem.
 *
 * Mora aqui, e não em quem desenha, porque agora TRÊS lugares oferecem a
 * mesma escolha: o cabeçalho "Cartões do bloco" da coluna de assets, o
 * cabeçalho da gaveta e — pelo `style` do estado — a saída em si. Repetir a
 * lista em cada um era garantir que uma hora elas ficassem em ordens
 * diferentes, ou que um estilo novo entrasse só em duas.
 *
 * A letra é a inicial em português (Faixa, Sombra, Nenhum) e não é traduzida:
 * são três botões de 16px, e o rótulo por extenso vive no `title`. Trocar a
 * letra por idioma faria o operador reaprender a posição ao trocar de língua,
 * que é justamente o que uma marca curta e fixa evita.
 */
export const ESTILOS_DE_OVERLAY: {
  style: CardOverlayStyle
  letra: string
  rotulo: 'cards.overlayStyle.faixa' | 'cards.overlayStyle.sombra' | 'cards.overlayStyle.nenhum'
  /** o id da Ajuda rápida — a lista mora aqui, então o par também */
  ajudaId: AjudaId
}[] = [
  { style: 'faixa', letra: 'F', rotulo: 'cards.overlayStyle.faixa', ajudaId: 'overlay.styleBand' },
  { style: 'sombra', letra: 'S', rotulo: 'cards.overlayStyle.sombra', ajudaId: 'overlay.styleShadow' },
  { style: 'nenhum', letra: 'N', rotulo: 'cards.overlayStyle.nenhum', ajudaId: 'overlay.styleNone' }
]
