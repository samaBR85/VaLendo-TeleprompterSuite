import type { Action, HistoryInfo } from '@shared/actions'
import {
  anchorFromWordIndex,
  composeLines,
  remapAnchor,
  totalWords,
  wordIndexFromAnchor
} from '@shared/anchor'
import { chaveDoNome, deixasDaSaida, linhasCandidatas, proximaCor, renomearNasDeixas } from '@shared/apresentadores'
import { cartaoNoAr } from '@shared/cards'
import { COMMANDS_BY_ID } from '@shared/commands'
import { podeIrAoAr, posicaoDoVideo } from '@shared/video'
import {
  CARDS_HEIGHT_MAX,
  CARDS_HEIGHT_MIN,
  EDITOR_FONT_MAX,
  EDITOR_FONT_MIN,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  THUMB_MAX,
  THUMB_MIN,
  TAB_COLORS,
  createInitialState,
  createTab
} from '@shared/defaults'
import { History } from '@shared/history'
import { traduzir } from '@shared/i18n'
import { duplicarAba } from '@shared/duplicarAba'
import { fatiasPorBloco, reconcileBlocks } from '@shared/text'
import { aplicarMarca, limparMarcas } from '@shared/marcas'
import type { Anchor, Appearance, AppState, PacingRule, StopwatchClock, Tab, Transport } from '@shared/types'
import { CRONOMETRO_PARADO, secondsForWords, segundosDoCronometro, wordIndexAt } from '@shared/pacing'
// a régua da tela e o passo do atalho saem da mesma constante: o degrau que se
// vê tem que ser o degrau que a tecla anda
import { PPM_MAX, PPM_MIN, PPM_STEP } from '@shared/ruler'
import {
  appendHistoryStep,
  dismissStorageNotice,
  loadHistorySteps,
  loadState,
  log,
  reportStorageNotice,
  reportStorageProblem,
  saveState,
  userDataRoot
} from './storage'
import { type UserDefaults } from './userDefaults'
import { defaultsDosPresets, loadPresets, savePresets } from './presets'
import {
  CORES_DE_PRESET,
  aparenciaDoPreset,
  apresentadoresAoAplicar,
  lugarValido,
  type Preset,
  type Presets
} from '@shared/presets'

/** Palavras devolvidas ao pausar, para o apresentador reentrar sem tropeço. */
const REWIND_ON_PAUSE = 2

type Listener = (state: AppState, history: HistoryInfo) => void

/** A aparência já é a regra de composição e de ritmo — não há o que traduzir. */
function rule(tab: Tab): PacingRule {
  return tab.appearance
}

