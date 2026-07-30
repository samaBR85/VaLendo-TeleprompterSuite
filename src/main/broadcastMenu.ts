import type { DisplayInfo } from '@shared/types'

export interface BroadcastMenuEntry {
  label: string
  /** null significa encerrar a transmissão */
  displayId: number | null
  checked: boolean
  separatorBefore?: boolean
}

/**
 * Itens do menu de contexto da janela de transmissão.
 *
 * Existe porque escolher o monitor errado é fácil e caro: se a transmissão
 * abre em cima do operador, ela cobre a interface inteira e não há mais como
 * clicar em nada. Este menu é a única saída sem fechar o app à força, então
 * precisa sempre oferecer todos os monitores e o encerrar.
 */
export function buildBroadcastMenu(
  displays: DisplayInfo[],
  currentDisplayId: number | null
): BroadcastMenuEntry[] {
  const entries: BroadcastMenuEntry[] = displays.map((display) => ({
    label: display.primary ? `${display.label} · principal` : display.label,
    displayId: display.id,
    checked: display.id === currentDisplayId
  }))

  entries.push({
    label: 'Encerrar a transmissão',
    displayId: null,
    checked: false,
    separatorBefore: true
  })

  return entries
}
