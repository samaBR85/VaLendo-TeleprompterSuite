import { readFile, writeFile } from 'node:fs/promises'
import { PROJECT_EXTENSION, readProject, serializeProject } from '@shared/project'
import type { AppState } from '@shared/types'
import { mergeAppearance } from './mergeAppearance'

export const PROJECT_FILTERS = [{ name: 'Projeto do VaLendo', extensions: [PROJECT_EXTENSION] }]

export function projectFileName(title: string): string {
  const limpo = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${/[\p{L}\p{N}]/u.test(limpo) ? limpo : 'projeto'}.${PROJECT_EXTENSION}`
}

export async function saveProject(filePath: string, state: AppState): Promise<void> {
  await writeFile(filePath, serializeProject(state, Date.now()), 'utf8')
}

export async function openProject(filePath: string): Promise<{ state: AppState | null; error: string | null }> {
  let contents: string
  try {
    contents = await readFile(filePath, 'utf8')
  } catch (error) {
    return { state: null, error: `Não deu para ler o arquivo: ${(error as Error).message}` }
  }

  const { state, error } = readProject(contents)
  if (!state) return { state: null, error }

  // um projeto gravado por versão anterior não tem os campos que vieram depois,
  // e ausente não dá erro — daria o oposto do padrão, em silêncio
  return {
    state: { ...state, tabs: state.tabs.map((tab) => ({ ...tab, appearance: mergeAppearance(tab.appearance) })) },
    error: null
  }
}
