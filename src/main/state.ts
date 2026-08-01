import { app } from 'electron'
import type { Action, HistoryInfo } from '@shared/actions'
import {
  anchorFromWordIndex,
  composeLines,
  remapAnchor,
  totalWords,
  wordIndexFromAnchor
} from '@shared/anchor'
import { cartaoNoAr } from '@shared/cards'
import { COMMANDS_BY_ID } from '@shared/commands'
import { podeIrAoAr, posicaoDoVideo } from '@shared/video'
import { CARDS_HEIGHT_MAX, CARDS_HEIGHT_MIN, TAB_COLORS, createTab } from '@shared/defaults'
import { History } from '@shared/history'
import { reconcileBlocks } from '@shared/text'
import type { Anchor, Appearance, AppState, PacingRule, StopwatchClock, Tab, Transport } from '@shared/types'
import { CRONOMETRO_PARADO, segundosDoCronometro, wordIndexAt } from '@shared/pacing'
// a régua da tela e o passo do atalho saem da mesma constante: o degrau que se
// vê tem que ser o degrau que a tecla anda
import { PPM_MAX, PPM_MIN, PPM_STEP } from '@shared/ruler'
import {
  appendHistoryStep,
  dismissStorageNotice,
  loadHistorySteps,
  loadState,
  reportStorageProblem,
  saveState,
  userDataRoot
} from './storage'
import {
  FACTORY_DEFAULTS,
  clearUserDefaults,
  loadUserDefaults,
  saveUserDefaults,
  type UserDefaults
} from './userDefaults'

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

  /** Com o que uma aba nova nasce. Vive fora do workspace, ver userDefaults.ts. */
  private defaults: UserDefaults

  constructor() {
    const loaded = loadUserDefaults(userDataRoot())
    this.defaults = loaded.defaults
    // recalculado na abertura, nunca lido do workspace: o arquivo de padrões
    // pode ter sido apagado com o app fechado
    this.state = { ...loadState(loaded.defaults, app.getLocale()), customDefaults: loaded.custom }
  }

  getState(): AppState {
    return this.state
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
    const info = this.historyInfo()
    for (const listener of this.listeners) listener(next, info)
  }

  private replaceTab(tab: Tab): AppState {
    const index = this.state.tabs.findIndex((t) => t.id === tab.id)
    if (index === -1) return this.state
    return { ...this.state, tabs: this.state.tabs.with(index, tab) }
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

  dispatch(action: Action): void {
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
        const stopped = Math.max(0, this.currentWordIndex() - REWIND_ON_PAUSE)
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
        // como se fosse a primeira vez
        this.state = {
          ...this.state,
          transport: {
            ...this.state.transport,
            stopwatch: this.state.transport.playing ? { base: 0, comecouEm: Date.now() } : CRONOMETRO_PARADO,
            independentStartedAt: this.state.transport.playing ? Date.now() : 0
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

      case 'card/imageFile':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'image' ? { ...c, arquivo: action.arquivo } : c
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
                    tocando: true,
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

      case 'card/videoVolume':
        this.state = {
          ...this.state,
          transport: {
            ...this.state.transport,
            video: { ...this.state.transport.video, volume: Math.min(1, Math.max(0, action.volume)) }
          }
        }
        break

      case 'card/videoLoop':
        this.state = {
          ...this.state,
          cards: this.state.cards.map((c) =>
            c.id === action.cardId && c.kind === 'video' ? { ...c, loop: action.loop } : c
          )
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

      case 'tab/add': {
        if (this.state.tabs.length >= 10) return
        const color = TAB_COLORS[this.state.tabs.length % TAB_COLORS.length]
        const tab = createTab(`Aba ${this.state.tabs.length + 1}`, '', color, this.defaults.appearance)
        this.state = { ...this.state, tabs: [...this.state.tabs, tab] }
        this.dispatch({ type: 'tab/activate', tabId: tab.id })
        return
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

      case 'layout/mode':
        this.state = { ...this.state, layoutMode: action.mode }
        break

      case 'layout/inspector':
        this.state = { ...this.state, inspectorVisible: action.visible }
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
       * Congela os ajustes de agora como o padrão de abas novas.
       *
       * Grava a aparência da aba ativa e o ritmo em uso — que é o par que o
       * operador enxerga como "o meu jeito". As outras abas ficam como estão:
       * aparência é por aba de propósito, e mexer nelas sem pedir seria mudar
       * um roteiro que pode estar no ar.
       */
      case 'defaults/save': {
        const tab = this.activeTab()
        if (!tab) return
        const next: UserDefaults = {
          appearance: { ...tab.appearance, timers: { ...tab.appearance.timers } },
          ppm: this.state.transport.ppm
        }
        try {
          saveUserDefaults(userDataRoot(), next)
          this.defaults = next
          this.state = { ...this.state, customDefaults: true }
        } catch (error) {
          reportStorageProblem(
            `Não deu para gravar o padrão (${(error as Error).message}). Os ajustes desta aba continuam valendo, mas abas novas não vão herdá-los.`
          )
        }
        break
      }

      case 'defaults/reset': {
        try {
          clearUserDefaults(userDataRoot())
          this.defaults = FACTORY_DEFAULTS
          this.state = { ...this.state, customDefaults: false }
        } catch (error) {
          reportStorageProblem(`Não deu para apagar o padrão gravado (${(error as Error).message}).`)
        }
        break
      }

      case 'webview/set':
        this.state = { ...this.state, webview: { ...this.state.webview, enabled: action.enabled } }
        break

      case 'webview/videoPerfil':
        this.state = { ...this.state, webview: { ...this.state.webview, videoPerfil: action.perfil } }
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
       * `customDefaults` não vem do arquivo: é do app desta máquina.
       */
      case 'project/replace': {
        this.histories.clear()
        this.rows.clear()
        const aberto = action.state
        const ativa = aberto.tabs.some((t) => t.id === aberto.activeTabId)
          ? aberto.activeTabId
          : aberto.tabs[0].id
        this.state = { ...aberto, activeTabId: ativa, customDefaults: this.state.customDefaults }
        this.dispatch({ type: 'tab/activate', tabId: ativa })
        return
      }

      // fora do histórico: desfazer devolve texto, não o arquivo em que ele foi
      // salvo. Um Ctrl+Z depois de salvar não pode fazer o próximo Ctrl+S
      // perguntar de novo onde gravar
      case 'document/exportedTo':
        this.patchTab(action.tabId, { exportPath: action.path })
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
