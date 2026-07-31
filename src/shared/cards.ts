import type { AppState, Cartao } from './types'

/** Quantos cartões cabem — um por atalho, de Ctrl+Shift+1 a 6. */
export const MAX_CARTOES = 6

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
