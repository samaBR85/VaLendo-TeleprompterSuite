import { readFile, writeFile } from 'node:fs/promises'
import { PROJECT_EXTENSION, readProject, serializeProject } from '@shared/project'
import type { AppState } from '@shared/types'
import { readCardImage, writeCardImage } from './cards'
import { mergeAppearance } from './mergeAppearance'

export const PROJECT_FILTERS = [{ name: 'Projeto do VaLendo', extensions: [PROJECT_EXTENSION] }]

export function projectFileName(title: string): string {
  const limpo = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${/[\p{L}\p{N}]/u.test(limpo) ? limpo : 'projeto'}.${PROJECT_EXTENSION}`
}

/** As imagens dos cartões, lidas do disco e prontas para viajar dentro do arquivo. */
function coletarImagens(state: AppState): Record<string, string> {
  const imagens: Record<string, string> = {}
  for (const card of state.cards) {
    if (card.kind !== 'image') continue
    const dados = readCardImage(card.arquivo)
    // um cartão cuja imagem sumiu do disco viaja como cartão sem imagem, e não
    // impede de salvar o programa inteiro por causa de um arquivo
    if (dados) imagens[card.arquivo] = dados.toString('base64')
  }
  return imagens
}

export async function saveProject(filePath: string, state: AppState): Promise<void> {
  await writeFile(filePath, serializeProject(state, Date.now(), coletarImagens(state)), 'utf8')
}

export async function openProject(filePath: string): Promise<{ state: AppState | null; error: string | null }> {
  let contents: string
  try {
    contents = await readFile(filePath, 'utf8')
  } catch (error) {
    return { state: null, error: `Não deu para ler o arquivo: ${(error as Error).message}` }
  }

  const { state, error, imagens } = readProject(contents)
  if (!state) return { state: null, error }

  // grava as imagens antes de o estado chegar à tela: se a ordem se invertesse,
  // a primeira pintura procuraria um arquivo que ainda não existe e o operador
  // veria o cartão falhando por um instante
  for (const [arquivo, base64] of Object.entries(imagens)) {
    try {
      writeCardImage(arquivo, Buffer.from(base64, 'base64'))
    } catch {
      // sem a imagem, o cartão aparece avisando que ela falta — melhor que
      // recusar o projeto inteiro
    }
  }

  // um projeto gravado por versão anterior não tem os campos que vieram depois,
  // e ausente não dá erro — daria o oposto do padrão, em silêncio
  return {
    state: {
      ...state,
      cards: state.cards ?? [],
      tabs: state.tabs.map((tab) => ({ ...tab, appearance: mergeAppearance(tab.appearance) }))
    },
    error: null
  }
}