/** Mudanças que alteram a régua de rolagem, e por isso exigem reancorar. */
const PACING_KEYS: (keyof Appearance)[] = ['minWords', 'maxWords', 'uniformSpeed']

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function sameRows(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * Programa em branco: uma aba vazia, no idioma e com as preferências de máquina
 * que `base` carrega.
 *
 * Serve a três chamadores que querem a mesma coisa por motivos diferentes — a
 * partida do app, o botão "Novo" das boas-vindas e o "Novo projeto" da barra. É
 * função solta, e não método, porque o construtor precisa dela antes de existir
 * um `this` completo.
 */
function emBranco(defaults: UserDefaults, base: AppState): AppState {
  const tab = createTab(traduzir(base.language, 'tabs.defaultName', { n: 1 }), '', TAB_COLORS[0], defaults.appearance)
  return {
    ...createInitialState(defaults, base.language),
    tabs: [tab],
    activeTabId: tab.id,
    maquina: base.maquina
  }
}


export class Store {
  private state: AppState
  private readonly histories = new Map<string, History<Tab>>()
  private readonly listeners = new Set<Listener>()
  /**
   * Fileiras medidas por aba. Fora do AppState porque é medida, não
   * configuração — não vai para o disco, e é reconstruída assim que a prévia
   * do operador desenha.
   */
  private readonly rows = new Map<string, number[]>()
  /** o alarme de fim de roteiro — loop (reinicia) ou auto-pausa (pausa) */
  private loopTimer: ReturnType<typeof setTimeout> | null = null

  /** Há um despacho de fora em andamento — ver `dispatch`. */
  private despachando = false

  /** Com o que uma aba nova nasce: o preset da estrela, ou a fábrica. */
  private defaults: UserDefaults

  /** Os cinco presets desta máquina. Fora do AppState — ver `shared/presets.ts`. */
  private presets: Presets

  /**
   * O trabalho gravado, de lado, esperando o operador pedir.
   *
   * O app NÃO o põe mais na tela sozinho. Abrir o Valendo num estúdio alheio,
   * ou com a tela já espelhada no telão, mostrava o roteiro anterior sem
   * ninguém ter pedido — e roteiro é material de cliente. Agora quem revela é
   * "Continuar de onde parei", um clique deliberado.
   */
  private guardado: AppState

  constructor() {
    this.presets = loadPresets(userDataRoot())
    this.defaults = defaultsDosPresets(this.presets)
    // recalculado na abertura, nunca lido do workspace: o arquivo de padrões
    // pode ter sido apagado com o app fechado
    /*
     * Sem idioma nenhum aqui, de propósito: a instalação nova nasce em inglês.
     *
     * `app.getLocale()` estava nesta linha e devolvia string VAZIA — ele só
     * responde depois do `whenReady`, e este construtor roda no carregamento do
     * módulo. A detecção nunca acontecia; toda instalação nova do mundo caía na
     * reserva. Quem corrige é o `bootstrap` em index.ts, que pergunta na hora
     * certa e refaz a amostra antes da janela abrir.
     */
    this.guardado = loadState(this.defaults)
    /*
     * A tela começa em BRANCO, e o gravado espera de lado.
     *
     * `maquina` vem do guardado porque nada ali é confidencial e tudo ali é
     * conforto: tamanho e posição da janela, altura da gaveta, aba dos Ajustes.
     * Perder isso a cada abertura seria pagar um preço sem comprar nada.
     */
    this.state = emBranco(this.defaults, this.guardado)
  }

  getState(): AppState {
    return this.state
  }

  getPresets(): Presets {
    return this.presets
  }

  /**
   * Grava os cinco no disco e reaponta com o que abas novas nascem.
   *
   * A memória muda antes do disco de propósito: se a gravação falhar, o que o
   * operador vê na tela continua sendo o que ele acabou de fazer, e a falha
   * aparece na faixa do rodapé em vez de a tela voltar sozinha ao estado
   * anterior sem explicação.
   */
  private gravarPresets(next: Presets): void {
    this.presets = next
    this.defaults = defaultsDosPresets(next)
    try {
      savePresets(userDataRoot(), next)
    } catch (error) {
      reportStorageProblem(
        `Não deu para gravar os presets (${(error as Error).message}). Eles valem nesta sessão, mas podem não estar aqui na próxima abertura.`
      )
    }
  }

  /** Fileiras medidas da aba ativa, para main e renderer usarem a mesma régua. */
  activeRows(): number[] {
    return this.rows.get(this.state.activeTabId) ?? []
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  historyInfo(): HistoryInfo {
    // via historyFor: assim o histórico gravado em disco já aparece disponível
    // na primeira abertura, antes de qualquer edição nova
    const history = this.historyFor(this.state.activeTabId)
    return { canUndo: history.canUndo, canRedo: history.canRedo, depth: history.depth }
  }

  private activeTab(): Tab | undefined {
    return this.state.tabs.find((t) => t.id === this.state.activeTabId)
  }

  private historyFor(tabId: string): History<Tab> {
    let history = this.histories.get(tabId)
    if (!history) {
      history = new History<Tab>(400)
      history.restore(loadHistorySteps(tabId))
      this.histories.set(tabId, history)
    }
    return history
  }

  /** Índice global de palavras da posição de leitura, agora. */
  private currentWordIndex(): number {
    return wordIndexAt(this.state.transport, Date.now())
  }

  /**
   * O cronômetro no instante da pausa/retomada.
   *
   * Só quem chama `transport/toggle`, `transport/pause` e `transport/restart`
   * mexe aqui — editar texto, trocar palavras-por-linha ou ritmo passa por
   * `rebase()`, que nunca toca no cronômetro de propósito.
   */
  private cronometroPausado(transport: Transport): StopwatchClock {
    return { base: segundosDoCronometro(transport.stopwatch, transport.playing, Date.now()), comecouEm: 0 }
  }

  private cronometroRetomado(transport: Transport): StopwatchClock {
    return { base: transport.stopwatch.base, comecouEm: Date.now() }
  }

  private setState(next: AppState): void {
    this.state = next
    saveState(next)
    this.scheduleLoop()
    const info = this.historyInfo()
    for (const listener of this.listeners) listener(next, info)
  }

  /**
   * O alarme de fim de roteiro: em vez de sondar a cada quadro, calcula
   * analiticamente quanto falta (em ms) para a leitura alcançar o fim do
   * roteiro e agenda um `setTimeout` único.
   *
   * Ao disparar, duas coisas podem acontecer, e o loop sempre vence quando
   * ligado — é preferência explícita do operador por play contínuo:
   * - loop ligado: `transport/restart`, que já preserva `playing` e reancora
   *   cronômetro/relógio independente corretamente, então não precisa de
   *   lógica de reinício própria, só da hora certa de chamá-la;
   * - loop desligado E o relógio é Fórmula ou Cronômetro (não Livre, que é
   *   solto e sem duração alvo): `transport/pause`, igual a apertar o botão
   *   Pause — some com a rolagem e congela as contagens.
   *
   * Chamado a cada `setState` (todo estado que sai daqui para os ouvintes),
   * e sempre recomeça do zero: play/pausa, mudança de ppm, um `seek`, o modo
   * do relógio, ou texto editado — qualquer um desses muda quando o fim chega.
   */
  private scheduleLoop(): void {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer)
      this.loopTimer = null
    }
    const { transport } = this.state
    if (!transport.playing) return

    const tab = this.activeTab()
    if (!tab) return
    if (!transport.loop && tab.appearance.timers.mode === 'livre') return

    const lines = composeLines(tab.blocks, rule(tab), this.rows.get(tab.id))
    const restantes = Math.max(0, totalWords(lines) - this.currentWordIndex())
    const ms = secondsForWords(restantes, transport.ppm) * 1000
    // o atraso só vale para o loop de verdade: o auto-pausa já é o texto
    // parado esperando o operador, não tem "reiniciar" para atrasar
    const atraso = transport.loop ? transport.loopDelaySeconds * 1000 : 0
    this.loopTimer = setTimeout(
      () =>
        this.dispatch(
          transport.loop
            ? { type: 'transport/restart', peloLoop: true }
            : { type: 'transport/pause', rebobinar: false }
        ),
      ms + atraso
    )
  }

  private replaceTab(tab: Tab): AppState {
    const index = this.state.tabs.findIndex((t) => t.id === tab.id)
    if (index === -1) return this.state
    return { ...this.state, tabs: this.state.tabs.with(index, comDeixas(tab)) }
  }

  /** Mutação que entra no histórico de desfazer. */
  private mutateTab(tabId: string, label: string, recipe: (draft: Tab) => void): Tab | null {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return null

    const [next, step] = this.historyFor(tabId).apply(tab, label, recipe, Date.now())
    if (!step) return null

    const bumped = { ...next, rev: tab.rev + 1 }
    appendHistoryStep(tabId, step)
    this.state = this.replaceTab(bumped)
    return bumped
  }

  /** Mutação fora do histórico: posição de leitura e chrome do app não são desfazíveis. */
  private patchTab(tabId: string, patch: Partial<Tab>): void {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    this.state = this.replaceTab({ ...tab, ...patch })
  }

  /**
   * Recoloca o relógio na palavra onde a leitura estava.
   *
   * É a peça que sustenta a edição ao vivo: inserir texto acima do ponto de
   * leitura muda o índice global daquela palavra, então o relógio precisa ser
   * rebaseado ou a rolagem daria um salto.
   */
  private rebase(tab: Tab, anchor: Anchor | null): void {
    if (tab.id !== this.state.activeTabId) return
    const lines = composeLines(tab.blocks, rule(tab), this.rows.get(tab.id))
    const wordIndex = anchor ? wordIndexFromAnchor(lines, anchor) : 0
    this.state = {
      ...this.state,
      transport: {
        ...this.state.transport,
        wordsAtStart: clamp(wordIndex, 0, totalWords(lines)),
        startedAt: Date.now()
      }
    }
  }

  /** Âncora correspondente à posição do relógio, calculada sobre os blocos atuais. */
  private anchorNow(tab: Tab): Anchor | null {
    if (tab.id !== this.state.activeTabId) return tab.anchor
    const lines = composeLines(tab.blocks, rule(tab), this.rows.get(tab.id))
    return anchorFromWordIndex(lines, this.currentWordIndex()) ?? tab.anchor
  }

  private seekWordIndex(wordIndex: number): void {
    const tab = this.activeTab()
    if (!tab) return
    const lines = composeLines(tab.blocks, rule(tab), this.rows.get(tab.id))
    const clamped = clamp(wordIndex, 0, totalWords(lines))
    const anchor = anchorFromWordIndex(lines, clamped)
    this.state = {
      ...this.state,
      transport: { ...this.state.transport, wordsAtStart: clamped, startedAt: Date.now() }
    }
    if (anchor) this.patchTab(tab.id, { anchor })
  }

  /**
   * A rede embaixo do reducer.
   *
   * O `reduce` abaixo é o app inteiro: umas sessenta cláusulas, e um `throw` em
   * qualquer uma delas subiria por um `ipcMain.on` — que é síncrono e não tem
   * dono — até o tratador padrão do Node, que ENCERRA o processo principal. Com
   * ele vão todas as janelas, inclusive a do apresentador, no meio do programa.
   * É o pior modo de falha que este app tem, justamente porque a premissa dele é
   * editar com o programa no ar.
   *
   * O renderer também não descobriria: o preload despacha por `ipcRenderer.send`,
   * que é tiro-e-esquece e não tem caminho de volta para o erro.
   *
   * Aqui, e não em index.ts, por dois motivos: só daqui de dentro dá para repor
   * o estado anterior (vários casos atribuem `this.state` em etapas, e um erro no
   * meio deixaria a metade); e o alarme de fim de roteiro despacha de dentro de um
   * `setTimeout`, que index.ts nem chega a ver.
   *
   * O preço é conhecido e escolhido: a ação não acontece. Isso é melhor do que o
   * app morrer, e o operador fica sabendo — a faixa do rodapé acende com o × para
   * dispensar, e a pilha vai inteira para o `problemas.log`.
   */
  dispatch(action: Action): void {
    /*
     * Despacho aninhado não tem rede própria — de propósito.
     *
     * Vários casos chamam `this.dispatch` no meio do trabalho (`tab/add` ativa a
     * aba nova, `project/replace` renomeia e reescreve, o loop reinicia). Se cada
     * um repusesse o estado, reporia o de DEPOIS do primeiro passo, e o de fora
     * seguiria em frente achando que deu tudo certo. Quem restaura é o de fora,
     * que é o único que sabe como as coisas estavam antes do primeiro passo.
     */
    if (this.despachando) {
      this.reduce(action)
      return
    }

    const anterior = this.state
    this.despachando = true
    try {
      this.reduce(action)
    } catch (erro) {
      this.recuperar(action, anterior, erro)
    } finally {
      this.despachando = false
    }
  }

  /**
   * Repõe o estado de antes da ação e conta o que houve.
   *
   * O que NÃO volta: um passo de desfazer que já tenha sido gravado antes do
   * erro continua no arquivo do histórico. É aceito — o passo aponta para um
   * texto que existiu de verdade, então desfazer segue coerente, e desenrolar
   * disco por causa de um erro que não deveria acontecer custaria mais do que
   * vale.
   */
  private recuperar(action: Action, anterior: AppState, erro: unknown): void {
    const detalhe = erro instanceof Error ? (erro.stack ?? erro.message) : String(erro)
    log(`a ação ${action.type} falhou e foi desfeita — ${detalhe}`)
    try {
      // pelo funil de sempre: repor sem avisar deixaria a tela mostrando a
      // metade que chegou a sair daqui antes do erro
      this.setState(anterior)
    } catch {
      // se nem repor deu, ao menos a memória fica coerente
      this.state = anterior
    }
    reportStorageNotice(traduzir(anterior.language, 'notice.actionFailed', { acao: action.type }))
  }

  private reduce(action: Action): void {
    switch (action.type) {
      case 'text/set': {
        const tab = this.state.tabs.find((t) => t.id === action.tabId)
        if (!tab) return

        const oldBlocks = tab.blocks
        const anchorBefore = this.anchorNow(tab)
        const newBlocks = reconcileBlocks(oldBlocks, action.text)
        const anchorAfter = remapAnchor(oldBlocks, newBlocks, anchorBefore)
        const surviving = new Set(newBlocks.map((b) => b.id))

        const updated = this.mutateTab(action.tabId, 'texto', (draft) => {
          draft.blocks = newBlocks
          draft.anchor = anchorAfter
          draft.markers = draft.markers.filter((m) => surviving.has(m.blockId))
        })
        if (updated) this.rebase(updated, anchorAfter)
        break
      }

      case 'appearance/patch': {
        const target = this.state.tabs.find((t) => t.id === action.tabId)
        if (!target) return

        // corpo e margem não mexem na régua de rolagem. Palavras por linha e
        // velocidade constante mexem: o índice passa a valer outra coisa, e
        // sem reancorar a leitura saltaria para outro ponto do texto
        const affectsPacing = PACING_KEYS.some((key) => key in action.patch)
        const anchorBefore = affectsPacing ? this.anchorNow(target) : null

        const updated = this.mutateTab(
          action.tabId,
          `aparência:${Object.keys(action.patch).join(',')}`,
          (draft) => {
            Object.assign(draft.appearance, action.patch)
            draft.appearance.minWords = clamp(draft.appearance.minWords, 1, 20)
            draft.appearance.maxWords = clamp(draft.appearance.maxWords, draft.appearance.minWords, 24)
            draft.appearance.fontSize = clamp(draft.appearance.fontSize, 16, 260)
            draft.appearance.marginPct = clamp(draft.appearance.marginPct, 0, 35)
            draft.appearance.positionPct = clamp(draft.appearance.positionPct, 0, 100)
            draft.appearance.focusDimPct = clamp(draft.appearance.focusDimPct, 0, 100)
          }
        )

        if (updated && affectsPacing) this.rebase(updated, anchorBefore ?? updated.anchor)
        break
      }

      case 'appearance/invert': {
        this.mutateTab(action.tabId, 'inverter', (draft) => {
          const { textColor, bgColor } = draft.appearance
          draft.appearance.textColor = bgColor
          draft.appearance.bgColor = textColor
        })
        break
      }

      case 'appearance/preset': {
        const preset = this.state.presets.find((p) => p.id === action.presetId)
        if (!preset) return
        this.mutateTab(action.tabId, `preset:${preset.id}`, (draft) => {
          draft.appearance.textColor = preset.textColor
          draft.appearance.bgColor = preset.bgColor
        })
        break
      }

      case 'transport/toggle': {
        const transport = this.state.transport
        if (transport.playing) {
          const stopped = Math.max(0, this.currentWordIndex() - REWIND_ON_PAUSE)
          this.state = {
            ...this.state,
            transport: {
              ...transport,
              playing: false,
              wordsAtStart: stopped,
              startedAt: Date.now(),
              stopwatch: this.cronometroPausado(transport)
            }
          }
          this.seekWordIndex(stopped)
        } else {
          this.state = {
            ...this.state,
            transport: {
              ...transport,
              playing: true,
              startedAt: Date.now(),
              stopwatch: this.cronometroRetomado(transport),
              // o relógio do modo independente nasce no primeiro play e não
              // se mexe mais depois disso — só troca de aba ou reiniciar zera
              independentStartedAt: transport.independentStartedAt || Date.now()
            }
          }
        }
        break
      }

      case 'transport/pause': {
        if (!this.state.transport.playing) break
        const transport = this.state.transport
        // rebobinar 2 palavras é uma cortesia para quem pausou de propósito,
        // reentrar sem ter perdido o fio. O auto-pausa no fim do roteiro
        // (`scheduleLoop`) passa `rebobinar: false`: ali não sobra texto para
        // reentrar, e o pulo de posição só fazia a marca de leitura empurrar
        // a última linha pra cima na hora que devia ficar parada
        const stopped =
          action.rebobinar === false
            ? this.currentWordIndex()
            : Math.max(0, this.currentWordIndex() - REWIND_ON_PAUSE)
        this.state = {
          ...this.state,
          transport: {
            ...transport,
            playing: false,
            startedAt: Date.now(),
            stopwatch: this.cronometroPausado(transport)
          }
        }
        this.seekWordIndex(stopped)
        break
      }

      case 'transport/restart':
        // cronômetro e relógio independente reiniciam junto: "voltar ao
        // início" é recomeçar a leitura inteira, e o tempo que ela leva é
        // parte disso. O independente só volta a contar no próximo play,
        // como se fosse a primeira vez.
        //
        // Exceto quando é o LOOP se reiniciando sozinho (`peloLoop`): aí não
        // é o operador voltando ao início — é a rolagem dando a volta com a
        // transmissão seguindo em frente. O modo Livre existe para contar o
        // tempo do programa por cima do texto, não o do roteiro; zerar a
        // cada volta do loop faria o relógio pular pra trás no meio do ar.
        this.state = {
          ...this.state,
          transport: {
            ...this.state.transport,
            stopwatch: this.state.transport.playing ? { base: 0, comecouEm: Date.now() } : CRONOMETRO_PARADO,
            independentStartedAt: action.peloLoop
              ? this.state.transport.independentStartedAt
              : this.state.transport.playing
                ? Date.now()
                : 0
          }
        }
        this.seekWordIndex(0)
        break

      case 'transport/seekWords':
        this.seekWordIndex(this.currentWordIndex() + action.delta)
        break

      case 'transport/seekAnchor': {
        const tab = this.activeTab()
        if (!tab) return
        const lines = composeLines(tab.blocks, rule(tab), this.rows.get(tab.id))
        this.seekWordIndex(wordIndexFromAnchor(lines, action.anchor))
        break
      }

      case 'transport/ppm':
      case 'transport/nudgePpm': {
        const current = this.state.transport.ppm
        const target = action.type === 'transport/ppm' ? action.ppm : current + action.delta * PPM_STEP
        // rebaseia antes de trocar o ritmo, senão o novo ppm reescreve o passado
        const at = this.currentWordIndex()
        this.state = {
          ...this.state,
          transport: {
            ...this.state.transport,
            ppm: clamp(Math.round(target), PPM_MIN, PPM_MAX),
            wordsAtStart: at,
            startedAt: Date.now()
          }
        }
        break
      }

      case 'transport/blackout':
        this.state = {
          ...this.state,
          transport: { ...this.state.transport, blackout: !this.state.transport.blackout }
        }
        break

      case 'transport/freeze':
        this.state = {
          ...this.state,
          transport: { ...this.state.transport, frozen: !this.state.transport.frozen }
        }
        break

      case 'transport/loop':
        this.state = {
          ...this.state,
          transport: { ...this.state.transport, loop: !this.state.transport.loop }
        }
        break

      case 'transport/loopDelay':
        this.state = {
          ...this.state,
          transport: { ...this.state.transport, loopDelaySeconds: clamp(action.seconds, 0, 60) }
        }
        break

      case 'card/add':
        this.state = { ...this.state, cards: [...this.state.cards, action.card] }
        break

      case 'card/remove': {
        // se era ele que estava no ar, a tela do apresentador volta ao roteiro
        // no mesmo passo — senão ficaria apontando para um cartão que não existe
        const noAr = this.state.transport.card === action.cardId
        this.state = {
          ...this.state,
          cards: this.state.cards.filter((c) => c.id !== action.cardId),
          transport: noAr ? { ...this.state.transport, card: null } : this.state.transport
        }
        break
      }

      case 'card/reorder': {
        // a ordem do array já é o que numera os atalhos (1-9) — mover um
        // cartão é o mesmo tipo de mudança que remover já provoca hoje.
        // `toIndex` chega medido no array de ANTES de tirar o cartão do
        // lugar — tirando um de antes do alvo, tudo desliza uma casa
        const cards = [...this.state.cards]
        const from = cards.findIndex((c) => c.id === action.cardId)
        if (from === -1) return
        const [moved] = cards.splice(from, 1)
        const to = clamp(from < action.toIndex ? action.toIndex - 1 : action.toIndex, 0, cards.length)
        cards.splice(to, 0, moved)
        this.state = { ...this.state, cards }
        break
      }

      case 'card/rename':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) => (c.id === action.cardId ? { ...c, nome: action.nome } : c))
        }
        break

      case 'card/text':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'text' ? { ...c, texto: action.texto } : c
          )
        }
        break

      /*
       * Remendo parcial, e por isso o espalhamento é campo a campo: mandar
       * `{...c, fundo: action.fundo}` apagaria a cor de partida toda vez que
       * o operador mexesse só no ângulo.
       */
      case 'card/tela':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'tela'
              ? {
                  ...c,
                  fundo: action.fundo ? { ...c.fundo, ...action.fundo } : c.fundo,
                  recado: action.recado ? { ...c.recado, ...action.recado } : c.recado
                }
              : c
          )
        }
        break

      case 'card/imageFile':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'image'
              ? { ...c, arquivo: action.arquivo, rev: (c.rev ?? 0) + 1 }
              : c
          )
        }
        break

      case 'card/show': {
        // pedir de novo o que já está no ar tira da tela: um atalho só serve
        // para mostrar e esconder, como a tela preta faz
        const igual = this.state.transport.card === action.cardId
        const alvo = igual ? null : action.cardId
        const escolhido = alvo === null ? null : (this.state.cards.find((c) => c.id === alvo) ?? null)

        // um vídeo desvinculado não sobe: o atalho não faz nada em vez de
        // mandar um retângulo preto para a tela do apresentador
        if (alvo !== null && (!escolhido || !podeIrAoAr(escolhido))) break

        this.state = {
          ...this.state,
          transport: {
            ...this.state.transport,
            card: alvo,
            // entrar no ar já toca: um standby que precisa de um segundo
            // clique para animar seria uma pegadinha no meio do programa.
            // Parte de onde o operador deixou — pré-posicionar fora do ar e
            // só depois subir é o ponto de existir `pausedAt`
            video:
              escolhido?.kind === 'video'
                ? {
                    ...this.state.transport.video,
                    tocando: !action.paused,
                    base: escolhido.pausedAt ?? 0,
                    comecouEm: Date.now(),
                    arrastando: false
                  }
                : { ...this.state.transport.video, tocando: false, base: 0, comecouEm: 0, arrastando: false }
          }
        }
        break
      }

      case 'card/videoPlay': {
        const video = this.state.transport.video
        const noAr = cartaoNoAr(this.state)
        const duracao = noAr?.kind === 'video' ? noAr.duracao : undefined
        const loop = noAr?.kind === 'video' ? (noAr.loop ?? false) : false

        // parar guarda o segundo em que parou; tocar parte de onde estava —
        // e, se o vídeo já tinha acabado, recomeça em vez de dar play num
        // ponto onde não há mais nada
        const acabou = Boolean(duracao) && !loop && video.base >= (duracao ?? 0) - 0.05
        const base = action.tocando
          ? acabou
            ? 0
            : video.base
          : posicaoDoVideo(video, Date.now(), duracao, loop)

        this.state = {
          ...this.state,
          transport: {
            ...this.state.transport,
            video: { ...video, tocando: action.tocando, base, comecouEm: Date.now() }
          },
          // pausar guarda a posição no próprio cartão, não só no relógio
          // compartilhado — é o que sobrevive a tirar o cartão do ar
          cards:
            action.tocando || noAr?.kind !== 'video'
              ? this.state.cards
              : this.state.cards.map((c) => (c.id === noAr.id ? { ...c, pausedAt: base } : c))
        }
        break
      }

      case 'card/videoSeek': {
        const video = this.state.transport.video
        const noAr = this.state.transport.card === action.cardId
        this.state = {
          ...this.state,
          transport: noAr
            ? {
                ...this.state.transport,
                video: {
                  ...video,
                  base: Math.max(0, action.segundo),
                  comecouEm: Date.now(),
                  arrastando: action.arrastando
                }
              }
            : this.state.transport,
          // a posição só é gravada no cartão ao soltar a barra — durante o
          // arrasto seria um passo a mais que ninguém vê, já que o cartão
          // não está desenhando o próprio vídeo em nenhuma superfície
          cards: action.arrastando
            ? this.state.cards
            : this.state.cards.map((c) =>
                c.id === action.cardId && c.kind === 'video' ? { ...c, pausedAt: Math.max(0, action.segundo) } : c
              )
        }
        break
      }

      case 'card/videoLoop':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'video' ? { ...c, loop: action.loop } : c
          )
        }
        break

      case 'card/overlay':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) => (c.id === action.cardId ? { ...c, overlay: action.overlay } : c))
        }
        break

      case 'card/videoDuration':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'video' ? { ...c, duracao: action.duracao } : c
          )
        }
        break

      case 'card/videoPoster':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'video' ? { ...c, poster: action.poster } : c
          )
        }
        break

      case 'card/videoLink': {
        const tiraDoAr = !action.vinculado && this.state.transport.card === action.cardId
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'video'
              ? {
                  ...c,
                  vinculado: action.vinculado,
                  ...(action.caminho ? { caminho: action.caminho } : {}),
                  ...(action.arquivoNome ? { arquivoNome: action.arquivoNome } : {}),
                  // reapontar para um arquivo que toca direto precisa apagar a
                  // conversão antiga do cartão, senão ele seguiria servindo o
                  // vídeo antigo com o nome do novo
                  ...(action.convertido === undefined
                    ? {}
                    : action.convertido === null
                      ? { convertido: undefined }
                      : { convertido: action.convertido }),
                  // o novo arquivo tem outra duração, outro quadro, e a
                  // posição salva do antigo não significa nada nele
                  ...(action.caminho ? { duracao: undefined, poster: undefined, pausedAt: undefined } : {})
                }
              : c
          ),
          // se o arquivo sumiu com ele no ar, a tela volta ao roteiro em vez
          // de segurar um quadro que não existe mais
          transport: tiraDoAr ? { ...this.state.transport, card: null } : this.state.transport
        }
        break
      }

      case 'marker/add': {
        this.mutateTab(action.tabId, `marcador:${Date.now()}`, (draft) => {
          if (draft.markers.some((m) => m.blockId === action.blockId)) return
          draft.markers.push({
            id: `m${Date.now().toString(36)}`,
            blockId: action.blockId,
            label: action.label
          })
        })
        break
      }

      case 'marker/remove':
        this.mutateTab(action.tabId, `marcador:remover:${action.markerId}`, (draft) => {
          draft.markers = draft.markers.filter((m) => m.id !== action.markerId)
        })
        break

      /*
       * Os quatro casos de apresentador.
       *
       * Nenhum deles toca no TEXTO do roteiro — só na lista de quem fala. É o
       * que permite registrar um apresentador num .txt vindo da redação sem
       * alterar uma letra do que veio, e desfazer sem deixar rastro.
       */
      case 'presenter/add':
        this.mutateTab(action.tabId, `apresentador:criar:${action.nome}`, (draft) => {
          const nome = action.nome.trim()
          if (nome === '') return
          // já registrado (ignorando a caixa) não vira um segundo chip: seriam
          // dois donos para a mesma deixa, e o primeiro da lista venceria sem
          // que o operador entendesse por quê
          if (draft.apresentadores.some((a) => chaveDoNome(a.nome) === chaveDoNome(nome))) return
          draft.apresentadores.push({
            id: `p${Date.now().toString(36)}${draft.apresentadores.length.toString(36)}`,
            nome,
            cor: proximaCor(draft.apresentadores.map((a) => a.cor))
          })
        })
        break

      case 'presenter/rename':
        this.mutateTab(action.tabId, `apresentador:renomear:${action.presenterId}`, (draft) => {
          const alvo = draft.apresentadores.find((a) => a.id === action.presenterId)
          const nome = action.nome.trim()
          if (!alvo || nome === '') return
          alvo.nome = nome
        })
        break

      case 'presenter/color':
        this.mutateTab(action.tabId, `apresentador:cor:${action.presenterId}`, (draft) => {
          const alvo = draft.apresentadores.find((a) => a.id === action.presenterId)
          if (alvo) alvo.cor = action.cor
        })
        break

      /*
       * Renomear: o chip E o roteiro, num passo só de histórico.
       *
       * Num passo só porque separá-los deixaria um Ctrl+Z desfazer metade — o
       * texto voltaria a dizer "HARI" com o chip já dizendo "HARI OLIVEIRA", e
       * a cor sumiria sem ninguém entender por quê.
       *
       * Mexe no texto dos blocos EXISTENTES em vez de recompor a partir de uma
       * string nova: assim os ids sobrevivem, e com eles os marcadores e a
       * âncora de leitura.
       */
      case 'presenter/rewrite':
        this.mutateTab(action.tabId, `apresentador:renomear:${action.presenterId}`, (draft) => {
          const alvo = draft.apresentadores.find((a) => a.id === action.presenterId)
          const nome = action.nome.trim()
          if (!alvo || nome === '' || nome === alvo.nome) return

          const novos = renomearNasDeixas(draft.blocks, alvo.nome, nome)
          novos.forEach((texto, i) => {
            if (texto !== null) draft.blocks[i].text = texto
          })
          alvo.nome = nome
        })
        break

      case 'presenter/hidden':
        this.mutateTab(action.tabId, `apresentador:ocultar:${action.presenterId}`, (draft) => {
          const alvo = draft.apresentadores.find((a) => a.id === action.presenterId)
          if (alvo) alvo.oculto = action.oculto
        })
        break

      case 'presenter/remove':
        this.mutateTab(action.tabId, `apresentador:remover:${action.presenterId}`, (draft) => {
          draft.apresentadores = draft.apresentadores.filter((a) => a.id !== action.presenterId)
        })
        break

      case 'tab/add': {
        if (this.state.tabs.length >= 10) return
        const color = TAB_COLORS[this.state.tabs.length % TAB_COLORS.length]
        const nome = traduzir(this.state.language, 'tabs.defaultName', { n: this.state.tabs.length + 1 })
        const tab = createTab(nome, '', color, this.defaults.appearance)
        this.state = { ...this.state, tabs: [...this.state.tabs, tab] }
        this.dispatch({ type: 'tab/activate', tabId: tab.id })
        return
      }

      case 'tab/duplicate': {
        if (this.state.tabs.length >= 10) return
        const origem = this.state.tabs.find((t) => t.id === action.tabId)
        if (!origem) return

        const nova = duplicarAba(
          origem,
          this.state.tabs,
          // cor da vez, e não a da original: duas abas da mesma cor leem como
          // engano, e o pontinho é justamente o que distingue uma da outra
          TAB_COLORS[this.state.tabs.length % TAB_COLORS.length]
        )

        // ao lado da original, não no fim da fila: uma cópia pertence ao pé da
        // sua fonte, e é lá que a mão vai procurar
        const tabs = [...this.state.tabs]
        tabs.splice(tabs.findIndex((t) => t.id === origem.id) + 1, 0, nova)
        this.state = { ...this.state, tabs }
        this.dispatch({ type: 'tab/activate', tabId: nova.id })
        return
      }

      /*
       * Mesma conta do `card/reorder`, e de propósito: a ordem do array é o
       * que numera os atalhos (Ctrl+1..9), então arrastar renumera — igual a
       * arrastar cartão já faz. A COR não muda, porque ela é gravada na aba
       * quando nasce e não calculada pela posição: o pontinho continua sendo
       * a identidade daquele roteiro depois do arrasto.
       */
      case 'tab/reorder': {
        const tabs = [...this.state.tabs]
        const from = tabs.findIndex((t) => t.id === action.tabId)
        if (from === -1) return
        const [movida] = tabs.splice(from, 1)
        // tirando uma de antes do alvo, tudo desliza uma casa
        const to = clamp(from < action.toIndex ? action.toIndex - 1 : action.toIndex, 0, tabs.length)
        tabs.splice(to, 0, movida)
        this.state = { ...this.state, tabs }
        break
      }

      case 'tab/close': {
        if (this.state.tabs.length <= 1) return
        const tabs = this.state.tabs.filter((t) => t.id !== action.tabId)
        this.histories.delete(action.tabId)
        this.state = { ...this.state, tabs }
        if (this.state.activeTabId === action.tabId) {
          this.dispatch({ type: 'tab/activate', tabId: tabs[0].id })
          return
        }
        break
      }

      case 'tab/activate': {
        const tab = this.state.tabs.find((t) => t.id === action.tabId)
        if (!tab) return
        const lines = composeLines(tab.blocks, rule(tab), this.rows.get(tab.id))
        this.state = {
          ...this.state,
          activeTabId: tab.id,
          transport: {
            ...this.state.transport,
            playing: false,
            wordsAtStart: tab.anchor ? wordIndexFromAnchor(lines, tab.anchor) : 0,
            startedAt: Date.now(),
            // outra aba é outra leitura: o cronômetro desta não conta para ela
            stopwatch: CRONOMETRO_PARADO,
            independentStartedAt: 0
          }
        }
        break
      }

      case 'tab/rename':
        this.mutateTab(action.tabId, `renomear:${action.tabId}`, (draft) => {
          draft.title = action.title.slice(0, 40) || 'Sem título'
        })
        break

      case 'app/language':
        this.state = { ...this.state, language: action.language }
        break

      /*
       * Troca a língua da partida inteira, e não só a etiqueta: o nome da aba e
       * as predefinições de cor nascem traduzidos junto.
       *
       * Só chega aqui pelo modal de boas-vindas, com a tela ainda em branco —
       * por isso pode refazer sem perguntar. O guardado NÃO é tocado: quem
       * escolher "Continuar" depois ainda encontra o trabalho como estava, no
       * idioma em que estava.
       */
      case 'estreia/language': {
        this.histories.clear()
        this.rows.clear()
        this.state = emBranco(this.defaults, { ...this.state, language: action.language })
        break
      }

      case 'layout/mode':
        this.state = { ...this.state, layoutMode: action.mode }
        break

      case 'layout/transportPosition':
        this.state = { ...this.state, transportPosition: action.position }
        break

      case 'layout/inspector':
        this.state = { ...this.state, inspectorVisible: action.visible }
        break

      case 'layout/sidebar':
        this.state = { ...this.state, sidebarVisible: action.visible }
        break

      case 'layout/cards':
        this.state = { ...this.state, cardsVisible: action.visible }
        break

      case 'layout/cardsHeight':
        // preso entre o mínimo e o máximo aqui, e não só na divisória: um
        // workspace gravado por uma versão futura não pode deixar a gaveta
        // ocupando a janela inteira sem alça para voltar
        this.state = {
          ...this.state,
          cardsHeight: Math.min(CARDS_HEIGHT_MAX, Math.max(CARDS_HEIGHT_MIN, Math.round(action.height)))
        }
        break

      case 'layout/sidebarWidth':
        this.state = {
          ...this.state,
          sidebarWidth: clamp(Math.round(action.width), SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX)
        }
        break

      case 'layout/split':
        this.state = { ...this.state, editionSplit: clamp(action.ratio, 0.2, 0.8) }
        break

      case 'window/bounds':
        this.state = { ...this.state, maquina: { ...this.state.maquina, window: action.bounds } }
        break

      /**
       * Os limites moram aqui, e não no componente: o valor chega de um
       * slider, mas também pode chegar de um workspace gravado por uma versão
       * em que a faixa era outra. Limitar num lugar só é o que garante que a
       * interface nunca receba um tamanho que ela não sabe desenhar.
       */
      case 'maquina/patch': {
        const { patch } = action
        const atual = this.state.maquina
        this.state = {
          ...this.state,
          maquina: {
            ...atual,
            ...patch,
            thumbSize: clamp(patch.thumbSize ?? atual.thumbSize, THUMB_MIN, THUMB_MAX),
            editorFontSize: clamp(
              patch.editorFontSize ?? atual.editorFontSize,
              EDITOR_FONT_MIN,
              EDITOR_FONT_MAX
            ),
            cardVolume: clamp(patch.cardVolume ?? atual.cardVolume, 0, 1)
          }
        }
        break
      }

      case 'layout/rows': {
        const previous = this.rows.get(action.tabId)
        if (previous && sameRows(previous, action.rows)) return

        // a medida muda o peso das linhas, e com ele o que o índice do relógio
        // significa. Sem reancorar, a leitura saltaria no instante em que uma
        // linha passasse a dobrar
        const target = this.state.tabs.find((t) => t.id === action.tabId)
        const anchorBefore = target ? this.anchorNow(target) : null

        this.rows.set(action.tabId, action.rows)
        if (target) this.rebase(target, anchorBefore ?? target.anchor)
        break
      }

      case 'output/set':
        // o viewport pertence à janela que estava aberta; ao trocar de monitor
        // ou desligar, ele volta a ser desconhecido e a prévia cai na medida do
        // monitor até a janela nova se apresentar
        this.state = {
          ...this.state,
          output: { displayId: action.displayId, enabled: action.enabled, viewport: null }
        }
        break

      case 'output/viewport':
        if (!this.state.output.enabled) return
        this.state = {
          ...this.state,
          output: {
            ...this.state.output,
            viewport: { width: action.width, height: action.height }
          }
        }
        break

      case 'keymap/set': {
        if (!COMMANDS_BY_ID.has(action.commandId)) return
        const keymap = { ...this.state.keymap }
        if (action.binding === null) delete keymap[action.commandId]
        else keymap[action.commandId] = action.binding
        this.state = { ...this.state, keymap }
        break
      }

      case 'document/import': {
        if (action.text.trim().length === 0) return

        const target =
          action.intoNewTab && this.state.tabs.length < 10
            ? (() => {
                const color = TAB_COLORS[this.state.tabs.length % TAB_COLORS.length]
                const tab = createTab(action.title, '', color, this.defaults.appearance)
                this.state = { ...this.state, tabs: [...this.state.tabs, tab] }
                this.dispatch({ type: 'tab/activate', tabId: tab.id })
                return tab.id
              })()
            : this.state.activeTabId

        this.dispatch({ type: 'tab/rename', tabId: target, title: action.title })
        this.dispatch({ type: 'text/set', tabId: target, text: action.text })
        this.dispatch({ type: 'transport/restart' })
        return
      }

      /**
       * Pinta e formata trechos do roteiro.
       *
       * UM `mutateTab` para a lista inteira, e é o que faz "pintar todas as
       * trinta" custar um passo de desfazer em vez de trinta. O mesmo motivo do
       * `preset/aplicar`: meio desfazer é pior que nenhum.
       *
       * Os trechos chegam em coordenadas do texto INTEIRO — é como o editor
       * enxerga uma seleção — e `fatiasPorBloco` reparte por bloco antes de
       * aplicar, porque a marca mora dentro do bloco.
       *
       * De trás para a frente dentro de cada bloco: aplicar uma marca não muda
       * o texto, mas recorta as marcas vizinhas, e ir do fim para o começo
       * mantém os índices ainda não visitados valendo.
       *
       * Não toca no texto nem na âncora — pintar não move a leitura, e quem
       * está no ar não sente nada.
       */
      case 'marca/aplicar':
      case 'marca/limpar': {
        const alvo = this.state.tabs.find((t) => t.id === action.tabId)
        if (!alvo || action.trechos.length === 0) return

        const fatias = action.trechos.flatMap((t) => fatiasPorBloco(alvo.blocks, t.de, t.ate))
        if (fatias.length === 0) return

        const limpando = action.type === 'marca/limpar'
        const rotulo = limpando ? 'marca:limpar' : `marca:${fatias.length}`

        this.mutateTab(action.tabId, rotulo, (draft) => {
          for (const bloco of draft.blocks) {
            const minhas = fatias
              .filter((f) => f.blockId === bloco.id)
              .sort((a, b) => b.de - a.de)
            if (minhas.length === 0) continue

            let marcas = bloco.marcas ?? []
            for (const fatia of minhas) {
              marcas = limpando
                ? limparMarcas(marcas, fatia.de, fatia.ate)
                : aplicarMarca(marcas, fatia.de, fatia.ate, action.patch)
            }
            // bloco sem marca nenhuma larga o campo — o .valendo não engorda à toa
            if (marcas.length > 0) bloco.marcas = marcas
            else delete bloco.marcas
          }
        })
        break
      }

      /**
       * Fotografa a aba ativa e guarda num dos cinco lugares.
       *
       * A aparência E os apresentadores, que é o par que o operador enxerga
       * como "o meu jeito" — mais o ritmo em uso, que fica guardado mas só
       * entra quando uma aba NASCE (ver `defaultsDosPresets`).
       *
       * Nome e cor do lugar sobrevivem a gravar por cima: o lugar 2 continua
       * sendo o "Igreja" mesmo depois de você atualizar o que tem dentro dele.
       * As outras abas não são tocadas — aparência é por aba de propósito, e
       * mexer nelas sem pedir seria mudar um roteiro que pode estar no ar.
       */
      case 'preset/guardar': {
        const tab = this.activeTab()
        if (!tab || !lugarValido(action.lugar)) return
        const antigo = this.presets.slots[action.lugar]
        const preset: Preset = {
          nome: antigo?.nome ?? '',
          cor: antigo?.cor ?? CORES_DE_PRESET[action.lugar % CORES_DE_PRESET.length],
          // as deixas não vão: são derivadas dos apresentadores, e quem as
          // mantém em dia é o funil por onde toda troca de aba passa
          appearance: { ...tab.appearance, timers: { ...tab.appearance.timers }, deixas: [] },
          apresentadores: tab.apresentadores.map((a) => ({ ...a })),
          ppm: this.state.transport.ppm
        }
        this.gravarPresets({ ...this.presets, slots: this.presets.slots.with(action.lugar, preset) })
        break
      }

      /**
       * Veste o preset numa aba — a parte perigosa, e por isso num passo só.
       *
       * Aparência e apresentadores mudam dentro do MESMO `mutateTab`, então o
       * histórico registra um degrau único: um `Ctrl+Z` devolve os dois juntos.
       * Em duas chamadas, o desfazer voltaria pela metade — e num roteiro no ar
       * "metade do jeito antigo" é pior que qualquer um dos dois inteiros.
       *
       * A velocidade NÃO entra: o ppm é do transporte, não da aba, e mudá-lo
       * com o programa rodando mudaria o ritmo do apresentador na hora, sem
       * desfazer que devolvesse.
       *
       * O reancorar no fim é o mesmo cuidado de `appearance/patch`, e aqui é
       * mais fácil de esquecer porque a mudança vem em bloco: palavras por
       * linha e velocidade constante recompõem a régua, e sem reancorar a
       * leitura saltaria para outro ponto do texto.
       */
      case 'preset/aplicar': {
        if (!lugarValido(action.lugar)) return
        const preset = this.presets.slots[action.lugar]
        const alvo = this.state.tabs.find((t) => t.id === action.tabId)
        if (!preset || !alvo) return

        const mudaARegua =
          preset.appearance.minWords !== alvo.appearance.minWords ||
          preset.appearance.maxWords !== alvo.appearance.maxWords ||
          preset.appearance.uniformSpeed !== alvo.appearance.uniformSpeed
        const anchorBefore = mudaARegua ? this.anchorNow(alvo) : null

        // as linhas que PODEM ser deixa neste roteiro: é o porteiro que decide
        // quais apresentadores do preset entram (ver `apresentadoresAoAplicar`)
        const citadas = linhasCandidatas(alvo.blocks)
        const agora = Date.now()

        const updated = this.mutateTab(action.tabId, `preset:${action.lugar}`, (draft) => {
          draft.appearance = aparenciaDoPreset(preset)
          draft.apresentadores = apresentadoresAoAplicar(
            preset.apresentadores,
            draft.apresentadores,
            citadas,
            (i) => `p${agora.toString(36)}${i.toString(36)}`
          )
        })

        if (updated && mudaARegua) this.rebase(updated, anchorBefore ?? updated.anchor)
        break
      }

      case 'preset/renomear': {
        if (!lugarValido(action.lugar)) return
        const alvo = this.presets.slots[action.lugar]
        if (!alvo) return
        // nome vazio é legítimo: volta a mostrar "Preset N" no idioma do app
        const nome = action.nome.trim().slice(0, 24)
        this.gravarPresets({
          ...this.presets,
          slots: this.presets.slots.with(action.lugar, { ...alvo, nome })
        })
        break
      }

      case 'preset/cor': {
        if (!lugarValido(action.lugar)) return
        const alvo = this.presets.slots[action.lugar]
        if (!alvo) return
        this.gravarPresets({
          ...this.presets,
          slots: this.presets.slots.with(action.lugar, { ...alvo, cor: action.cor })
        })
        break
      }

      case 'preset/apagar': {
        if (!lugarValido(action.lugar)) return
        this.gravarPresets({
          slots: this.presets.slots.with(action.lugar, null),
          // apagar o que tinha a estrela devolve o nascimento à fábrica: uma
          // estrela apontando para lugar vazio não é estado que se guarde
          padrao: this.presets.padrao === action.lugar ? null : this.presets.padrao
        })
        break
      }

      /* A estrela: com qual preset as abas novas nascem. `null` volta à
         fábrica — é isto que aposentou o botão "voltar ao de fábrica". */
      case 'preset/padrao': {
        const lugar = action.lugar
        if (lugar !== null && (!lugarValido(lugar) || !this.presets.slots[lugar])) return
        this.gravarPresets({ ...this.presets, padrao: lugar })
        break
      }

      case 'webview/set':
        this.state = { ...this.state, webview: { ...this.state.webview, enabled: action.enabled } }
        break

      case 'webview/videoPerfil':
        this.state = { ...this.state, webview: { ...this.state.webview, videoPerfil: action.perfil } }
        break

      case 'webview/som':
        this.state = { ...this.state, webview: { ...this.state.webview, som: action.som } }
        break

      case 'cardOverlay/set':
        this.state = { ...this.state, cardOverlay: { ...this.state.cardOverlay, enabled: action.enabled } }
        break

      case 'cardOverlay/style':
        this.state = { ...this.state, cardOverlay: { ...this.state.cardOverlay, style: action.style } }
        break

      case 'card/videoProxy':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'video' ? { ...c, proxy: action.proxy ?? undefined } : c
          )
        }
        break

      case 'storage/dismissNotice':
        dismissStorageNotice()
        break

      /**
       * Troca o programa inteiro pelo que veio do arquivo.
       *
       * As abas do projeto têm ids próprios, então o histórico de desfazer em
       * memória não vale mais nada — apagá-lo é o que impede um Ctrl+Z de
       * aplicar, no roteiro recém-aberto, o inverso de uma edição feita noutro.
       */
      case 'project/replace': {
        this.histories.clear()
        this.rows.clear()
        const aberto = action.state
        const ativa = aberto.tabs.some((t) => t.id === aberto.activeTabId)
          ? aberto.activeTabId
          : aberto.tabs[0].id
        // `maquina` sobrevive porque e do operador NESTA maquina: o projeto
        // que chega nao tem opiniao sobre o monitor de quem o abriu. Os presets
        // nem entram aqui — vivem fora do AppState, justamente para nao
        // viajarem dentro do .valendo
        this.state = {
          ...aberto,
          activeTabId: ativa,
          maquina: this.state.maquina
        }
        this.dispatch({ type: 'tab/activate', tabId: ativa })
        return
      }

      /**
       * Programa em branco — mesma casca de um app recém-instalado, e não a
       * mesma amostra de exemplo (`roteiroDeExemplo`) que `createInitialState`
       * dá de graça: "em branco" é isso mesmo, uma aba vazia. A aba nasce com
       * o preset da estrela, como qualquer aba nova.
       */
      case 'project/new': {
        this.histories.clear()
        this.rows.clear()
        this.state = emBranco(this.defaults, this.state)
        this.dispatch({ type: 'tab/activate', tabId: this.state.activeTabId })
        return
      }

      /*
       * "Continuar de onde parei" — o único caminho que revela o gravado.
       *
       * Não há nada a limpar antes: a tela estava em branco desde a partida, e
       * o que entra aqui é exatamente o que o disco tinha. `maquina` vem do
       * guardado também, e não do estado atual, porque os dois são o mesmo
       * objeto — o construtor já o copiou de lá.
       */
      case 'estreia/continuar': {
        this.histories.clear()
        this.rows.clear()
        this.state = this.guardado
        this.dispatch({ type: 'tab/activate', tabId: this.state.activeTabId })
        return
      }

      /* O roteiro de demonstração, no idioma que estiver escolhido. */
      case 'estreia/demo': {
        this.histories.clear()
        this.rows.clear()
        this.state = {
          ...createInitialState(this.defaults, this.state.language),
          maquina: this.state.maquina
        }
        this.dispatch({ type: 'tab/activate', tabId: this.state.activeTabId })
        return
      }

      // fora do histórico: desfazer devolve texto, não o arquivo em que ele foi
      // salvo. Um Ctrl+Z depois de salvar não pode fazer o próximo Ctrl+S
      // perguntar de novo onde gravar
      case 'document/exportedTo':
        this.patchTab(action.tabId, { exportPath: action.path })
        break

      case 'project/pathSet':
        this.state = { ...this.state, projectPath: action.path }
        break

      case 'history/undo':
      case 'history/redo': {
        const tab = this.state.tabs.find((t) => t.id === action.tabId)
        if (!tab) return
        const history = this.historyFor(action.tabId)
        const next = action.type === 'history/undo' ? history.undo(tab) : history.redo(tab)
        if (next === tab) return
        const bumped = { ...next, rev: tab.rev + 1 }
        this.state = this.replaceTab(bumped)
        this.rebase(bumped, bumped.anchor)
        break
      }
    }

    this.setState(this.state)
  }
}

