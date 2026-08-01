import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron'
import { basename, extname } from 'node:path'
import { CHANNELS, type Action } from '@shared/actions'
import type {
  CardPickResult,
  CardVideoPickResult,
  ExportResult,
  ImportResult,
  ProjectResult,
  StateSnapshot
} from '@shared/api'
import type { AppState } from '@shared/types'
import { IMPORT_FILTERS, importFile } from './import'
import { EXPORT_FILTERS, defaultFileName, exportScript } from './export'
import { PROJECT_FILTERS, openProject, projectFileName, saveProject } from './project'
import { onWebviewChange, publish, startWebview, stopWebview, webviewInfo } from './webview'
import { identifyDisplays, closeIdentifyWindows, listDisplays, watchDisplays } from './displays'
import { cartaoNoAr } from '@shared/cards'
import { traduzir } from '@shared/i18n'
import {
  autorizarVideo,
  deleteCardImage,
  IMAGE_EXTENSIONS,
  importCardImage,
  pruneCardImages,
  registerCardProtocol,
  registerCardScheme,
  registerVideoResolver,
  videoVinculado
} from './cards'
import { ehVideo, VIDEO_EXTENSIONS } from '@shared/video'
import { Store } from './state'
import { flushState, onStorageHealth, storageHealth } from './storage'
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
  respondToCloseConfirm,
  sendToAll
} from './windows'

const store = new Store()

/** Traduz no idioma que o operador escolheu — o main também fala com ele. */
function idioma(chave: Parameters<typeof traduzir>[1], valores?: Record<string, string | number>): string {
  return traduzir(store.getState().language, chave, valores)
}

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

function snapshot(): StateSnapshot {
  return {
    state: store.getState(),
    history: store.historyInfo(),
    rows: store.activeRows(),
    storage: storageHealth(),
    webview: webviewInfo()
  }
}

/**
 * Liga ou desliga a página da rede, e manda o quadro a quem já está assistindo.
 *
 * O quadro leva só a aba que está no ar: as outras não viajam, e o que não sai
 * da máquina não vaza.
 */
function syncWebview(state: AppState): void {
  const ligado = webviewInfo().running
  if (state.webview.enabled && !ligado) startWebview()
  else if (!state.webview.enabled && ligado) stopWebview()

  if (!webviewInfo().running) return

  const tab = state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]
  publish({
    language: state.language,
    card: cartaoNoAr(state),
    blocks: tab.blocks,
    appearance: tab.appearance,
    transport: state.transport,
    rows: store.activeRows(),
    viewport: state.output.viewport,
    now: Date.now()
  })
}

