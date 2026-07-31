import type { Anchor, Appearance, AppState, LayoutMode } from './types'

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
  | { type: 'marker/add'; tabId: string; blockId: string; label: string }
  | { type: 'marker/remove'; tabId: string; markerId: string }
  | { type: 'tab/add' }
  | { type: 'tab/close'; tabId: string }
  | { type: 'tab/activate'; tabId: string }
  | { type: 'tab/rename'; tabId: string; title: string }
  | { type: 'layout/mode'; mode: LayoutMode }
  | { type: 'layout/inspector'; visible: boolean }
  | { type: 'layout/rows'; tabId: string; rows: number[] }
  | { type: 'output/set'; displayId: number | null; enabled: boolean }
  | { type: 'output/viewport'; width: number; height: number }
  | { type: 'keymap/set'; commandId: string; binding: string | null }
  | { type: 'defaults/save' }
  | { type: 'defaults/reset' }
  | { type: 'storage/dismissNotice' }
  | { type: 'document/exportedTo'; tabId: string; path: string }
  | { type: 'project/replace'; state: AppState }
  | { type: 'webview/set'; enabled: boolean }
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
  openExternal: 'app:openExternal',
  broadcastCoversOperator: 'broadcast:coversOperator'
} as const
