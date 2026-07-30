import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_APPEARANCE, SPEED_PRESETS } from '@shared/defaults'
import type { Appearance } from '@shared/types'
import { mergeAppearance } from './mergeAppearance'

/**
 * Os ajustes com que uma aba nova nasce.
 *
 * Separado do workspace de propósito: o workspace é o trabalho de hoje, isto é
 * o jeito do operador. Trocar de roteiro não pode ressetar a fonte, a margem e
 * as cores que ele levou meia hora escolhendo.
 */
export interface UserDefaults {
  appearance: Appearance
  /** palavras por minuto com que a rolagem começa */
  ppm: number
}

export const FACTORY_DEFAULTS: UserDefaults = {
  appearance: DEFAULT_APPEARANCE,
  ppm: SPEED_PRESETS[1]
}

const PPM_MIN = 60
const PPM_MAX = 500

export function defaultsPath(dir: string): string {
  return join(dir, 'defaults.json')
}

/** Completa o que foi gravado com os valores de fábrica, em todos os níveis. */
export function normalizeDefaults(saved: Partial<UserDefaults> | undefined): UserDefaults {
  const ppm = Number(saved?.ppm)
  return {
    appearance: mergeAppearance(saved?.appearance),
    ppm: Number.isFinite(ppm) ? Math.min(PPM_MAX, Math.max(PPM_MIN, Math.round(ppm))) : FACTORY_DEFAULTS.ppm
  }
}

/**
 * Devolve também se os padrões são do operador ou de fábrica: é isso que a
 * interface mostra, e o que decide se faz sentido oferecer "voltar ao de
 * fábrica". Arquivo ilegível conta como fábrica — melhor um padrão conhecido
 * do que meio padrão.
 */
export function loadUserDefaults(dir: string): { defaults: UserDefaults; custom: boolean } {
  const path = defaultsPath(dir)
  if (!existsSync(path)) return { defaults: FACTORY_DEFAULTS, custom: false }
  try {
    const saved = JSON.parse(readFileSync(path, 'utf8')) as Partial<UserDefaults>
    return { defaults: normalizeDefaults(saved), custom: true }
  } catch {
    return { defaults: FACTORY_DEFAULTS, custom: false }
  }
}

/** Grava em .tmp e renomeia: uma queda no meio não deixa o padrão pela metade. */
export function saveUserDefaults(dir: string, defaults: UserDefaults): void {
  const path = defaultsPath(dir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(defaults, null, 2), 'utf8')
  renameSync(tmp, path)
}

export function clearUserDefaults(dir: string): void {
  rmSync(defaultsPath(dir), { force: true })
}