/**
 * Mantém `appearance.deixas` em dia com quem fala e quem está escondido.
 *
 * A lista é DERIVADA dos apresentadores, mas fica guardada dentro da
 * aparência — e isso é de propósito. A régua de rolagem é composta em quinze
 * lugares, no main e nos três renderers; se cada um recalculasse a lista, um
 * deles acabaria calculando diferente e a marca de leitura apontaria para o
 * lugar errado sem erro nenhum aparecer. Guardada, todos leem o MESMO vetor.
 *
 * O preço de guardar um derivado é ele ficar velho — por isso a sincronia mora
 * aqui, no funil por onde TODA troca de aba passa (`replaceTab`), e não nos
 * casos que mexem em apresentador. Assim não há como esquecer um.
 */
function comDeixas(tab: Tab): Tab {
  const devidas = deixasDaSaida(tab.apresentadores, tab.appearance.ocultarApresentadores)
  const atuais = tab.appearance.deixas
  // só troca quando muda de verdade: um objeto novo a cada mutação invalidaria
  // os memos do renderer que dependem da aparência
  const iguais =
    devidas.length === atuais.length &&
    devidas.every((d, i) => d.nome === atuais[i].nome && d.oculto === atuais[i].oculto)
  if (iguais) return tab
  return { ...tab, appearance: { ...tab.appearance, deixas: devidas } }
}
