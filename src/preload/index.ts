import { contextBridge, ipcRenderer, webFrame, webUtils, type IpcRendererEvent } from 'electron'
import { CHANNELS, type Action } from '@shared/actions'
import type {
  CardConvertProgress,
  CardConvertResult,
  CardDropResult,
  CardPickResult,
  CardVideoPickResult,
  ExportResult,
  ImportResult,
  MotivosDeFechar,
  ProjectResult,
  ProjetoRecente,
  StateSnapshot,
  ValendoApi
} from '@shared/api'
import type { DisplayInfo } from '@shared/types'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

/*
 * A escala com que esta janela nasceu, lida uma vez ao carregar o preload.
 *
 * Vem do main, e não de `webFrame.getZoomFactor()`: o zoom já está aplicado
 * (o construtor da janela o recebeu), mas o `getZoomFactor` só passa a
 * responder o valor real depois do primeiro quadro — e a interface monta antes
 * disso. Uma chamada síncrona, uma vez, antes de qualquer pintura.
 */
const escalaInicial = ipcRenderer.sendSync(CHANNELS.uiScaleGet) as number

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
  openProjectPath: (caminho: string) =>
    ipcRenderer.invoke(CHANNELS.projectOpenPath, caminho) as Promise<ProjectResult | null>,
  listRecentProjects: () => ipcRenderer.invoke(CHANNELS.projectRecents) as Promise<ProjetoRecente[]>,
  projectIsDirty: () => ipcRenderer.invoke(CHANNELS.projectIsDirty) as Promise<boolean>,
  openExternal: (url: string) => ipcRenderer.send(CHANNELS.openExternal, url),
  // `webFrame` é o desta janela, sem IPC — a resposta ao slider é imediata.
  // A gravação vai por IPC porque o `localStorage` de uma origem `file://`
  // (que é como a janela carrega) nunca chega ao disco: vale a sessão e some.
  // Quem chama é só a janela do operador — a transmissão e a página da rede
  // nunca escalam, porque o corpo do texto lá é ajuste de leitura do
  // apresentador, não conforto de quem opera
  getZoom: () => escalaInicial,
  setZoom: (factor: number) => {
    webFrame.setZoomFactor(factor)
    ipcRenderer.send(CHANNELS.uiScaleSet, factor)
  },
  coversOperator: () => ipcRenderer.invoke(CHANNELS.broadcastCoversOperator) as Promise<boolean>,
  onState: (callback) => subscribe<StateSnapshot>(CHANNELS.stateChanged, callback),
  onDisplays: (callback) => subscribe<DisplayInfo[]>(CHANNELS.displaysChanged, callback),
  onConfirmClose: (callback) => subscribe<MotivosDeFechar>(CHANNELS.confirmCloseRequest, callback),
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
