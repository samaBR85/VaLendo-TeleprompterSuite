import type { AppState } from './types'
import { CRONOMETRO_PARADO, RELOGIO_LIVRE_PARADO } from './pacing'
import { VIDEO_PARADO } from './video'

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
  /**
   * As imagens dos cartões, em base64, por nome de arquivo.
   *
   * Vão embutidas para o projeto abrir igual noutra máquina — um standby que
   * não aparece no estúdio novo não serve de nada. Só aqui: o workspace, que é
   * regravado a cada meio segundo, continua guardando apenas a referência.
   */
  imagens?: Record<string, string>
}

/** O que não faz sentido guardar: estado de momento, não de projeto. */
function semTransitorio(state: AppState): AppState {
  return {
    ...state,
    transport: {
      ...state.transport,
      playing: false,
      blackout: false,
      frozen: false,
      card: null,
      startedAt: 0,
      video: VIDEO_PARADO,
      stopwatch: CRONOMETRO_PARADO,
      freeClock: RELOGIO_LIVRE_PARADO
    },
    // o monitor escolhido viaja, mas a transmissão nunca sobe sozinha ao abrir:
    // abrir um projeto não pode jogar texto na tela do apresentador
    output: { ...state.output, enabled: false, viewport: null }
  }
}

export function buildProject(
  state: AppState,
  agora: number,
  imagens: Record<string, string> = {}
): ProjectFile {
  return {
    app: MARCA,
    formato: FORMATO,
    salvoEm: new Date(agora).toISOString(),
    state: semTransitorio(state),
    // só entra quando há o que guardar: um programa sem cartão continua
    // gerando o mesmo arquivo enxuto de antes
    ...(Object.keys(imagens).length > 0 ? { imagens } : {})
  }
}

export function serializeProject(
  state: AppState,
  agora: number,
  imagens: Record<string, string> = {}
): string {
  return `${JSON.stringify(buildProject(state, agora, imagens), null, 2)}\n`
}

export interface ProjectReadResult {
  state: AppState | null
  /** mensagem pronta para a tela quando não deu para abrir */
  error: string | null
  /** imagens que vinham dentro, para o main gravar antes de mostrar */
  imagens: Record<string, string>
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
    return { state: null, error: 'Este arquivo não é um projeto do VaLendo.', imagens: {} }
  }

  if (parsed?.app !== MARCA) {
    return { state: null, error: 'Este arquivo não é um projeto do VaLendo.', imagens: {} }
  }

  if (typeof parsed.formato === 'number' && parsed.formato > FORMATO) {
    return {
      state: null,
      error: 'Este projeto foi salvo por uma versão mais nova do VaLendo. Atualize o app para abrir.',
      imagens: {}
    }
  }

  const state = parsed.state
  if (!state || !Array.isArray(state.tabs) || state.tabs.length === 0) {
    return { state: null, error: 'O projeto está sem roteiro dentro.', imagens: {} }
  }

  return { state: semTransitorio(state), error: null, imagens: parsed.imagens ?? {} }
}
