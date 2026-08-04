import { DEFAULT_APPEARANCE } from '@shared/defaults'
import type { Appearance, TimerPosition } from '@shared/types'
import { TIMER_POSITIONS } from '@shared/types'

/** Formato gravado por versões anteriores, do qual ainda é preciso recuperar. */
interface LegacyTimers {
  /** virou `position` quando os quatro cantos deram lugar à grade de nove */
  corner?: string
  /** virou `elapsedColor` e `remainingColor` quando cada relógio ganhou a sua */
  color?: string
}

const KNOWN_POSITIONS = new Set<string>(TIMER_POSITIONS.flat())

/**
 * Completa a aparência gravada com os padrões, em todos os níveis.
 *
 * O modo de falha aqui é silencioso: um campo que nasceu depois fica ausente
 * no workspace de quem já usava o app, e ausente não dá erro — um booleano
 * vira `false`, uma cor vira `undefined`, e o app assume o oposto do que
 * deveria sem avisar ninguém. Por isso a mescla é explícita e testada, e por
 * isso os nomes antigos continuam sendo lidos: a escolha do operador não pode
 * se perder porque o campo mudou de nome.
 */
export function mergeAppearance(saved: Partial<Appearance> | undefined): Appearance {
  const savedTimers = (saved?.timers ?? {}) as Partial<Appearance['timers']> & LegacyTimers

  return {
    ...DEFAULT_APPEARANCE,
    ...saved,
    /*
     * A lista de nomes escondidos é DERIVADA dos apresentadores, e o `spread`
     * acima traria a versão gravada — que pode estar velha, ou vir de um
     * projeto onde a lista nem existia. Zerar aqui é seguro: quem a preenche é
     * `comNomesOcultos`, no funil de estado, na primeira troca de aba.
     */
    nomesOcultos: [],
    timers: {
      ...DEFAULT_APPEARANCE.timers,
      ...savedTimers,
      position: recoverPosition(savedTimers),
      elapsedColor: savedTimers.elapsedColor ?? savedTimers.color ?? DEFAULT_APPEARANCE.timers.elapsedColor,
      remainingColor: savedTimers.remainingColor ?? DEFAULT_APPEARANCE.timers.remainingColor
    }
  }
}

function recoverPosition(timers: Partial<Appearance['timers']> & LegacyTimers): TimerPosition {
  const candidate = timers.position ?? timers.corner
  return candidate && KNOWN_POSITIONS.has(candidate)
    ? (candidate as TimerPosition)
    : DEFAULT_APPEARANCE.timers.position
}
