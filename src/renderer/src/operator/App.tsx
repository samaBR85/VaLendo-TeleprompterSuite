import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InsertKind } from '@shared/insertBlock'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { PrompterStage } from '../prompter/PrompterStage'
import { activeTabOf, useAppState } from '../state/useAppState'
import { Icon } from '../ui/Icon'
import { Wordmark } from '../ui/Wordmark'
import { CommandPalette } from './CommandPalette'
import { Credits } from './Credits'
import { Editor, type EditorHandle } from './Editor'
import { Inspector } from './Inspector'
import { KeymapEditor } from './KeymapEditor'
import { StatusBar } from './StatusBar'
import { Tabs } from './Tabs'
import { Toolbar } from './Toolbar'
import { useCommands } from './useCommands'

const FALLBACK_VIEWPORT = { width: 1_920, height: 1_080 }

function PanelHeader({
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

function StorageStrip({
  mark,
  message,
  onDismiss
}: {
  mark: string
  message: string
  onDismiss?: () => void
}): React.JSX.Element {
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
          aria-label="Dispensar"
          onClick={onDismiss}
          className="mt-0.5 flex-none opacity-70 hover:opacity-100"
        >
          <Icon name="close" size={12} />
        </button>
      ) : null}
    </div>
  )
}

export function App(): React.JSX.Element {
  const { state, history, displays, rows, storage, dispatch } = useAppState()
  const [palette, setPalette] = useState(false)
  const [keymapOpen, setKeymapOpen] = useState(false)
  const [split, setSplit] = useState(0.46)
  const [metrics, setMetrics] = useState<PrompterMetrics | null>(null)
  const [credits, setCredits] = useState(false)
  const [notice, setNotice] = useState<string[]>([])
  const mainRef = useRef<HTMLElement>(null)
  const editorRef = useRef<EditorHandle>(null)

  useEffect(() => {
    if (notice.length === 0) return
    const timer = setTimeout(() => setNotice([]), 9_000)
    return () => clearTimeout(timer)
  }, [notice])

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
      insertBlock: (kind: InsertKind) => editorRef.current?.insert(kind)
    }),
    [toggleFocusMode]
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
    return <div className="flex h-full items-center justify-center text-[var(--color-fog-2)]">Carregando…</div>
  }

  const tab = activeTabOf(state)
  // o viewport informado pela própria janela de transmissão vale mais que a
  // medida do monitor: em cheio os dois não batem
  const viewport =
    state.output.viewport ??
    displays.find((d) => d.id === state.output.displayId)?.size ??
    FALLBACK_VIEWPORT
  const focusMode = state.layoutMode === 'focus'

  const stage = (
    <PrompterStage
      blocks={tab.blocks}
      appearance={tab.appearance}
      transport={state.transport}
      viewport={viewport}
      rows={rows}
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
    if (result.warnings.length > 0) setNotice(result.warnings)
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
          <button
            type="button"
            onClick={() => dispatch({ type: 'layout/inspector', visible: !state.inspectorVisible })}
            title="Ajustes"
            className={`rounded p-2 hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] ${
              state.inspectorVisible ? 'text-[var(--color-fog-0)]' : 'text-[var(--color-fog-2)]'
            }`}
          >
            <Icon name="sliders" size={30} />
          </button>
          <button
            type="button"
            onClick={() => setKeymapOpen(true)}
            title="Editar atalhos · Ctrl+,"
            className="rounded p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="keyboard" size={30} />
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            title="Paleta de comandos · Ctrl+K"
            className="rounded p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="search" size={30} />
          </button>
          <button
            type="button"
            onClick={() => setCredits(true)}
            title="Créditos"
            className="rounded p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="info" size={30} />
          </button>

          {/* estado da transmissão fica por último e maior: é a informação que
              o operador precisa achar sem procurar */}
          {state.output.enabled ? (
            <span className="rounded bg-[var(--color-live)]/16 px-3.5 py-1.5 text-[20px] text-[var(--color-live)]">
              No ar
            </span>
          ) : (
            <span className="px-1 text-[20px] text-[var(--color-fog-2)]">fora do ar</span>
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

      <Toolbar
        state={state}
        tab={tab}
        history={history}
        displays={displays}
        keymap={keymap}
        dispatch={dispatch}
        run={run}
        onImport={importDocument}
      />

      {focusMode ? (
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <PanelHeader
              label="Transmitindo"
              detail={`${viewport.width} × ${viewport.height}`}
              action={
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  title="Voltar ao split · F11"
                  className="rounded p-0.5 text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
                >
                  <Icon name="collapse" size={14} />
                </button>
              }
            />
            {stage}
            {markerStrip}
          </div>
          <div className="flex h-[34%] min-h-0 flex-col border-t border-[var(--color-line)]">
            <PanelHeader label="Gaveta de edição" detail="edita no ar · F11 recolhe" />
            <Editor ref={editorRef} tab={tab} dispatch={dispatch} />
          </div>
        </main>
      ) : (
        <main ref={mainRef} className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-col" style={{ flex: `${split} 1 0` }}>
            <PanelHeader label="Edição" detail="[direções] · § capítulos" />
            <Editor ref={editorRef} tab={tab} dispatch={dispatch} />
          </section>

          <div
            onMouseDown={startDrag}
            className="w-1 flex-none cursor-col-resize bg-[var(--color-line)] hover:bg-[var(--color-fog-2)]"
          />

          <section className="flex min-w-0 flex-col" style={{ flex: `${1 - split} 1 0` }}>
            <PanelHeader
              label="Transmitindo"
              detail={`${viewport.width} × ${viewport.height}`}
              action={
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  title="Expandir a transmissão · F11"
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

      <StatusBar
        state={state}
        tab={tab}
        history={history}
        rows={rows}
        storage={storage}
        dispatch={dispatch}
        onOpenCredits={() => setCredits(true)}
      />

      {notice.length > 0 ? (
        <div className="absolute right-4 bottom-10 z-40 w-[340px] rounded-lg border border-[var(--color-warn)]/40 bg-[var(--color-ink-2)] px-3 py-2.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--color-warn)]">Sobre a importação</span>
            <button
              type="button"
              aria-label="Dispensar"
              onClick={() => setNotice([])}
              className="ml-auto text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
          {notice.map((message, index) => (
            <p key={index} className="text-[11px] leading-relaxed text-[var(--color-fog-1)]">
              {message}
            </p>
          ))}
        </div>
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
    </div>
  )
}
