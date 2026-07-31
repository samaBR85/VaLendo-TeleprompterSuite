import type { Action, HistoryInfo } from './actions'
import type { Appearance, AppState, Block, DisplayInfo, Transport } from './types'

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
  webview: WebviewInfo
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

/** Resultado de salvar o roteiro num arquivo. Nulo quando o operador desistiu. */
export interface ExportResult {
  ok: boolean
  /** caminho gravado, para a confirmação dizer onde o arquivo ficou */
  path: string
  format: string
  error?: string
}

/** Resultado de salvar ou abrir um projeto. Nulo quando o operador desistiu. */
export interface ProjectResult {
  ok: boolean
  path: string
  error?: string
}

/**
 * O quadro que a página da rede local recebe.
 *
 * Só o necessário para desenhar a aba que está no ar — as outras abas não
 * viajam. `now` é o relógio do computador que transmite: o telefone de quem
 * assiste pode estar com a hora errada em minutos, e sem essa referência a
 * posição da leitura sairia completamente fora do lugar.
 */
export interface WebviewFrame {
  blocks: Block[]
  appearance: Appearance
  transport: Transport
  rows: number[]
  viewport: { width: number; height: number } | null
  now: number
}

/** Estado do servidor da rede local, para a interface do operador mostrar. */
export interface WebviewInfo {
  running: boolean
  port: number
  /** endereços em que a página responde, prontos para digitar no telefone */
  addresses: string[]
  error: string | null
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
  /**
   * Salva a aba ativa num arquivo. Com `saveAs`, sempre pergunta onde; sem ele,
   * regrava por cima do último arquivo desta aba e só pergunta na primeira vez.
   */
  exportDocument(saveAs: boolean): Promise<ExportResult | null>
  /** grava o programa inteiro num .valendo: abas, aparência, marcadores, ritmo */
  saveProject(): Promise<ProjectResult | null>
  /** abre um .valendo e substitui o que está na tela */
  openProject(): Promise<ProjectResult | null>
  openExternal(url: string): void
  /** a transmissão está por cima da janela do operador? */
  coversOperator(): Promise<boolean>
  onState(callback: (snapshot: StateSnapshot) => void): () => void
  onDisplays(callback: (displays: DisplayInfo[]) => void): () => void
}
