import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNELS, type Action } from '@shared/actions'
import type { ImportResult, StateSnapshot, ValendoApi } from '@shared/api'
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
  openExternal: (url: string) => ipcRenderer.send(CHANNELS.openExternal, url),
  coversOperator: () => ipcRenderer.invoke(CHANNELS.broadcastCoversOperator) as Promise<boolean>,
  onState: (callback) => subscribe<StateSnapshot>(CHANNELS.stateChanged, callback),
  onDisplays: (callback) => subscribe<DisplayInfo[]>(CHANNELS.displaysChanged, callback)
}

contextBridge.exposeInMainWorld('valendo', api)
