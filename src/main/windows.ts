import { BrowserWindow, Menu, powerSaveBlocker, screen } from 'electron'
import { join } from 'node:path'
import { CHANNELS } from '@shared/actions'
import { findDisplay } from './displays'

const isMac = process.platform === 'darwin'
const preload = join(__dirname, '../preload/index.js')

/**
 * Menu de contexto da janela de transmissão.
 *
 * É a saída de emergência: escolher sem querer o monitor onde está o operador
 * cobre a interface inteira, e sem isso só resta fechar o app à força.
 */
let contextMenuHandler: (() => void) | null = null

export function onBroadcastContextMenu(handler: () => void): void {
  contextMenuHandler = handler
}

/** A transmissão está cobrindo a janela do operador? */
export function broadcastCoversOperator(): boolean {
  if (!broadcastWindow || broadcastWindow.isDestroyed()) return false
  if (!operatorWindow || operatorWindow.isDestroyed()) return false

  const operatorDisplay = screen.getDisplayMatching(operatorWindow.getBounds())
  const broadcastDisplay = screen.getDisplayMatching(broadcastWindow.getBounds())
  return operatorDisplay.id === broadcastDisplay.id
}

function loadPage(window: BrowserWindow, page: 'operator' | 'broadcast'): void {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) void window.loadURL(`${devServer}/${page}.html`)
  else void window.loadFile(join(__dirname, `../renderer/${page}.html`))
}

let operatorWindow: BrowserWindow | null = null
let broadcastWindow: BrowserWindow | null = null
let sleepBlockerId: number | null = null
/** true assim que o operador confirmou "Encerrar a transmissão" no modal, para o 'close' seguinte não pedir de novo. */
let closeConfirmed = false

export function getOperatorWindow(): BrowserWindow | null {
  return operatorWindow
}

export function getBroadcastWindow(): BrowserWindow | null {
  return broadcastWindow
}

export function sendToAll(channel: string, ...args: unknown[]): void {
  for (const window of [operatorWindow, broadcastWindow]) {
    if (window && !window.isDestroyed()) window.webContents.send(channel, ...args)
  }
}

export function createOperatorWindow(): BrowserWindow {
  // sem barra de menu no Windows e no Linux: ela não serve a nada aqui e come
  // uma faixa da tela do operador (no macOS o menu é do sistema, fica)
  if (!isMac) Menu.setApplicationMenu(null)

  operatorWindow = new BrowserWindow({
    // acima da largura em que a barra de comando cabe numa linha só (medido:
    // ~1500px de janela). Abrir já assim é o que a maioria das telas comporta;
    // encolher a janela abaixo disso é o que vira a barra em duas linhas
    width: 1_640,
    height: 940,
    minWidth: 1_080,
    minHeight: 660,
    show: false,
    backgroundColor: '#111214',
    title: 'VaLendo',
    webPreferences: { preload, sandbox: false }
  })

  operatorWindow.on('ready-to-show', () => operatorWindow?.show())

  // fechar a janela do operador derruba a transmissão: confirma primeiro, com
  // um modal do próprio app em vez do diálogo nativo do sistema — pede para o
  // renderer perguntar e espera a resposta chegar por IPC antes de decidir
  operatorWindow.on('close', (event) => {
    if (closeConfirmed) return
    if (!broadcastWindow || broadcastWindow.isDestroyed() || !operatorWindow) return
    event.preventDefault()
    operatorWindow.webContents.send(CHANNELS.confirmCloseRequest)
  })

  operatorWindow.on('closed', () => {
    operatorWindow = null
    closeConfirmed = false
  })

  loadPage(operatorWindow, 'operator')
  return operatorWindow
}

/**
 * Janela da transmissão: sem moldura, em cheio no monitor escolhido e acima do
 * protetor de tela. `focusable: false` mantém o teclado no operador — ele nunca
 * precisa clicar de volta para acionar um atalho.
 */
export function openBroadcastWindow(displayId: number | null): boolean {
  const display = findDisplay(displayId)
  if (!display) return false

  closeBroadcastWindow()

  broadcastWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    backgroundColor: '#000000',
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    hasShadow: false,
    fullscreenable: true,
    webPreferences: { preload, sandbox: false }
  })

  broadcastWindow.setAlwaysOnTop(true, 'screen-saver')
  broadcastWindow.setMenuBarVisibility(false)

  broadcastWindow.once('ready-to-show', () => {
    if (!broadcastWindow) return
    broadcastWindow.setBounds(display.bounds)
    if (isMac) broadcastWindow.setSimpleFullScreen(true)
    else broadcastWindow.setKiosk(true)
    broadcastWindow.showInactive()
  })

  // botão direito na transmissão: trocar de monitor ou encerrar. Sem isto,
  // transmitir no monitor do operador não tem volta pela interface
  broadcastWindow.webContents.on('context-menu', () => contextMenuHandler?.())

  broadcastWindow.on('closed', () => {
    broadcastWindow = null
    releaseSleepBlocker()
  })

  if (sleepBlockerId === null) {
    sleepBlockerId = powerSaveBlocker.start('prevent-display-sleep')
  }

  loadPage(broadcastWindow, 'broadcast')
  return true
}

/**
 * Resposta do modal de confirmação ao fechar com a transmissão no ar.
 *
 * Encerra a transmissão ANTES de deixar a janela do operador fechar de
 * verdade — sem isto, a janela do operador some mas a transmissão continua
 * exibindo no outro monitor, órfã, e sem interface nenhuma para desligá-la.
 */
export function respondToCloseConfirm(confirmed: boolean): void {
  if (!confirmed || !operatorWindow) return
  closeBroadcastWindow()
  closeConfirmed = true
  operatorWindow.close()
}

export function closeBroadcastWindow(): void {
  if (broadcastWindow && !broadcastWindow.isDestroyed()) {
    if (isMac) broadcastWindow.setSimpleFullScreen(false)
    broadcastWindow.destroy()
  }
  broadcastWindow = null
  releaseSleepBlocker()
}

function releaseSleepBlocker(): void {
  if (sleepBlockerId !== null && powerSaveBlocker.isStarted(sleepBlockerId)) {
    powerSaveBlocker.stop(sleepBlockerId)
  }
  sleepBlockerId = null
}

/** O monitor da transmissão pode sair da tomada no meio do programa. */
export function broadcastDisplayStillExists(displayId: number | null): boolean {
  return findDisplay(displayId) !== null
}
