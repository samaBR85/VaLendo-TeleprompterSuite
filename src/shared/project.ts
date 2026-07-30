import type { AppState } from './types'

export const PROJECT_EXTENSION = 'valendo'
const MARCA = 'VaLendo'
const FORMATO = 1

/**
 * O retrato completo do programa: abas, texto, aparência, marcadores, ritmo,
 * relógios e presets.
 *
 * Diferente do workspace, que é um só e é sempre o trabalho de agora, o projeto
 * é um arquivo que você guarda e reabre — o programa de terça, com tudo no
 * lugar, em qualquer máquina.
 */
export interface ProjectFile {
  app: typeof MARCA
  /** versão do formato, para uma leitura futura saber o que está lendo */
  formato: number
  salvoEm: string
  state: AppState
}

/** O que não faz sentido guardar: estado de momento, não de projeto. */
function semTransitorio(state: AppState): AppState {
  return {
    ...state,
    transport: { ...state.transport, playing: false, blackout: false, frozen: false, startedAt: 0 },
    // o monitor escolhido viaja, mas a transmissão nunca sobe sozinha ao abrir:
    // abrir um projeto não pode jogar texto na tela do apresentador
    output: { ...state.output, enabled: false, viewport: null }
  }
}

export function buildProject(state: AppState, agora: number): ProjectFile {
  return {
    app: MARCA,
    formato: FORMATO,
    salvoEm: new Date(agora).toISOString(),
    state: semTransitorio(state)
  }
}

export function serializeProject(state: AppState, agora: number): string {
  return `${JSON.stringify(buildProject(state, agora), null, 2)}\n`
}

export interface ProjectReadResult {
  state: AppState | null
  /** mensagem pronta para a tela quando não deu para abrir */
  error: string | null
}

/**
 * Lê o arquivo sem confiar nele.
 *
 * Um projeto pode vir de outra máquina, de outra versão, ou de um arquivo que
 * alguém renomeou. Vale mais recusar com uma frase clara do que abrir o app com
 * meio estado e deixar o operador descobrir no ar.
 */
export function readProject(contents: string): ProjectReadResult {
  let parsed: Partial<ProjectFile>
  try {
    parsed = JSON.parse(contents) as Partial<ProjectFile>
  } catch {
    return { state: null, error: 'Este arquivo não é um projeto do VaLendo.' }
  }

  if (parsed?.app !== MARCA) {
    return { state: null, error: 'Este arquivo não é um projeto do VaLendo.' }
  }

  if (typeof parsed.formato === 'number' && parsed.formato > FORMATO) {
    return {
      state: null,
      error: 'Este projeto foi salvo por uma versão mais nova do VaLendo. Atualize o app para abrir.'
    }
  }

  const state = parsed.state
  if (!state || !Array.isArray(state.tabs) || state.tabs.length === 0) {
    return { state: null, error: 'O projeto está sem roteiro dentro.' }
  }

  return { state: semTransitorio(state), error: null }
}