function registerIpc(): void {
  ipcMain.handle(CHANNELS.stateGet, () => snapshot())
  ipcMain.on(CHANNELS.stateAction, (_event, action: Action) => {
    // a imagem some do disco junto com o cartão; precisa ser lida ANTES do
    // despacho, porque depois o cartão já não está na lista
    if (action.type === 'card/remove') {
      const alvo = store.getState().cards.find((c) => c.id === action.cardId)
      if (alvo?.kind === 'image') deleteCardImage(alvo.arquivo)
    }
    store.dispatch(action)
  })
  ipcMain.handle(CHANNELS.displaysList, () => listDisplays())
  ipcMain.on(CHANNELS.displaysIdentify, () => identifyDisplays())

  ipcMain.handle(CHANNELS.importDocument, async (): Promise<ImportResult | null> => {
    const owner = getOperatorWindow()
    const picked = owner
      ? await dialog.showOpenDialog(owner, {
          title: idioma('main.importTitle'),
          properties: ['openFile'],
          filters: IMPORT_FILTERS
        })
      : await dialog.showOpenDialog({ properties: ['openFile'], filters: IMPORT_FILTERS })

    if (picked.canceled || picked.filePaths.length === 0) return null

    try {
      return await importFile(picked.filePaths[0])
    } catch (error) {
      return {
        title: idioma('main.importFail'),
        text: '',
        warnings: [idioma('main.importFailDetail', { erro: (error as Error).message })]
      }
    }
  })

  ipcMain.handle(CHANNELS.exportDocument, async (_event, saveAs: boolean): Promise<ExportResult | null> => {
    const state = store.getState()
    const tab = state.tabs.find((t) => t.id === state.activeTabId)
    if (!tab) return null

    // sem `saveAs`, regrava por cima do último arquivo desta aba: no meio de
    // uma gravação, salvar não pode custar um diálogo e três cliques
    let target = saveAs ? '' : (tab.exportPath ?? '')

    if (!target) {
      const owner = getOperatorWindow()
      const options = {
        title: idioma('main.saveScriptTitle'),
        defaultPath: tab.exportPath || defaultFileName(tab.title),
        filters: EXPORT_FILTERS
      }
      const picked = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options)

      if (picked.canceled || !picked.filePath) return null
      target = picked.filePath
    }

    try {
      const format = await exportScript(target, tab.blocks, tab.title)
      store.dispatch({ type: 'document/exportedTo', tabId: tab.id, path: target })
      return { ok: true, path: target, format }
    } catch (error) {
      return { ok: false, path: target, format: '', error: (error as Error).message }
    }
  })

  ipcMain.handle(CHANNELS.projectSave, async (): Promise<ProjectResult | null> => {
    const state = store.getState()
    const ativa = state.tabs.find((t) => t.id === state.activeTabId)
    const owner = getOperatorWindow()
    const options = {
      title: idioma('main.saveProjectTitle'),
      defaultPath: projectFileName(ativa?.title ?? 'projeto'),
      filters: PROJECT_FILTERS
    }
    const picked = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (picked.canceled || !picked.filePath) return null

    try {
      await saveProject(picked.filePath, state)
      return { ok: true, path: picked.filePath }
    } catch (error) {
      return { ok: false, path: picked.filePath, error: (error as Error).message }
    }
  })

  ipcMain.handle(CHANNELS.projectOpen, async (): Promise<ProjectResult | null> => {
    const owner = getOperatorWindow()
    const options = {
      title: idioma('main.openProjectTitle'),
      properties: ['openFile' as const],
      filters: PROJECT_FILTERS
    }
    const picked = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return null

    const caminho = picked.filePaths[0]
    const { state, error } = await openProject(caminho)
    if (!state) return { ok: false, path: caminho, error: error ?? idioma('project.cantOpen') }

    store.dispatch({ type: 'project/replace', state })
    // as artes do programa anterior não servem mais a ninguém
    pruneCardImages(store.getState().cards)
    // os vídeos não vêm dentro do projeto: os caminhos podem apontar para
    // arquivos que não existem nesta máquina, e o cartão precisa dizer isso
    revalidarVideos()
    return { ok: true, path: caminho }
  })

  // só http(s), e sempre no navegador do sistema: o app nunca navega para fora
  // do próprio conteúdo
  ipcMain.on(CHANNELS.openExternal, (_event, url: string) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })

  ipcMain.handle(CHANNELS.broadcastCoversOperator, () => broadcastCoversOperator())

  ipcMain.on(CHANNELS.confirmCloseResponse, (_event, confirmed: boolean) => respondToCloseConfirm(confirmed))

  ipcMain.handle(CHANNELS.cardPick, async (_event, cardId: string): Promise<CardPickResult | null> => {
    const owner = getOperatorWindow()
    const options = {
      title: idioma('cards.pickTitle'),
      properties: ['openFile' as const],
      filters: [{ name: idioma('cards.imageFilter'), extensions: IMAGE_EXTENSIONS }]
    }
    const picked = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return null

    const origem = picked.filePaths[0]
    try {
      return {
        arquivo: importCardImage(origem, cardId),
        sugestao: basename(origem, extname(origem)).slice(0, 30)
      }
    } catch {
      return null
    }
  })

  /**
   * Escolher o vídeo — e é a escolha que autoriza o arquivo.
   *
   * Nada é copiado: fica onde está, e o que o app guarda é o caminho mais a
   * permissão de servi-lo. Esta é a única porta por onde um caminho entra na
   * lista de autorizados, e é por isso que um projeto vindo de fora não
   * consegue publicar arquivo nenhum sozinho.
   */
  ipcMain.handle(CHANNELS.cardPickVideo, async (): Promise<CardVideoPickResult | null> => {
    const owner = getOperatorWindow()
    const options = {
      title: idioma('cards.pickVideoTitle'),
      properties: ['openFile' as const],
      filters: [{ name: idioma('cards.videoFilter'), extensions: VIDEO_EXTENSIONS }]
    }
    const picked = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (picked.canceled || picked.filePaths.length === 0) return null

    const origem = picked.filePaths[0]
    const comum = {
      caminho: origem,
      arquivoNome: basename(origem),
      sugestao: basename(origem, extname(origem)).slice(0, 30)
    }

    // o .mov não toca nem com H.264 dentro, e é o que sai de iPhone e de
    // muita ilha: recusar aqui, com o motivo, é melhor que no meio do programa
    if (!ehVideo(origem)) {
      return { ...comum, erro: idioma('cards.videoUnsupported') }
    }

    autorizarVideo(origem)
    return comum
  })
}

/**
 * Confere se cada vídeo ainda está no lugar.
 *
 * Roda ao abrir o app e ao abrir um projeto, que são os dois momentos em que o
 * disco pode ter mudado sem o app estar olhando: arquivo movido, pasta
 * renomeada, HD externo fora, ou um projeto que veio de outra máquina e cujos
 * caminhos nunca foram autorizados aqui.
 */
function revalidarVideos(): void {
  for (const card of store.getState().cards) {
    if (card.kind !== 'video') continue
    const vinculado = videoVinculado(card.caminho)
    if (card.vinculado !== vinculado) {
      store.dispatch({ type: 'card/videoLink', cardId: card.id, vinculado })
    }
  }
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
  // o protocolo pergunta ao estado onde o vídeo daquele cartão mora: assim
  // nenhuma URL carrega caminho de disco, e não há URL a forjar
  registerVideoResolver((cardId) => {
    const card = store.getState().cards.find((c) => c.id === cardId)
    return card?.kind === 'video' ? card.caminho : null
  })
  registerCardProtocol()
  registerIpc()
  revalidarVideos()
  onBroadcastContextMenu(showBroadcastMenu)

  store.subscribe(() => {
    syncWebview(store.getState())
    sendToAll(CHANNELS.stateChanged, snapshot())
    syncOutput(store.getState())
  })

  // a gravação acontece meio segundo depois da mudança, então a notícia de que
  // ela falhou chega atrasada em relação ao estado que já foi enviado. Sem este
  // reenvio, o aviso só apareceria na tela na próxima vez que o operador
  // mexesse em alguma coisa — e pode não haver próxima vez
  onStorageHealth(() => sendToAll(CHANNELS.stateChanged, snapshot()))

  // pelo mesmo motivo: o servidor da rede sobe ou falha depois que o
  // instantâneo já saiu, e a tela precisa saber qual dos dois aconteceu
  onWebviewChange(() => sendToAll(CHANNELS.stateChanged, snapshot()))

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
// precisa acontecer antes de o app ficar pronto, senão o esquema não conta
// como seguro e a janela recusa carregar a imagem
registerCardScheme()

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
    stopWebview()
    flushState()
  })
}
