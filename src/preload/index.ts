import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNELS, type Action } from '@shared/actions'
import type { CardPickResult, ExportResult, ImportResult, ProjectResult, StateSnapshot, ValendoApi } from '@shared/api'
import type { DisplayInfo } from '@shared/types'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

const api: ValendoApi = {
  platform: process.platform,
  getState: () => ipcRenderer.invoke(CHANNELS.stateGet) as Promise<StateSnapshot>,
  dispatch: (action: Action) => ipcRenderer.send(CHANNELS.stateAction, action),
  listDisplays: () => ipcRenderer.invoke(CHANNELS.displaysList) as Promise<DisplayInfo[]>,
  identifyDisplays: () => ipcRenderer.send(CHANNELS.displaysIdentify),
  importDocument: () => ipcRenderer.invoke(CHANNELS.importDocument) as Promise<ImportResult | null>,
  exportDocument: (saveAs: boolean) =>
    ipcRenderer.invoke(CHANNELS.exportDocument, saveAs) as Promise<ExportResult | null>,
  saveProject: () => ipcRenderer.invoke(CHANNELS.projectSave) as Promise<ProjectResult | null>,
  openProject: () => ipcRenderer.invoke(CHANNELS.projectOpen) as Promise<ProjectResult | null>,
  openExternal: (url: string) => ipcRenderer.send(CHANNELS.openExternal, url),
  coversOperator: () => ipcRenderer.invoke(CHANNELS.broadcastCoversOperator) as Promise<boolean>,
  onState: (callback) => subscribe<StateSnapshot>(CHANNELS.stateChanged, callback),
  onDisplays: (callback) => subscribe<DisplayInfo[]>(CHANNELS.displaysChanged, callback),
  onConfirmClose: (callback) => subscribe<void>(CHANNELS.confirmCloseRequest, callback),
  respondToClose: (confirmed: boolean) => ipcRenderer.send(CHANNELS.confirmCloseResponse, confirmed),
  pickCardImage: (cardId: string) =>
    ipcRenderer.invoke(CHANNELS.cardPick, cardId) as Promise<CardPickResult | null>
}

contextBridge.exposeInMainWorld('valendo', api)
