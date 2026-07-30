import type { Action, HistoryInfo } from './actions'
import type { AppState, DisplayInfo } from './types'

export interface StateSnapshot {
  state: AppState
  history: HistoryInfo
  /**
   * Fileiras visuais medidas para cada linha da aba ativa.
   *
   * Vive fora do `AppState` de propósito: é medida, não configuração, e não
   * faz sentido gravar no workspace. Mas precisa chegar às duas janelas para
   * que main e renderer usem exatamente a mesma régua de rolagem.
   */
  rows: number[]
  storage: StorageHealth
}

/**
 * Se o app está conseguindo gravar o que o operador faz.
 *
 * Existe porque a falha que já aconteceu foi silenciosa: o app seguiu
 * funcionando por meia hora sem gravar nada, e só dava para descobrir olhando
 * a data do arquivo por fora. Um teleprompter que perde texto sem avisar é
 * pior que um que não abre.
 */
export interface StorageHealth {
  /**
   * Condição de agora: não está dando para gravar. Some sozinho no instante em
   * que uma gravação dá certo de novo.
   */
  problem: string | null
  /**
   * Algo que já aconteceu e o operador precisa saber — o trabalho gravado veio
   * ilegível, por exemplo. Fica até ele dispensar.
   *
   * Separado de `problem` porque a primeira versão disto sumia sozinha: o app
   * não conseguia ler o roteiro, avisava, e meio segundo depois o primeiro
   * salvamento bem-sucedido apagava o aviso da tela. Ninguém nunca veria.
   */
  notice: string | null
}

export interface ImportResult {
  title: string
  text: string
  /** o que o operador precisa saber sobre a conversão, se houver algo */
  warnings: string[]
}

/** Superfície exposta pelo preload. O renderer só conhece isto do processo main. */
export interface ValendoApi {
  platform: NodeJS.Platform
  getState(): Promise<StateSnapshot>
  dispatch(action: Action): void
  listDisplays(): Promise<DisplayInfo[]>
  identifyDisplays(): void
  /** abre o seletor de arquivo e devolve o roteiro já convertido e limpo */
  importDocument(): Promise<ImportResult | null>
  openExternal(url: string): void
  /** a transmissão está por cima da janela do operador? */
  coversOperator(): Promise<boolean>
  onState(callback: (snapshot: StateSnapshot) => void): () => void
  onDisplays(callback: (displays: DisplayInfo[]) => void): () => void
}
