import { BrowserWindow, Menu, powerSaveBlocker, screen } from 'electron'
import { join } from 'node:path'
import { CHANNELS } from '@shared/actions'
import { findDisplay } from './displays'
import { log } from './storage'

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

export interface JanelaSalva {
  width: number
  height: number
  x: number
  y: number
}

/**
 * Avisa quando a janela do operador muda de lugar ou tamanho, para o main
 * guardar isso no estado — mesmo desenho de `onBroadcastContextMenu`: quem
 * decide o QUE fazer com o evento é `index.ts`, este arquivo só entrega.
 */
let boundsHandler: ((bounds: JanelaSalva) => void) | null = null

export function onOperatorWindowBounds(handler: (bounds: JanelaSalva) => void): void {
  boundsHandler = handler
}

/**
 * O projeto tem mudança que não foi para o arquivo?
 *
 * Este arquivo não conhece o `Store` — quem sabe responder é `index.ts`, do
 * mesmo jeito que já acontece com o menu de contexto e com os bounds. Sem esse
 * fio, o `close` só conseguia enxergar a transmissão no ar, e fechar o app com
 * trabalho não salvo passava batido.
 */
let dirtyHandler: (() => boolean) | null = null

export function onOperatorCloseAsk(handler: () => boolean): void {
  dirtyHandler = handler
}

