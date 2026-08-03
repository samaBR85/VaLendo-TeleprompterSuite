import type { AppState } from './types'
import { MAQUINA_PADRAO } from './defaults'
import { CRONOMETRO_PARADO } from './pacing'
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

/**
 * O que não faz sentido guardar: estado de momento, não de projeto.
 *
 * Exportada porque é também a normalização usada para saber se o projeto tem
 * mudança não salva — comparar o estado bruto acusaria "sujo" só por ter dado
 * play, sem o operador ter tocado em nada que fosse parar no arquivo.
 */
export function semTransitorio(state: AppState): AppState {
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
      independentStartedAt: 0
    },
    // o monitor escolhido viaja, mas a transmissão nunca sobe sozinha ao abrir:
    // abrir um projeto não pode jogar texto na tela do apresentador
    output: { ...state.output, enabled: false, viewport: null }
  }
}

/**
 * O que é da MÁQUINA, e não do programa: sai do arquivo de projeto.
 *
 * Filtro separado do `semTransitorio` porque a pergunta é outra. Aquele
 * responde "isto é estado de momento?" e vale para os dois destinos — o
 * `workspace.json` e o `.valendo`. Este responde "isto é do computador de
 * quem opera?" e vale só para o `.valendo`: o workspace guarda tudo, senão a
 * escolha morreria ao fechar o app, que é justamente o que se quer evitar.
 *
 * O motivo é o projeto atravessar máquinas. O mesmo `.valendo` abre no
 * notebook de quem escreveu e na estação do estúdio, com monitores, olhos e
 * hábitos diferentes; se ele carregasse a posição da janela e o tamanho das
 * miniaturas, abrir o programa de um colega refaria a mesa de quem abriu.
 *
 * Devolve o padrão de fábrica em vez de apagar o campo: o formato do arquivo
 * segue o mesmo em qualquer projeto, e é isso que permite comparar dois
 * estados para saber se há mudança não salva — sem isto, arrastar o slider das
 * miniaturas marcaria o projeto como sujo.
 */
export function semMaquina(state: AppState): AppState {
  return { ...state, maquina: MAQUINA_PADRAO }
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
    state: semMaquina(semTransitorio(state)),
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
    return { state: null, error: 'Este arquivo não é um projeto do Valendo.', imagens: {} }
  }

  if (parsed?.app !== MARCA) {
    return { state: null, error: 'Este arquivo não é um projeto do Valendo.', imagens: {} }
  }

  if (typeof parsed.formato === 'number' && parsed.formato > FORMATO) {
    return {
      state: null,
      error: 'Este projeto foi salvo por uma versão mais nova do Valendo. Atualize o app para abrir.',
      imagens: {}
    }
  }

  const state = parsed.state
  if (!state || !Array.isArray(state.tabs) || state.tabs.length === 0) {
    return { state: null, error: 'O projeto está sem roteiro dentro.', imagens: {} }
  }

  // o `semMaquina` na leitura é cinto e suspensório: um arquivo gravado por
  // versão anterior a esta separação carrega a janela de quem o salvou, e sem
  // isto ela entraria no estado de quem abre
  return { state: semMaquina(semTransitorio(state)), error: null, imagens: parsed.imagens ?? {} }
}
