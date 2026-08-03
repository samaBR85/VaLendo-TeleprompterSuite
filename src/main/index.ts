import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron'
import { existsSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { CHANNELS, type Action } from '@shared/actions'
import type {
  CardConvertResult,
  CardDropResult,
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
import { PROJECT_FILTERS, markProjectClean, openProject, projectFileName, projectIsDirty, saveProject } from './project'
import { onWebviewChange, publish, startWebview, stopWebview, webviewInfo } from './webview'
import { identifyDisplays, closeIdentifyWindows, listDisplays, watchDisplays } from './displays'
import { cartaoNoAr } from '@shared/cards'
import { traduzir } from '@shared/i18n'
import {
  autorizarVideo,
  caminhoDoVideo,
  conversaoExiste,
  convertidoPath,
  deleteCardImage,
  deleteVideoConversion,
  IMAGE_EXTENSIONS,
  importCardImage,
  pruneCardImages,
  pruneVideoConversions,
  registerCardProtocol,
  registerCardScheme,
  registerVideoResolver,
  videoPronto
} from './cards'
import { converterParaMp4, gerarProxy, temFfmpeg } from './ffmpeg'
import { ehVideo, VIDEO_EXTENSIONS } from '@shared/video'
import { perfilPorId } from '@shared/proxy'
import { Store } from './state'
import { flushState, log, onStorageHealth, storageHealth, userDataRoot, workspaceIntegro } from './storage'
import { loadUiScale, saveUiScale } from './uiScale'
import { buildBroadcastMenu } from './broadcastMenu'
import {
  broadcastCoversOperator,
  broadcastDisplayStillExists,
  closeBroadcastWindow,
  createOperatorWindow,
  getBroadcastWindow,
  getOperatorWindow,
  onBroadcastContextMenu,
  onOperatorWindowBounds,
  openBroadcastWindow,
  respondToCloseConfirm,
  sendToAll
} from './windows'

const store = new Store()
// o workspace recém-carregado É o retrato limpo: sem isto, o primeiro clique
// em "Novo" da sessão acusaria sujeira por causa de um projeto que o
// operador nunca tocou
markProjectClean(store.getState())

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
    cardOverlay: state.cardOverlay,
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
      // conversão e cópia leve são derivadas do cartão e não sobrevivem a ele
      if (alvo?.kind === 'video') {
        if (alvo.convertido) deleteVideoConversion(alvo.convertido)
        if (alvo.proxy) deleteVideoConversion(alvo.proxy.arquivo)
      }
    }
    store.dispatch(action)
    // um projeto em branco nasce limpo — nada digitado nele ainda para
    // acusar como mudança não salva
    if (action.type === 'project/new') markProjectClean(store.getState())
  })
  ipcMain.handle(CHANNELS.projectIsDirty, () => projectIsDirty(store.getState()))
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

  /**
   * `saveAs=false` (o botão "Salvar" comum) grava direto no arquivo já
   * aberto, sem perguntar onde — só cai no diálogo se ainda não há
   * `projectPath` (primeiro salvamento) ou se `saveAs=true` foi pedido de
   * propósito, pelo item "Salvar como" do menu.
   */
  ipcMain.handle(CHANNELS.projectSave, async (_event, saveAs = false): Promise<ProjectResult | null> => {
    const state = store.getState()

    if (!saveAs && state.projectPath) {
      try {
        await saveProject(state.projectPath, state)
        markProjectClean(state)
        return { ok: true, path: state.projectPath }
      } catch (error) {
        return { ok: false, path: state.projectPath, error: (error as Error).message }
      }
    }

    const ativa = state.tabs.find((t) => t.id === state.activeTabId)
    const owner = getOperatorWindow()
    const options = {
      title: idioma('main.saveProjectTitle'),
      defaultPath: state.projectPath ?? projectFileName(ativa?.title ?? 'projeto'),
      filters: PROJECT_FILTERS
    }
    const picked = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (picked.canceled || !picked.filePath) return null

    try {
      await saveProject(picked.filePath, state)
      // salvar troca qual arquivo é "o projeto aberto" — o nome no centro
      // do cabeçalho precisa acompanhar, mesmo sem recarregar nada
      store.dispatch({ type: 'project/pathSet', path: picked.filePath })
      markProjectClean(state)
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

    // o caminho é DESTE momento, não o que o arquivo carregava de quando foi
    // salvo — se o operador moveu ou copiou o .valendo, é aqui que ele está
    // agora, e é esse nome que o cabeçalho deve mostrar
    store.dispatch({ type: 'project/replace', state: { ...state, projectPath: caminho } })
    // o que acabou de abrir é o novo retrato limpo — nada foi mudado ainda
    markProjectClean(store.getState())
    // as artes do programa anterior não servem mais a ninguém
    pruneCardImages(store.getState().cards)
    pruneVideoConversions(store.getState().cards)
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

  /*
   * Síncrono de propósito, e uma vez só: o preload lê isto ao carregar, antes
   * de a interface montar. Perguntar ao `webFrame.getZoomFactor()` seria mais
   * barato, mas ele só passa a responder a escala real depois que o primeiro
   * quadro assenta — e até lá diz 100%, o que faria o indicador e o botão de
   * "tamanho normal" nascerem mentindo numa mesa que abriu em 125%.
   */
  ipcMain.on(CHANNELS.uiScaleGet, (event) => {
    event.returnValue = loadUiScale(userDataRoot())
  })

  // a janela já aplicou a escala em si mesma (resposta instantânea); aqui só
  // se guarda, para a próxima abertura nascer no mesmo tamanho
  ipcMain.on(CHANNELS.uiScaleSet, (_event, scale: number) => {
    try {
      saveUiScale(userDataRoot(), scale)
    } catch (erro) {
      // preferência de conforto: não vale derrubar nada por não ter gravado
      log(`não deu para gravar a escala da interface: ${String(erro)}`)
    }
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
  ipcMain.handle(
    CHANNELS.cardPickVideo,
    async (_event, cardId: string): Promise<CardVideoPickResult | null> => {
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

      if (!ehVideo(origem)) return { ...comum, erro: idioma('cards.videoUnsupported') }

      // escolher é o que autoriza: a partir daqui o app pode servir este
      // arquivo, e só ele. Nada é convertido aqui — quem descobre se o
      // arquivo toca é a própria janela, tentando; converter por precaução
      // gastaria minutos e um segundo arquivo do mesmo tamanho à toa.
      autorizarVideo(origem)
      return comum
    }
  )

  /**
   * A segunda porta de entrada de cartão: um arquivo solto na gaveta.
   *
   * Mesmo contrato dos seletores — imagem é copiada para dentro do app,
   * vídeo é autorizado onde está — e igualmente atrás de um gesto explícito
   * do operador (arrastar é tão deliberado quanto escolher no diálogo). Quem
   * decide se o arquivo é imagem ou vídeo é a MESMA lista de extensões dos
   * filtros; o renderer não carrega uma cópia dessa regra.
   */
  ipcMain.handle(
    CHANNELS.cardImportPath,
    (_event, cardId: string, origem: string): CardDropResult | null => {
      const arquivoNome = basename(origem)
      const extensao = extname(origem).slice(1).toLowerCase()
      if (!existsSync(origem)) return null
      const sugestao = basename(origem, extname(origem)).slice(0, 30)

      if (IMAGE_EXTENSIONS.includes(extensao)) {
        try {
          return { kind: 'image', arquivo: importCardImage(origem, cardId), sugestao }
        } catch {
          return null
        }
      }

      if (VIDEO_EXTENSIONS.includes(extensao)) {
        if (!ehVideo(origem)) return { kind: 'recusado', arquivoNome, erro: idioma('cards.videoUnsupported') }
        autorizarVideo(origem)
        return { kind: 'video', caminho: origem, arquivoNome, sugestao }
      }

      return { kind: 'recusado', arquivoNome, erro: idioma('cards.dropUnsupported') }
    }
  )

  /**
   * Converte o vídeo de um cartão que a janela não conseguiu tocar.
   *
   * Só chega aqui depois de o `<video>` ter falhado de verdade, e não por
   * causa da extensão do arquivo: muito `.mov` de celular já toca direto,
   * porque por dentro é o mesmo formato de um mp4 com outro rótulo. Quem não
   * toca é ProRes, matroska e companhia — e aí a conversão vale o custo.
   */
  ipcMain.handle(CHANNELS.cardConvert, async (_event, cardId: string): Promise<CardConvertResult> => {
    const card = store.getState().cards.find((c) => c.id === cardId)
    if (card?.kind !== 'video') return { erro: idioma('cards.videoConvertFailed') }
    if (!temFfmpeg()) return { erro: idioma('cards.videoNoFfmpeg') }
    if (!existsSync(card.caminho)) return { erro: idioma('cards.videoMissing') }

    const arquivo = `${cardId}.mp4`
    const avisar = (fracao: number | null, recodificando: boolean): void =>
      sendToAll(CHANNELS.cardConvertProgress, { arquivoNome: card.arquivoNome, fracao, recodificando })

    avisar(null, false)
    const resultado = await converterParaMp4(card.caminho, convertidoPath(arquivo), (p) =>
      avisar(p.fracao, p.recodificando)
    )
    sendToAll(CHANNELS.cardConvertProgress, null)

    if (!resultado.ok) {
      deleteVideoConversion(arquivo)
      return { erro: idioma('cards.videoConvertFailed') }
    }
    return { convertido: arquivo }
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
/**
 * Mantém as cópias leves em dia com o perfil escolhido.
 *
 * Uma de cada vez, e nunca duas ao mesmo tempo: recodificar é a coisa mais
 * pesada que este app faz, e é para ficar em segundo plano enquanto o operador
 * prepara o programa — não para disputar processador com a leitura no ar.
 *
 * Enquanto a cópia não existe, a rede recebe o original. Pesado, mas
 * funcionando: melhor do que um cartão que não aparece para quem confere.
 */
let gerandoProxy = false

async function garantirProxies(): Promise<void> {
  if (gerandoProxy) return
  const state = store.getState()
  const perfilId = state.webview.videoPerfil

  // no original não há cópia a fazer, e as que existem devem sumir para não
  // ficarem servindo uma qualidade que o operador deixou de querer
  if (perfilId === 'original') {
    for (const card of state.cards) {
      if (card.kind === 'video' && card.proxy) {
        deleteVideoConversion(card.proxy.arquivo)
        store.dispatch({ type: 'card/videoProxy', cardId: card.id, proxy: null })
      }
    }
    return
  }

  /*
   * Sem a rede ligada não há para quem servir cópia leve.
   *
   * Antes a fila rodava assim que existisse um cartão de vídeo, mesmo num dia
   * em que o operador nunca publicasse nada: um programa com cinco VTs pesados
   * gerava cinco arquivos que ninguém abriria, gastando processador e disco.
   *
   * O preço de prender é que ligar a rede começa a recodificação naquele
   * instante. Não trava nada — enquanto a cópia não fica pronta, a rede recebe
   * o original —, mas quem quiser tudo adiantado liga a rede na preparação, e
   * não no meio do programa.
   */
  if (!state.webview.enabled) return

  const perfil = perfilPorId(perfilId)
  if (!perfil || !temFfmpeg()) return

  // "já feita" é perfil certo E arquivo no lugar: o nome anotado no cartão não
  // é prova de que a cópia sobreviveu a uma limpeza de pasta
  const pendente = state.cards.find(
    (c): c is Extract<typeof c, { kind: 'video' }> =>
      c.kind === 'video' &&
      c.vinculado !== false &&
      !(c.proxy?.perfil === perfilId && conversaoExiste(c.proxy.arquivo)) &&
      caminhoDoVideo(c.id) !== null
  )
  if (!pendente) return

  gerandoProxy = true
  try {
    // a cópia velha, de outro perfil, sai antes: senão a pasta acumularia uma
    // por qualidade já experimentada
    if (pendente.proxy) deleteVideoConversion(pendente.proxy.arquivo)

    const arquivo = `${pendente.id}-${perfilId}.mp4`
    const origem = caminhoDoVideo(pendente.id)
    if (!origem) return

    const avisar = (fracao: number | null): void =>
      sendToAll(CHANNELS.cardConvertProgress, {
        arquivoNome: pendente.arquivoNome,
        fracao,
        recodificando: true
      })

    avisar(null)
    const r = await gerarProxy(origem, convertidoPath(arquivo), perfil, (p) => avisar(p.fracao))
    sendToAll(CHANNELS.cardConvertProgress, null)

    if (r.ok) {
      store.dispatch({ type: 'card/videoProxy', cardId: pendente.id, proxy: { arquivo, perfil: perfilId } })
    } else {
      deleteVideoConversion(arquivo)
    }
  } finally {
    gerandoProxy = false
  }

  // pode haver outro cartão esperando a vez
  void garantirProxies()
}

function revalidarVideos(): void {
  for (const card of store.getState().cards) {
    if (card.kind !== 'video') continue
    // um projeto que veio de outra máquina traz o caminho do original e o nome
    // da conversão, mas nenhum dos dois existe aqui: o cartão precisa dizer
    // isso e pedir para reapontar, em vez de falhar na hora de ir ao ar
    const vinculado = videoPronto({ caminho: card.caminho, convertido: card.convertido })
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
    return card?.kind === 'video'
      ? { caminho: card.caminho, convertido: card.convertido, proxy: card.proxy?.arquivo }
      : null
  })
  registerCardProtocol()
  registerIpc()
  /*
   * Varredura na abertura, contra os cartões do workspace.
   *
   * Antes ela só rodava ao abrir um `.valendo`, e quem trabalha direto no
   * workspace podia nunca abrir um. Aí um arquivo pela metade — queda de
   * energia no meio de uma conversão — ficava para sempre, sem dono e sem
   * ninguém sabendo. Aqui toda abertura do app começa limpa.
   */
  if (workspaceIntegro()) {
    pruneCardImages(store.getState().cards)
    pruneVideoConversions(store.getState().cards)
  }
  revalidarVideos()
  /*
   * Uma passada na abertura, e não só a cada mudança.
   *
   * A fila é acionada por mudança de estado, então um app que abre e fica
   * parado nunca a acionaria — e o projeto pode ter voltado de outra máquina,
   * ou a pasta das cópias pode ter sido limpa. Aqui ela vale sobretudo para
   * descartar cópias que sobraram de um perfil que o operador já abandonou;
   * gerar mesmo só acontece com a rede ligada, e a rede nunca sobe sozinha.
   */
  void garantirProxies()
  onBroadcastContextMenu(showBroadcastMenu)
  onOperatorWindowBounds((bounds) => store.dispatch({ type: 'window/bounds', bounds }))

  store.subscribe(() => {
    void garantirProxies()
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

  createOperatorWindow(store.getState().maquina.window, loadUiScale(userDataRoot()))
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
    if (BrowserWindow.getAllWindows().length === 0) createOperatorWindow(store.getState().maquina.window, loadUiScale(userDataRoot()))
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
