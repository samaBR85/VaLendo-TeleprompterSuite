import type { Lang } from './i18n/types'
import type { Anchor, Appearance, AppState, Cartao, CardOverlayStyle, LayoutMode, TransportPosition } from './types'
import type { PerfilDeRede } from './proxy'

/**
 * Tudo que muda estado passa por aqui. O renderer nunca escreve direto: manda
 * a ação para o main, que é a fonte de verdade, e recebe o estado de volta.
 * Assim a janela do operador e a da transmissão não têm como divergir.
 */
export type Action =
  | { type: 'text/set'; tabId: string; text: string }
  | { type: 'appearance/patch'; tabId: string; patch: Partial<Appearance> }
  | { type: 'appearance/invert'; tabId: string }
  | { type: 'appearance/preset'; tabId: string; presetId: string }
  | { type: 'transport/toggle' }
  | { type: 'transport/pause' }
  | { type: 'transport/restart' }
  | { type: 'transport/seekWords'; delta: number }
  | { type: 'transport/seekAnchor'; anchor: Anchor }
  | { type: 'transport/ppm'; ppm: number }
  | { type: 'transport/nudgePpm'; delta: number }
  | { type: 'transport/blackout' }
  | { type: 'transport/freeze' }
  /** ao chegar no fim do roteiro, volta ao início e continua tocando */
  | { type: 'transport/loop' }
  | { type: 'card/add'; card: Cartao }
  | { type: 'card/remove'; cardId: string }
  /** arrastar reordena — o cartão sai de onde está e entra em `toIndex` */
  | { type: 'card/reorder'; cardId: string; toIndex: number }
  | { type: 'card/rename'; cardId: string; nome: string }
  | { type: 'card/text'; cardId: string; texto: string }
  /** o operador reimportou a arte de um cartão de imagem cujo arquivo sumiu */
  | { type: 'card/imageFile'; cardId: string; arquivo: string }
  /** mostra o cartão; passar o que já está no ar tira ele da tela */
  | { type: 'card/show'; cardId: string | null }
  | { type: 'card/videoPlay'; tocando: boolean }
  /**
   * `arrastando` distingue a barra na mão do operador de um pulo já decidido:
   * com ela na mão, as saídas seguram o quadro e só acompanham no soltar.
   *
   * `cardId` é sempre o cartão da barra que o operador está mexendo — no ar
   * ou não. Fora do ar, só a posição salva do cartão (`pausedAt`) muda; no
   * ar, o relógio compartilhado muda também, porque é ele que as saídas
   * seguem.
   */
  | { type: 'card/videoSeek'; cardId: string; segundo: number; arrastando: boolean }
  | { type: 'card/videoVolume'; volume: number }
  | { type: 'card/videoLoop'; cardId: string; loop: boolean }
  /** o texto da Transmissão sobrepõe este cartão em vez de substituí-lo */
  | { type: 'card/overlay'; cardId: string; overlay: boolean }
  /** o vídeo carregou e informou quanto dura — a barra precisa saber o fim */
  | { type: 'card/videoDuration'; cardId: string; duracao: number }
  /** um quadro do vídeo virou miniatura; é o que viaja no projeto */
  | { type: 'card/videoPoster'; cardId: string; poster: string }
  /** o operador reapontou o arquivo, ou o main descobriu que ele sumiu */
  | {
      type: 'card/videoLink'
      cardId: string
      caminho?: string
      arquivoNome?: string
      /** cópia tocável recém-gerada; `null` limpa a que existia */
      convertido?: string | null
      vinculado: boolean
    }
  | { type: 'layout/cards'; visible: boolean }
  | { type: 'layout/cardsHeight'; height: number }
  | { type: 'layout/sidebarWidth'; width: number }
  /** a divisória Edição×Transmissão, arrastada no Split */
  | { type: 'layout/split'; ratio: number }
  /** posição/tamanho da janela do operador, capturado ao mover/redimensionar/fechar */
  | { type: 'window/bounds'; bounds: { width: number; height: number; x: number; y: number } }
  | { type: 'marker/add'; tabId: string; blockId: string; label: string }
  | { type: 'marker/remove'; tabId: string; markerId: string }
  | { type: 'tab/add' }
  | { type: 'tab/close'; tabId: string }
  | { type: 'tab/activate'; tabId: string }
  | { type: 'tab/rename'; tabId: string; title: string }
  | { type: 'app/language'; language: Lang }
  | { type: 'layout/mode'; mode: LayoutMode }
  | { type: 'layout/transportPosition'; position: TransportPosition }
  | { type: 'layout/inspector'; visible: boolean }
  | { type: 'layout/sidebar'; visible: boolean }
  | { type: 'layout/rows'; tabId: string; rows: number[] }
  | { type: 'output/set'; displayId: number | null; enabled: boolean }
  | { type: 'output/viewport'; width: number; height: number }
  | { type: 'keymap/set'; commandId: string; binding: string | null }
  | { type: 'defaults/save' }
  | { type: 'defaults/reset' }
  | { type: 'storage/dismissNotice' }
  | { type: 'document/exportedTo'; tabId: string; path: string }
  | { type: 'project/replace'; state: AppState }
  | { type: 'project/pathSet'; path: string | null }
  | { type: 'project/new' }
  | { type: 'webview/set'; enabled: boolean }
  | { type: 'webview/videoPerfil'; perfil: PerfilDeRede }
  /** o interruptor "OVERLAY": ligado, força o texto por cima de qualquer cartão */
  | { type: 'cardOverlay/set'; enabled: boolean }
  | { type: 'cardOverlay/style'; style: CardOverlayStyle }
  /** a cópia leve ficou pronta (ou foi descartada, com `null`) */
  | { type: 'card/videoProxy'; cardId: string; proxy: { arquivo: string; perfil: PerfilDeRede } | null }
  | { type: 'history/undo'; tabId: string }
  | { type: 'history/redo'; tabId: string }
  | { type: 'document/import'; title: string; text: string; intoNewTab: boolean }

export interface HistoryInfo {
  canUndo: boolean
  canRedo: boolean
  depth: number
}

export const CHANNELS = {
  stateGet: 'state:get',
  stateAction: 'state:action',
  stateChanged: 'state:changed',
  historyInfo: 'history:info',
  displaysList: 'displays:list',
  displaysChanged: 'displays:changed',
  displaysIdentify: 'displays:identify',
  importDocument: 'document:import',
  exportDocument: 'document:export',
  projectSave: 'project:save',
  projectOpen: 'project:open',
  projectIsDirty: 'project:isDirty',
  openExternal: 'app:openExternal',
  broadcastCoversOperator: 'broadcast:coversOperator',
  confirmCloseRequest: 'app:confirmCloseRequest',
  confirmCloseResponse: 'app:confirmCloseResponse',
  cardPick: 'card:pick',
  cardPickVideo: 'card:pickVideo',
  cardImportPath: 'card:importPath',
  cardConvert: 'card:convert',
  cardConvertProgress: 'card:convertProgress'
} as const
