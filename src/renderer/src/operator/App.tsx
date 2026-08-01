import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InsertKind } from '@shared/insertBlock'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { PrompterStage } from '../prompter/PrompterStage'
import { cartaoNoAr } from '@shared/cards'
import { LANGS, type Lang } from '@shared/i18n'
import { ProvedorDeIdioma, useT } from '../i18n'
import { activeTabOf, useAppState } from '../state/useAppState'
import { Icon, type IconName } from '../ui/Icon'
import { Wordmark } from '../ui/Wordmark'
import { CloseConfirm } from './CloseConfirm'
import { CardsDrawer } from './CardsDrawer'
import { CommandPalette } from './CommandPalette'
import { Credits } from './Credits'
import { Deck } from './deck/Deck'
import { Editor, type EditorHandle } from './Editor'
import { Inspector } from './Inspector'
import { KeymapEditor } from './KeymapEditor'
import { StatusBar } from './StatusBar'
import { Tabs } from './Tabs'
import { BarraDeArquivo, BarraDeTransporte, hint } from './Toolbar'
import { WebviewPanel } from './WebviewPanel'
import { useCommands } from './useCommands'

const FALLBACK_VIEWPORT = { width: 1_920, height: 1_080 }

interface Notice {
  title: string
  lines: string[]
  tone: 'ok' | 'warn'
}

export function PanelHeader({
  label,
  detail,
  action
}: {
  label: string
  detail?: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-none items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-ink-1)] px-3 py-1.5 text-[11px]">
      <span className="font-medium text-[var(--color-fog-1)]">{label}</span>
      {detail ? <span className="text-[var(--color-fog-2)]">{detail}</span> : null}
      <span className="ml-auto flex items-center gap-1.5">{action}</span>
    </div>
  )
}

/**
 * Ferramenta que age sobre o texto mora no cabeçalho do editor, e não na barra
 * de comando: lá em cima fica o que se usa com a transmissão correndo.
 */
function EditorTool({
  icon,
  label,
  disabled,
  onClick
}: {
  icon: IconName
  label: string
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-[var(--color-fog-2)] transition-colors hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] disabled:opacity-30"
    >
      <Icon name={icon} size={14} />
    </button>
  )
}

/**
 * O globo fica com os outros ícones do app — ajustes, atalhos, paleta,
 * créditos —, e não nos Ajustes: aquele painel é aparência da aba, e idioma é
 * do programa inteiro. Cada idioma aparece escrito nele mesmo, porque quem
 * precisa trocar é justamente quem não está lendo o idioma atual.
 */
