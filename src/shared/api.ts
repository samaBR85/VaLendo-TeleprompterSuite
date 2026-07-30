import type { Action, HistoryInfo } from './actions'
import type { AppState, DisplayInfo } from './types'

export interface StateSnapshot {
  state: AppState
  history: HistoryInfo
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
