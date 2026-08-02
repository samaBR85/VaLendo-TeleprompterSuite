import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import { CHANNELS, type Action } from '@shared/actions'
import type {
  CardConvertProgress,
  CardConvertResult,
  CardDropResult,
  CardPickResult,
  CardVideoPickResult,
  ExportResult,
  ImportResult,
  ProjectResult,
  StateSnapshot,
  ValendoApi
} from '@shared/api'
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
  saveProject: (saveAs = false) => ipcRenderer.invoke(CHANNELS.projectSave, saveAs) as Promise<ProjectResult | null>,
  openProject: () => ipcRenderer.invoke(CHANNELS.projectOpen) as Promise<ProjectResult | null>,
  projectIsDirty: () => ipcRenderer.invoke(CHANNELS.projectIsDirty) as Promise<boolean>,
  openExternal: (url: string) => ipcRenderer.send(CHANNELS.openExternal, url),
  coversOperator: () => ipcRenderer.invoke(CHANNELS.broadcastCoversOperator) as Promise<boolean>,
  onState: (callback) => subscribe<StateSnapshot>(CHANNELS.stateChanged, callback),
  onDisplays: (callback) => subscribe<DisplayInfo[]>(CHANNELS.displaysChanged, callback),
  onConfirmClose: (callback) => subscribe<void>(CHANNELS.confirmCloseRequest, callback),
  respondToClose: (confirmed: boolean) => ipcRenderer.send(CHANNELS.confirmCloseResponse, confirmed),
  pickCardImage: (cardId: string) =>
    ipcRenderer.invoke(CHANNELS.cardPick, cardId) as Promise<CardPickResult | null>,
  pickCardVideo: (cardId: string) =>
    ipcRenderer.invoke(CHANNELS.cardPickVideo, cardId) as Promise<CardVideoPickResult | null>,
  // `File.path` não existe mais no Chromium; só o preload pode perguntar o
  // caminho real de um arquivo solto na janela
  pathForFile: (file: File) => webUtils.getPathForFile(file),
  importCardPath: (cardId: string, caminho: string) =>
    ipcRenderer.invoke(CHANNELS.cardImportPath, cardId, caminho) as Promise<CardDropResult | null>,
  convertCardVideo: (cardId: string) =>
    ipcRenderer.invoke(CHANNELS.cardConvert, cardId) as Promise<CardConvertResult>,
  onCardConvert: (callback) => subscribe<CardConvertProgress | null>(CHANNELS.cardConvertProgress, callback)
}

contextBridge.exposeInMainWorld('valendo', api)
