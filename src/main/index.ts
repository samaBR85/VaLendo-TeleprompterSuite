import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron'
import { CHANNELS, type Action } from '@shared/actions'
import type { ImportResult } from '@shared/api'
import type { AppState } from '@shared/types'
import { IMPORT_FILTERS, importFile } from './import'
import { identifyDisplays, closeIdentifyWindows, listDisplays, watchDisplays } from './displays'
import { Store } from './state'
import { flushState } from './storage'
import { buildBroadcastMenu } from './broadcastMenu'
import {
  broadcastCoversOperator,
  broadcastDisplayStillExists,
  closeBroadcastWindow,
  createOperatorWindow,
  getBroadcastWindow,
  getOperatorWindow,
  onBroadcastContextMenu,
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
  ipcMain.handle(CHANNELS.stateGet, () => ({
    state: store.getState(),
    history: store.historyInfo(),
    rows: store.activeRows()
  }))
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

  ipcMain.handle(CHANNELS.broadcastCoversOperator, () => broadcastCoversOperator())
}

/**
 * Menu de contexto da transmissão: trocar de monitor ou encerrar.
 *
 * Sem ele, escolher o monitor onde está o operador cobre a interface inteira e
 * não sobra em que clicar — só fechar o app à força.
 */
function showBroadcastMenu(): void {
  const window = getBroadcastWindow()
  if (!window || window.isDestroyed()) return

  const current = store.getState().output.displayId
  const template = buildBroadcastMenu(listDisplays(), current).flatMap((entry) => [
    ...(entry.separatorBefore ? [{ type: 'separator' as const }] : []),
    {
      label: entry.label,
      type: entry.displayId === null ? ('normal' as const) : ('checkbox' as const),
      checked: entry.checked,
      click: () =>
        store.dispatch({
          type: 'output/set',
          displayId: entry.displayId ?? current,
          enabled: entry.displayId !== null
        })
    }
  ])

  Menu.buildFromTemplate(template).popup({ window })
}

function bootstrap(): void {
  registerIpc()
  onBroadcastContextMenu(showBroadcastMenu)

  store.subscribe((state, history) => {
    sendToAll(CHANNELS.stateChanged, { state, history, rows: store.activeRows() })
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
