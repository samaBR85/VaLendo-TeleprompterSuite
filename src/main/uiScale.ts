import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A escala da interface do operador, gravada por MÁQUINA.
 *
 * Arquivo próprio, e não `AppState`: tudo que entra no estado viaja dentro do
 * `.valendo`, e abrir o projeto de um colega redimensionaria a interface dele
 * na sua tela. Escala é do olho de quem opera e do monitor à frente dele.
 *
 * E não em `defaults.json` (o "jeito do operador" — aparência e ritmo com que
 * uma aba nasce): aquele arquivo tem um "voltar ao de fábrica" que o operador
 * dispara para recomeçar a APARÊNCIA do roteiro, e ele levaria a escala da
 * mesa junto, sem ter sido pedido.
 *
 * Ficou no processo principal por um motivo medido, não por gosto: guardado no
 * `localStorage` do renderer, o valor nunca chegava ao disco — a janela carrega
 * de uma origem `file://`, e nela o Chromium mantém o armazenamento só em
 * memória. Funcionava a sessão inteira e sumia ao fechar.
 */

export const UI_SCALE_MIN = 0.8
export const UI_SCALE_MAX = 1.6

function uiScalePath(dir: string): string {
  return join(dir, 'ui.json')
}

export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(value * 100) / 100))
}

/** 100% quando não há nada gravado, ou quando o que há não dá para ler. */
export function loadUiScale(dir: string): number {
  const path = uiScalePath(dir)
  if (!existsSync(path)) return 1
  try {
    const saved = JSON.parse(readFileSync(path, 'utf8')) as { scale?: unknown }
    return clampUiScale(Number(saved?.scale))
  } catch {
    return 1
  }
}

/** Grava em .tmp e renomeia, como os outros arquivos do app. */
export function saveUiScale(dir: string, scale: number): void {
  const path = uiScalePath(dir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${JSON.stringify({ scale: clampUiScale(scale) }, null, 2)}\n`, 'utf8')
  renameSync(tmp, path)
}
