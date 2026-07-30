import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { CHANNELS, type Action } from '@shared/actions'
import type { ImportResult } from '@shared/api'
import type { AppState } from '@shared/types'
import { IMPORT_FILTERS, importFile } from './import'
import { identifyDisplays, closeIdentifyWindows, listDisplays, watchDisplays } from './displays'
import { Store } from './state'
import { flushState } from './storage'
import {
  broadcastDisplayStillExists,
  closeBroadcastWindow,
  createOperatorWindow,
  getOperatorWindow,
  openBroadcastWindow,
  sendToAll
} from './windows'

const store = new Store()

/** Assinatura da saída, para abrir e fechar a janela só quando algo realmente muda. */
function outputSignature(state: AppState): string {
  return `${state.output.enabled ? 1 : 0}:${state.output.displayId ?? 'none'}`
}

let lastOutput = ''

function syncOutput(state: AppState): void {
  const signature = outputSignature(state)
  if (signature === lastOutput) return
  lastOutput = signature

  if (state.output.enabled && state.output.displayId !== null) {
    const opened = openBroadcastWindow(state.output.displayId)
    if (!opened) store.dispatch({ type: 'output/set', displayId: null, enabled: false })
  } else {
    closeBroadcastWindow()
  }
}

function registerIpc(): void {
  ipcMain.handle(CHANNELS.stateGet, () => ({ state: store.getState(), history: store.historyInfo() }))
  ipcMain.on(CHANNELS.stateAction, (_event, action: Action) => store.dispatch(action))
  ipcMain.handle(CHANNELS.displaysList, () => listDisplays())
  ipcMain.on(CHANNELS.displaysIdentify, () => identifyDisplays())

  ipcMain.handle(CHANNELS.importDocument, async (): Promise<ImportResult | null> => {
    const owner = getOperatorWindow()
    const picked = owner
      ? await dialog.showOpenDialog(owner, {
          title: 'Importar roteiro',
          properties: ['openFile'],
          filters: IMPORT_FILTERS
        })
      : await dialog.showOpenDialog({ properties: ['openFile'], filters: IMPORT_FILTERS })

    if (picked.canceled || picked.filePaths.length === 0) return null

    try {
      return await importFile(picked.filePaths[0])
    } catch (error) {
      return {
        title: 'Falha na importação',
        text: '',
        warnings: [`Não deu para ler o arquivo: ${(error as Error).message}`]
      }
    }
  })

  // só http(s), e sempre no navegador do sistema: o app nunca navega para fora
  // do próprio conteúdo
  ipcMain.on(CHANNELS.openExternal, (_event, url: string) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })
}

function bootstrap(): void {
  registerIpc()

  store.subscribe((state, history) => {
    sendToAll(CHANNELS.stateChanged, { state, history })
    syncOutput(state)
  })

  watchDisplays((displays) => {
    sendToAll(CHANNELS.displaysChanged, displays)

    // monitor da transmissão desconectado no meio do programa: fecha a saída em
    // vez de deixar uma janela órfã em coordenadas que não existem mais
    const { output } = store.getState()
    if (output.enabled && !broadcastDisplayStillExists(output.displayId)) {
      store.dispatch({ type: 'output/set', displayId: null, enabled: false })
    }
  })

  createOperatorWindow()
  syncOutput(store.getState())
}

// uma instância só: duas janelas de operador brigando pelo mesmo workspace.json
// é receita para perder texto
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const window = getOperatorWindow()
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
  })

  void app.whenReady().then(bootstrap)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOperatorWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    closeIdentifyWindows()
    closeBroadcastWindow()
    flushState()
  })
}