function LanguagePicker({
  lang,
  onChange
}: {
  lang: Lang
  onChange: (lang: Lang) => void
}): React.JSX.Element {
  const { t } = useT()
  const [aberto, setAberto] = useState(false)
  const atual = LANGS.find((l) => l.id === lang) ?? LANGS[0]

  useEffect(() => {
    if (!aberto) return
    const fechar = (): void => setAberto(false)
    // no capture, para fechar antes de qualquer clique de dentro virar ação
    window.addEventListener('mousedown', fechar)
    return () => window.removeEventListener('mousedown', fechar)
  }, [aberto])

  return (
    <div className="relative" onMouseDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        data-language-picker
        title={`${t('app.language')} — ${atual.nome}`}
        aria-label={t('app.language')}
        onClick={() => setAberto((v) => !v)}
        className={`flex items-center gap-1 rounded p-2 hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] ${
          aberto ? 'text-[var(--color-fog-0)]' : 'text-[var(--color-fog-2)]'
        }`}
      >
        <Icon name="globe" size={30} />
        <span className="font-mono text-[11px] tracking-wide">{atual.sigla}</span>
      </button>

      {aberto ? (
        <div
          data-language-menu
          className="absolute top-full right-0 z-50 mt-1 w-[190px] overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] py-1"
        >
          {LANGS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-language={item.id}
              onClick={() => {
                onChange(item.id)
                setAberto(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-ink-3)] ${
                item.id === lang ? 'text-[var(--color-go)]' : 'text-[var(--color-fog-1)]'
              }`}
            >
              <span className="w-[22px] flex-none font-mono text-[10px] text-[var(--color-fog-2)]">
                {item.sigla}
              </span>
              {item.nome}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function StorageStrip({
  mark,
  message,
  onDismiss
}: {
  mark: string
  message: string
  onDismiss?: () => void
}): React.JSX.Element {
  const { t } = useT()
  return (
    <div
      data-strip={mark}
      className="flex flex-none items-start gap-2 border-b border-[var(--color-warn)]/50 bg-[var(--color-warn)]/12 px-4 py-2 text-[12px] leading-relaxed text-[var(--color-warn)]"
    >
      <span className="mt-0.5 flex-none">
        <Icon name="alert" size={16} />
      </span>
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label={t('app.dismiss')}
          onClick={onDismiss}
          className="mt-0.5 flex-none opacity-70 hover:opacity-100"
        >
          <Icon name="close" size={12} />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Casca fina: lê o estado, descobre o idioma e só então monta a interface.
 *
 * Precisa ser um componente à parte porque o provedor tem de estar ACIMA de
 * quem chama `useT()` — se o App inteiro fosse um só, ele leria o contexto
 * padrão (português) na mesma renderização em que instala o provedor, e a
 * primeira pintura sairia em português mesmo para quem escolheu alemão.
 */
export function App(): React.JSX.Element {
  const dados = useAppState()
  return (
    <ProvedorDeIdioma lang={dados.state?.language ?? 'pt-BR'}>
      <AppConteudo {...dados} />
    </ProvedorDeIdioma>
  )
}

function AppConteudo({
  state,
  history,
  displays,
  rows,
  storage,
  webview,
  dispatch
}: ReturnType<typeof useAppState>): React.JSX.Element {
  const { t } = useT()
  const [webviewOpen, setWebviewOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [keymapOpen, setKeymapOpen] = useState(false)
  const [split, setSplit] = useState(0.46)
  const [metrics, setMetrics] = useState<PrompterMetrics | null>(null)
  const [credits, setCredits] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const editorRef = useRef<EditorHandle>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 9_000)
    return () => clearTimeout(timer)
  }, [notice])

  // o main pede confirmação ao fechar com a transmissão no ar; a resposta
  // sempre volta por IPC, mesmo quando o operador cancela — sem isso o main
  // fica esperando para sempre e a janela nunca mais fecha
  useEffect(() => window.valendo.onConfirmClose(() => setCloseConfirm(true)), [])

  const respondToClose = useCallback((confirmed: boolean) => {
    if (confirmed) editorRef.current?.flush()
    setCloseConfirm(false)
    window.valendo.respondToClose(confirmed)
  }, [])

  /**
   * Salva a aba ativa num arquivo.
   *
   * O editor manda o texto com um respiro de alguns décimos; sem descarregar o
   * que está pendente e esperar o main confirmar, o arquivo sai sem as últimas
   * palavras digitadas — que numa gravação são justamente as que importam.
   */
  const exportDocument = useCallback(async (saveAs: boolean): Promise<void> => {
    editorRef.current?.flush()
    await window.valendo.getState()

    const result = await window.valendo.exportDocument(saveAs)
    if (!result) return

    setNotice(
      result.ok
        ? { title: t('notice.scriptSaved'), lines: [result.path], tone: 'ok' }
        : { title: t('notice.scriptFail'), lines: [result.error ?? t('notice.unknownError')], tone: 'warn' }
    )
  }, [])

  /** Grava ou abre o programa inteiro num .valendo. */
  const project = useCallback(async (acao: 'salvar' | 'abrir'): Promise<void> => {
    if (acao === 'salvar') editorRef.current?.flush()
    await window.valendo.getState()

    const result = acao === 'salvar' ? await window.valendo.saveProject() : await window.valendo.openProject()
    if (!result) return

    setNotice(
      result.ok
        ? {
            title: acao === 'salvar' ? t('notice.projectSaved') : t('notice.projectOpened'),
            lines: [result.path],
            tone: 'ok'
          }
        : {
            title: acao === 'salvar' ? t('notice.projectSaveFail') : t('notice.projectOpenFail'),
            lines: [result.error ?? t('notice.unknownError')],
            tone: 'warn'
          }
    )
  }, [])

  const toggleFocusMode = useCallback(() => {
    if (!state) return
    dispatch({ type: 'layout/mode', mode: state.layoutMode === 'focus' ? 'split' : 'focus' })
  }, [state, dispatch])

  const ui = useMemo(
    () => ({
      openPalette: () => setPalette(true),
      openKeymap: () => setKeymapOpen(true),
      toggleFocusMode,
      flushEditor: () => editorRef.current?.flush(),
      insertBlock: (kind: InsertKind) => editorRef.current?.insert(kind),
      exportDocument: (saveAs: boolean) => void exportDocument(saveAs),
      project: (acao: 'salvar' | 'abrir') => void project(acao)
    }),
    [toggleFocusMode, exportDocument, project]
  )

  // a prévia do operador é quem mede as fileiras e devolve ao main, para que
  // as duas janelas e o processo principal usem a mesma régua de rolagem
  const activeTabId = state?.activeTabId
  const handleMetrics = useCallback(
    (next: PrompterMetrics) => {
      setMetrics(next)
      if (activeTabId) dispatch({ type: 'layout/rows', tabId: activeTabId, rows: next.rows })
    },
    [activeTabId, dispatch]
  )

  const { run, keymap } = useCommands(state, rows, dispatch, ui)

  if (!state) {
    return <div className="flex h-full items-center justify-center text-[var(--color-fog-2)]">{t('app.loading')}</div>
  }

  const tab = activeTabOf(state)
  // o viewport informado pela própria janela de transmissão vale mais que a
  // medida do monitor: em cheio os dois não batem
  const viewport =
    state.output.viewport ??
    displays.find((d) => d.id === state.output.displayId)?.size ??
    FALLBACK_VIEWPORT
  const focusMode = state.layoutMode === 'focus'

  const editorTools = (
    <>
      <EditorTool icon="chapter" label={t('editor.chapter')} onClick={() => run('insert.chapter')} />
      <EditorTool icon="direction" label={t('editor.direction')} onClick={() => run('insert.direction')} />
      <span className="mx-0.5 h-3.5 w-px bg-[var(--color-line)]" />
      <EditorTool icon="undo" label={t('editor.undo')} disabled={!history.canUndo} onClick={() => run('edit.undo')} />
      <EditorTool icon="redo" label={t('editor.redo')} disabled={!history.canRedo} onClick={() => run('edit.redo')} />
    </>
  )

  const stage = (
    <PrompterStage
      blocks={tab.blocks}
      appearance={tab.appearance}
      transport={state.transport}
      viewport={viewport}
      rows={rows}
      marginGuides
      card={cartaoNoAr(state)}
      onSpeed={(delta) => dispatch({ type: 'transport/nudgePpm', delta })}
      onMetrics={handleMetrics}
    />
  )

  const markerStrip =
    tab.markers.length > 0 ? (
      <div className="flex flex-none items-center gap-1.5 overflow-x-auto border-t border-[var(--color-line)] px-3 py-1.5">
        {tab.markers.map((marker, index) => (
          <button
            key={marker.id}
            type="button"
            title={`Alt+${index + 1}`}
            onClick={() => dispatch({ type: 'transport/seekAnchor', anchor: { blockId: marker.blockId, wordOffset: 0 } })}
            onContextMenu={(event) => {
              event.preventDefault()
              dispatch({ type: 'marker/remove', tabId: tab.id, markerId: marker.id })
            }}
            className="flex flex-none items-center gap-1 rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]"
          >
            <Icon name="marker" size={11} />
            {marker.label}
          </button>
        ))}
      </div>
    ) : null

  /** Importa para uma aba nova, a menos que a atual esteja vazia. */
  const importDocument = async (): Promise<void> => {
    const result = await window.valendo.importDocument()
    if (!result) return

    if (result.text.trim().length > 0) {
      dispatch({
        type: 'document/import',
        title: result.title,
        text: result.text,
        intoNewTab: tab.blocks.length > 0
      })
    }
    if (result.warnings.length > 0) {
      setNotice({ title: t('notice.importInfo'), lines: result.warnings, tone: 'warn' })
    }
  }

  /** Arrasta a divisória: dá ao operador o controle do quanto cada painel ocupa. */
  const startDrag = (): void => {
    const onMove = (event: MouseEvent): void => {
      const box = mainRef.current?.getBoundingClientRect()
      if (!box) return
      setSplit(Math.min(0.72, Math.max(0.2, (event.clientX - box.left) / box.width)))
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="relative flex h-full flex-col bg-[var(--color-ink-0)]">
      <header className="flex flex-none items-center gap-4 border-b border-[var(--color-line)] bg-[var(--color-ink-1)] px-4 py-3">
        <Wordmark size={30} />
        <div className="h-12 w-px flex-none bg-[var(--color-line)]" />
        <div className="min-w-0 flex-1">
          <Tabs state={state} dispatch={dispatch} />
        </div>
        <div className="flex flex-none items-center gap-3 text-[13px]">
          {/* onde o transporte mora. Dois botões em vez de um alternador,
              porque o operador precisa ver qual das duas está valendo sem
              ter que lembrar o que o ícone significa quando está apagado */}
          <div
            data-paineis
            className="flex flex-none items-center gap-0.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] p-1"
          >
            {(['topo', 'regua'] as const).map((posicao) => (
              <button
                key={posicao}
                type="button"
                data-transport-position={posicao}
                title={`${t(posicao === 'topo' ? 'app.transportTop' : 'app.transportStrip')}${hint(keymap, 'view.transportPosition')}`}
                aria-pressed={state.transportPosition === posicao}
                onClick={() => dispatch({ type: 'layout/transportPosition', position: posicao })}
                className={`rounded-md p-1.5 transition-colors ${
                  state.transportPosition === posicao
                    ? 'bg-[var(--color-accent)]/16 text-[var(--color-accent)]'
                    : 'text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-1)]'
                }`}
              >
                <Icon name={posicao === 'topo' ? 'layoutSplit' : 'layoutDeck'} size={20} />
              </button>
            ))}
          </div>

          <LanguagePicker
            lang={state.language}
            onChange={(language) => dispatch({ type: 'app/language', language })}
          />
          <button
            type="button"
            onClick={() => dispatch({ type: 'layout/inspector', visible: !state.inspectorVisible })}
            title={t('app.settings')}
            className={`rounded p-2 hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] ${
              state.inspectorVisible ? 'text-[var(--color-fog-0)]' : 'text-[var(--color-fog-2)]'
            }`}
          >
            <Icon name="sliders" size={30} />
          </button>
          <button
            type="button"
            onClick={() => setKeymapOpen(true)}
            title={t('app.shortcuts')}
            className="rounded p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="keyboard" size={30} />
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            title={t('app.palette')}
            className="rounded p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="search" size={30} />
          </button>
          <button
            type="button"
            onClick={() => setCredits(true)}
            title={t('app.credits')}
            className="rounded p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="info" size={30} />
          </button>

          {/* estado da transmissão fica por último e maior: é a informação que
              o operador precisa achar sem procurar */}
          {state.output.enabled ? (
            <span className="rounded bg-[var(--color-live)]/16 px-3.5 py-1.5 text-[20px] text-[var(--color-live)]">
              {t('app.onAir')}
            </span>
          ) : (
            <span className="px-1 text-[20px] text-[var(--color-fog-2)]">{t('app.offAir')}</span>
          )}
        </div>
      </header>

      {/* faixa fixa, e não um aviso que some sozinho: se o app não está
          gravando, isso precisa continuar na frente do operador até deixar de
          ser verdade. O aviso do que já aconteceu tem o × porque ele não deixa
          de ser verdade nunca — só de ser novidade */}
      {storage.problem ? (
        <StorageStrip mark="storage-problem" message={storage.problem} />
      ) : null}
      {storage.notice ? (
        <StorageStrip
          mark="storage-notice"
          message={storage.notice}
          onDismiss={() => dispatch({ type: 'storage/dismissNotice' })}
        />
      ) : null}

      <BarraDeArquivo
        state={state}
        tab={tab}
        displays={displays}
        keymap={keymap}
        dispatch={dispatch}
        run={run}
        onImport={importDocument}
        webviewLive={state.webview.enabled && webview.running && !webview.error}
        onOpenWebview={() => setWebviewOpen(true)}
        onOpenCards={() => dispatch({ type: 'layout/cards', visible: !state.cardsVisible })}
      />

      {/* no topo, o transporte vem logo abaixo do arquivo e as duas barras
          leem como uma só. Na régua, ele desce para depois do roteiro */}
      {state.transportPosition === 'topo' ? (
        <BarraDeTransporte
          state={state}
          tab={tab}
          keymap={keymap}
          rows={rows}
          dispatch={dispatch}
          run={run}
          position="topo"
        />
      ) : null}

      {state.layoutMode === 'deck' ? (
        <Deck
          tab={tab}
          transport={state.transport}
          rows={rows}
          viewport={viewport}
          card={cartaoNoAr(state)}
          dispatch={dispatch}
          onMetrics={handleMetrics}
        />
      ) : focusMode ? (
        /* só a operação: no Foco não há editor nenhum. Escrever é trabalho do
           Split, e uma gaveta de edição aqui só tirava altura da única coisa
           que este modo existe para mostrar — a tela do apresentador */
        <main className="flex min-h-0 flex-1 flex-col">
          <PanelHeader
            label={t('panel.broadcasting')}
            detail={`${viewport.width} × ${viewport.height}`}
            action={
              <button
                type="button"
                onClick={toggleFocusMode}
                title={t('panel.collapse')}
                className="rounded p-0.5 text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
              >
                <Icon name="collapse" size={14} />
              </button>
            }
          />
          {stage}
          {markerStrip}
        </main>
      ) : (
        <main ref={mainRef} className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-col" style={{ flex: `${split} 1 0` }}>
            <PanelHeader label={t('panel.edit')} detail={t('panel.edit.hint')} action={editorTools} />
            <Editor ref={editorRef} tab={tab} dispatch={dispatch} />
          </section>

          <div
            onMouseDown={startDrag}
            className="w-1 flex-none cursor-col-resize bg-[var(--color-line)] hover:bg-[var(--color-fog-2)]"
          />

          <section className="flex min-w-0 flex-col" style={{ flex: `${1 - split} 1 0` }}>
            <PanelHeader
              label={t('panel.broadcasting')}
              detail={`${viewport.width} × ${viewport.height}`}
              action={
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  title={t('panel.expand')}
                  className="rounded p-0.5 text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
                >
                  <Icon name="expand" size={14} />
                </button>
              }
            />
            {stage}
            {markerStrip}
          </section>

          {state.inspectorVisible ? (
            <Inspector
              tab={tab}
              presets={state.presets}
              metrics={metrics}
              customDefaults={state.customDefaults}
              dispatch={dispatch}
            />
          ) : null}
        </main>
      )}

      {/* a régua: entre o roteiro e os cartões, que é onde o olho já está
          durante o programa. Fica fora dos três modos pelo mesmo motivo da
          gaveta — trocar de modo não pode fazer o play sumir da tela */}
      {state.transportPosition === 'regua' ? (
        <BarraDeTransporte
          state={state}
          tab={tab}
          keymap={keymap}
          rows={rows}
          dispatch={dispatch}
          run={run}
          position="regua"
        />
      ) : null}

      {/* fora dos três modos, e não dentro de cada um: a gaveta é a mesma no
          Split, no Foco e na Mesa, e trocar de modo não pode fazer as artes
          do programa sumirem da tela */}
      {state.cardsVisible ? (
        <CardsDrawer
          cards={state.cards}
          noAr={state.transport.card}
          blackout={state.transport.blackout}
          clock={state.transport.video}
          videoPerfil={state.webview.videoPerfil}
          altura={state.cardsHeight}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'layout/cards', visible: false })}
        />
      ) : null}

      <StatusBar
        state={state}
        tab={tab}
        history={history}
        rows={rows}
        storage={storage}
        dispatch={dispatch}
        onOpenCredits={() => setCredits(true)}
        onModeChange={(mode) => dispatch({ type: 'layout/mode', mode })}
      />

      {notice ? (
        <div
          data-notice={notice.tone}
          className={`absolute right-4 bottom-10 z-40 w-[340px] rounded-lg border bg-[var(--color-ink-2)] px-3 py-2.5 ${
            notice.tone === 'ok' ? 'border-[var(--color-go)]/40' : 'border-[var(--color-warn)]/40'
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            <span
              className="text-[11px] font-medium"
              style={{ color: notice.tone === 'ok' ? 'var(--color-go)' : 'var(--color-warn)' }}
            >
              {notice.title}
            </span>
            <button
              type="button"
              aria-label={t('app.dismiss')}
              onClick={() => setNotice(null)}
              className="ml-auto text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
          {notice.lines.map((message, index) => (
            <p key={index} className="text-[11px] leading-relaxed break-all text-[var(--color-fog-1)]">
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {webviewOpen ? (
        <WebviewPanel
          info={webview}
          enabled={state.webview.enabled}
          videoPerfil={state.webview.videoPerfil}
          dispatch={dispatch}
          onClose={() => setWebviewOpen(false)}
        />
      ) : null}
      {credits ? <Credits onClose={() => setCredits(false)} /> : null}
      {palette ? (
        <CommandPalette keymap={keymap} onRun={run} onClose={() => setPalette(false)} />
      ) : null}
      {keymapOpen ? (
        <KeymapEditor
          keymap={keymap}
          overrides={state.keymap}
          dispatch={dispatch}
          onClose={() => setKeymapOpen(false)}
        />
      ) : null}
      {closeConfirm ? (
        <CloseConfirm onCancel={() => respondToClose(false)} onConfirm={() => respondToClose(true)} />
      ) : null}
    </div>
  )
}
