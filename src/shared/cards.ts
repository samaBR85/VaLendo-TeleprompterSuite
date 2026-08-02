import type { AppState, Cartao } from './types'

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