/** A origem salva ainda cai dentro de algum monitor conectado agora? */
function origemNaTela(x: number, y: number): boolean {
  return screen.getAllDisplays().some((d) => {
    const b = d.bounds
    return x >= b.x && y >= b.y && x < b.x + b.width && y < b.y + b.height
  })
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

export function createOperatorWindow(
  bounds?: JanelaSalva | null,
  zoomFactor = 1,
  /** o que está gravado AGORA — a fonte contra a qual a janela é conferida */
  escalaGravada?: () => number
): BrowserWindow {
  // sem barra de menu no Windows e no Linux: ela não serve a nada aqui e come
  // uma faixa da tela do operador (no macOS o menu é do sistema, fica)
  if (!isMac) Menu.setApplicationMenu(null)

  // a origem salva só vale se ainda cair dentro de algum monitor conectado —
  // um notebook que abriu com um segundo monitor e fechou sem ele reabriria
  // fora da tela, invisível, sem jeito de arrastar de volta
  const usaOrigem = Boolean(bounds) && origemNaTela(bounds!.x, bounds!.y)

  operatorWindow = new BrowserWindow({
    // acima da largura em que a barra de comando cabe numa linha só (medido:
    // ~1500px de janela). Abrir já assim é o que a maioria das telas comporta;
    // encolher a janela abaixo disso é o que vira a barra em duas linhas
    width: bounds?.width ?? 1_640,
    height: bounds?.height ?? 940,
    ...(usaOrigem ? { x: bounds!.x, y: bounds!.y } : {}),
    minWidth: 1_080,
    minHeight: 660,
    show: false,
    // igual ao `--color-ink-0` do renderer: é a cor que aparece no instante
    // entre a janela abrir e o React pintar. Diferente, dá um flash claro
    backgroundColor: '#0e0e10',
    title: 'Valendo',
    // a escala vai no construtor, e não num `setZoomFactor` depois que a
    // página carrega: aplicada depois, a interface apareceria por um quadro
    // em 100% e saltaria. Só aqui — a janela de transmissão nunca escala,
    // porque o corpo do texto lá é ajuste de leitura do apresentador
    webPreferences: { preload, sandbox: false, zoomFactor }
  })

  /*
   * A janela APARECE, mesmo que o `ready-to-show` não venha.
   *
   * Ela nasce com `show: false` e espera o primeiro quadro, que é o que evita
   * o flash branco na abertura. O preço disso é que, se o quadro não chega, a
   * janela nunca aparece — e o app fica vivo, invisível, segurando o terminal
   * que o abriu. Foi exatamente o que o operador relatou duas vezes: "abre o
   * terminal e não carrega o app", sem janela em monitor nenhum.
   *
   * `ready-to-show` não é uma promessa: um tropeço do processo de GPU no
   * arranque, e ele simplesmente não dispara. A falha é intermitente — aqui
   * ela não reproduz sob demanda —, e é por isso que a saída não pode depender
   * de descobrir a causa: quatro segundos sem primeiro quadro e a janela abre
   * assim mesmo. No caminho normal, que leva um ou dois segundos, este relógio
   * nunca chega a vencer.
   *
   * Pior caso vira um instante de janela vazia na cor de fundo, em vez de um
   * app que não existe na tela. E a linha no `problemas.log` é o que torna a
   * próxima ocorrência diagnosticável em vez de misteriosa.
   */
  let apareceu = false
  const mostrar = (motivo: 'quadro' | 'prazo') => (): void => {
    if (apareceu || !operatorWindow || operatorWindow.isDestroyed()) return
    apareceu = true
    if (motivo === 'prazo') log('A janela abriu pelo prazo: o `ready-to-show` não chegou em 4s.')
    operatorWindow.show()
  }
  operatorWindow.on('ready-to-show', mostrar('quadro'))
  const salvaVidas = setTimeout(mostrar('prazo'), 4_000)
  operatorWindow.on('closed', () => clearTimeout(salvaVidas))

  // captura posição/tamanho enquanto o operador ajusta a janela — debounced,
  // no mesmo ritmo do autosave, para não disparar um dispatch por pixel
  let debounce: ReturnType<typeof setTimeout> | null = null
  const avisarBounds = (): void => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      if (operatorWindow && !operatorWindow.isDestroyed()) boundsHandler?.(operatorWindow.getBounds())
    }, 500)
  }
  operatorWindow.on('resize', avisarBounds)
  operatorWindow.on('move', avisarBounds)

  // Fechar o app pode custar caro por DOIS motivos independentes: derruba a
  // transmissão que está no ar, e/ou joga fora o que não foi salvo. Confirma
  // antes, com um modal do próprio app em vez do diálogo nativo do sistema —
  // pede para o renderer perguntar e espera a resposta chegar por IPC.
  //
  // Até a versão 174 só a transmissão era olhada aqui: sem nada no ar, a
  // janela fechava calada mesmo com trabalho não salvo. O `workspace.json`
  // trazia tudo de volta na abertura seguinte, o que escondia o problema —
  // mas o `.valendo` ficava para trás, e é ele que o operador leva embora.
  operatorWindow.on('close', (event) => {
    // captura imediata, sem esperar o debounce: é o último instante confiável
    // antes da janela sumir, e `before-quit` já grava o estado logo depois
    if (debounce) clearTimeout(debounce)
    if (operatorWindow) boundsHandler?.(operatorWindow.getBounds())

    if (closeConfirmed || !operatorWindow) return
    const noAr = Boolean(broadcastWindow && !broadcastWindow.isDestroyed())
    const naoSalvo = dirtyHandler?.() ?? false
    if (!noAr && !naoSalvo) return
    event.preventDefault()
    operatorWindow.webContents.send(CHANNELS.confirmCloseRequest, { noAr, naoSalvo })
  })

  operatorWindow.on('closed', () => {
    operatorWindow = null
    closeConfirmed = false
  })

  /*
   * A escala é REAFIRMADA depois da carga, além de ir no construtor.
   *
   * O construtor continua sendo quem aplica primeiro — é o que evita a
   * interface aparecer um quadro em 100% e saltar. Mas ele era a única fonte,
   * e uma fonte só é uma fonte que ninguém confere: quando o que a janela
   * aplicou discorda do que está gravado, a interface abre num tamanho e o
   * controle mostra outro, sem nada avisar. O operador vê dois "100%"
   * diferentes e não tem como saber qual vale.
   *
   * Reafirmar não pisca. Quando os dois concordam — o caso normal — a
   * comparação falha e nada é escrito. Ele só age exatamente na situação em
   * que havia divergência, que é o defeito.
   *
   * O valor vem de `escalaGravada()` e não da variável do construtor: entre
   * uma carga e outra o operador pode ter mexido no controle, e nesse caso o
   * certo é o que está no disco, não o que a janela nasceu com.
   */
  const reafirmarEscala = (): void => {
    if (!operatorWindow || operatorWindow.isDestroyed()) return
    const querida = escalaGravada?.() ?? zoomFactor
    if (operatorWindow.webContents.getZoomFactor() !== querida) {
      operatorWindow.webContents.setZoomFactor(querida)
    }
  }
  operatorWindow.webContents.on('did-finish-load', reafirmarEscala)
  /*
   * E de novo quando a configuração dos monitores muda.
   *
   * Numa mesa com mais de um monitor eles raramente têm a mesma escala do
   * Windows, e mudar de tela (ou o Windows reavaliar a DPI) refaz a conta por
   * baixo do app. Sem isto, a interface muda de tamanho sozinha e o controle
   * segue afirmando o número antigo.
   */
  screen.on('display-metrics-changed', reafirmarEscala)
  operatorWindow.on('closed', () => screen.off('display-metrics-changed', reafirmarEscala))

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
