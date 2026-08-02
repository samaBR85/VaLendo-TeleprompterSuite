import { readFile, writeFile } from 'node:fs/promises'
import { DEFAULT_CARD_OVERLAY, EDITION_SPLIT_DEFAULT, SIDEBAR_WIDTH_DEFAULT } from '@shared/defaults'
import { PROJECT_EXTENSION, readProject, semTransitorio, serializeProject } from '@shared/project'
import type { AppState } from '@shared/types'
import { readCardImage, writeCardImage } from './cards'
import { mergeAppearance } from './mergeAppearance'

export const PROJECT_FILTERS = [{ name: 'Projeto do Valendo', extensions: [PROJECT_EXTENSION] }]

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

/**
 * O retrato do que foi salvo ou aberto por último — a régua contra a qual "há
 * mudança não salva?" se mede.
 *
 * Comparado depois de `semTransitorio`: dar play não pode acusar o projeto de
 * sujo, já que isso nunca vai parar no arquivo. `null` só antes do primeiro
 * `markProjectClean` da sessão, o que não deveria acontecer — `index.ts` chama
 * isso assim que o `Store` nasce.
 */
let ultimoRetrato: string | null = null

export function markProjectClean(state: AppState): void {
  ultimoRetrato = JSON.stringify(semTransitorio(state))
}

/** Sem retrato ainda, não há como acusar sujeira — o mais seguro é dizer que não há. */
export function projectIsDirty(state: AppState): boolean {
  if (ultimoRetrato === null) return false
  return JSON.stringify(semTransitorio(state)) !== ultimoRetrato
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
      cardOverlay: state.cardOverlay ?? DEFAULT_CARD_OVERLAY,
      sidebarWidth: state.sidebarWidth ?? SIDEBAR_WIDTH_DEFAULT,
      editionSplit: state.editionSplit ?? EDITION_SPLIT_DEFAULT,
      window: state.window ?? null,
      transport: { ...state.transport, loop: state.transport.loop ?? false },
      tabs: state.tabs.map((tab) => ({ ...tab, appearance: mergeAppearance(tab.appearance) }))
    },
    error: null
  }
}
