import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InsertKind } from '@shared/insertBlock'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { PrompterStage } from '../prompter/PrompterStage'
import { composeLines, totalWords } from '@shared/anchor'
import { cartaoNoAr } from '@shared/cards'
import { formatClock, secondsForWords } from '@shared/pacing'
import { totalWordCount } from '@shared/text'
import type { Tab } from '@shared/types'
import { LANGS, type Lang } from '@shared/i18n'
import { ProvedorDeIdioma, useT } from '../i18n'
import { activeTabOf, useAppState } from '../state/useAppState'
import { Icon, type IconName } from '../ui/Icon'
import { CabecalhoDePainel, Poco, Tecla } from '../ui/console'
import { Wordmark, versionLabel } from '../ui/Wordmark'
import { CloseConfirm } from './CloseConfirm'
import { CardsDrawer } from './CardsDrawer'
import { CommandPalette } from './CommandPalette'
import { Credits } from './Credits'
import { Deck } from './deck/Deck'
import { Editor, type EditorHandle } from './Editor'
import { Inspector } from './Inspector'
import { KeymapEditor } from './KeymapEditor'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { BarraDeArquivo, BarraDeTransporte, hint } from './Toolbar'
import { WebviewPanel } from './WebviewPanel'
import { useCommands } from './useCommands'

const FALLBACK_VIEWPORT = { width: 1_920, height: 1_080 }

interface Notice {
  title: string
  lines: string[]
  tone: 'ok' | 'warn'
}

/**
 * Cabeçalho de painel com a moldura do console: filete colorido no topo,
 * gradiente tingido, título na cor da seção. A cor é a assinatura — âmbar é
 * Edição, vermelho é Saída — e o `ponto` é o olhinho de estado da Saída.
 */
export function PanelHeader({
  label,
  detail,
  cor,
  ponto,
  action
}: {
  label: string
  detail?: React.ReactNode
  cor?: string
  ponto?: boolean
  action?: React.ReactNode
}): React.JSX.Element {
  return <CabecalhoDePainel cor={cor} ponto={ponto} titulo={label} detalhe={detail} acao={action} />
}

/**
 * O "83 palavras · 1:54" do cabeçalho da Edição. Palavras é a contagem de
 * fala; o tempo sai da MESMA régua que governa a rolagem — não é uma conta
 * paralela, é a que o console também mostra.
 */
function MetaDaEdicao({ tab, rows, ppm }: { tab: Tab; rows: number[]; ppm: number }): React.JSX.Element {
  const { t, lang } = useT()
  const spoken = useMemo(() => totalWordCount(tab.blocks), [tab.blocks])
  const ruler = useMemo(
    () => totalWords(composeLines(tab.blocks, tab.appearance, rows)),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  return (
    <>{t('panel.edit.meta', { words: spoken.toLocaleString(lang), time: formatClock(secondsForWords(ruler, ppm)) })}</>
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
        className={`flex h-8 items-center rounded-md px-2 text-[13px] font-semibold tracking-wide uppercase hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] ${
          aberto ? 'text-[var(--color-fog-0)]' : 'text-[var(--color-fog-2)]'
        }`}
      >
        {atual.sigla}
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
  // nome do projeto para o centro do cabeçalho: só o arquivo, sem pasta nem
  // extensão — o caminho inteiro não cabe ali e não é o que identifica o
  // programa para quem está olhando de longe
  const nomeDoProjeto = state.projectPath
    ? (state.projectPath.split(/[\\/]/).pop() ?? state.projectPath).replace(/\.valendo$/i, '')
    : null
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

  const cardsDrawer = state.cardsVisible ? (
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
  ) : null

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
      {/* a linha do wordmark: identidade à esquerda, controles do app à
          direita. Quem diz se o programa está no ar é o Transmitir, no poço
          SAÍDA — o aviso gigante daqui saiu porque dois avisos do mesmo fato
          ensinavam o olho a ignorar um deles */}
      <header
        className="relative flex flex-none items-center gap-3 border-b border-[var(--color-edge)] px-2.5 py-1.5"
        style={{ background: 'linear-gradient(#212125, #1a1a1e)' }}
      >
        <div className="flex flex-none items-center border-r border-[var(--color-edge)] pr-3">
          <Wordmark size={30} subtitle={false} />
        </div>
        <span className="flex-none text-[12px] whitespace-nowrap text-[var(--color-fog-2)]">{versionLabel()}</span>

        {/* centralizado de verdade — `absolute`, e não flex/auto-margin, para
            não depender de quanto os grupos dos dois lados pesam (o mesmo
            truque do seletor de modo no rodapé). Só aparece com um .valendo
            de verdade por trás: nome de projeto que não existe ainda não
            é nome de nada. */}
        {nomeDoProjeto ? (
          <div
            data-project-name
            className="absolute left-1/2 -translate-x-1/2 truncate text-[13px] font-medium"
            style={{ color: '#62a8ff' }}
          >
            {nomeDoProjeto}
          </div>
        ) : null}

        <div className="ml-auto flex flex-none items-center gap-2">
          {/* os painéis do app: Assets (coluna esquerda), Cards (gaveta) e
              Ajustes são liga-desliga — cada tecla mantém a cor do painel que
              controla, acesa ou não, para reconhecer de longe qual está
              aberto sem ler o ícone. Depois do traço, o transporte escolhe
              ONDE morar, não SE aparece — por isso fica separado dos três. */}
          <div data-paineis className="flex flex-none items-center gap-[7px]">
            <span className="k-microcaps text-[var(--color-fog-2)]">{t('app.panels')}</span>
            <Poco>
              <Tecla
                data-toggle-sidebar
                title={t('app.assets')}
                aria-pressed={state.sidebarVisible}
                acesa={state.sidebarVisible}
                cor="var(--color-warn)"
                className="h-6 w-8"
                style={!state.sidebarVisible ? { color: 'var(--color-warn)' } : undefined}
                onClick={() => dispatch({ type: 'layout/sidebar', visible: !state.sidebarVisible })}
              >
                <Icon name="sidebarLeft" size={15} />
              </Tecla>
              <Tecla
                data-toggle-cards
                title={`${t('cards.toolbar')}${hint(keymap, 'view.cards')}`}
                aria-pressed={state.cardsVisible}
                acesa={state.cardsVisible}
                cor="var(--color-accent-2)"
                className="h-6 w-8"
                style={!state.cardsVisible ? { color: 'var(--color-accent-2)' } : undefined}
                onClick={() => run('view.cards')}
              >
                <Icon name="card" size={15} />
              </Tecla>
              <Tecla
                data-toggle-settings
                title={`${t('app.settings')}${hint(keymap, 'view.inspector')}`}
                aria-pressed={state.inspectorVisible}
                acesa={state.inspectorVisible}
                cor="var(--color-accent)"
                className="h-6 w-8"
                style={!state.inspectorVisible ? { color: 'var(--color-accent)' } : undefined}
                onClick={() => run('view.inspector')}
              >
                <Icon name="sliders" size={15} />
              </Tecla>

              <span className="mx-0.5 h-4 w-px flex-none bg-[var(--color-edge)]" />

              {(['topo', 'regua'] as const).map((posicao) => (
                <Tecla
                  key={posicao}
                  data-transport-position={posicao}
                  title={`${t(posicao === 'topo' ? 'app.transportTop' : 'app.transportStrip')}${hint(keymap, 'view.transportPosition')}`}
                  aria-pressed={state.transportPosition === posicao}
                  acesa={state.transportPosition === posicao}
                  cor="var(--color-accent)"
                  className="h-6 w-8"
                  onClick={() => dispatch({ type: 'layout/transportPosition', position: posicao })}
                >
                  <Icon name={posicao === 'topo' ? 'layoutSplit' : 'layoutDeck'} size={15} />
                </Tecla>
              ))}
            </Poco>
          </div>

          <button
            type="button"
            onClick={() => setKeymapOpen(true)}
            title={t('app.shortcuts')}
            className="flex h-8 w-9 items-center justify-center rounded-md text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="keyboard" size={20} />
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            title={t('app.palette')}
            className="flex h-8 w-9 items-center justify-center rounded-md text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="search" size={20} />
          </button>
          <LanguagePicker
            lang={state.language}
            onChange={(language) => dispatch({ type: 'app/language', language })}
          />
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
      />

      {/* no topo, o transporte vem logo abaixo do arquivo e as duas barras
          leem como uma só. Na régua, ele desce para depois do roteiro */}
      {state.transportPosition === 'topo' ? (
        <BarraDeTransporte
          state={state}
          tab={tab}
          displays={displays}
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
            cor="var(--color-live)"
            ponto
            action={
              <>
                <span className="font-mono text-[10px] text-[var(--color-fog-3)]">{`${viewport.width} × ${viewport.height}`}</span>
                <button
                  type="button"
                  onClick={toggleFocusMode}
                  title={t('panel.collapse')}
                  className="rounded p-0.5 text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
                >
                  <Icon name="collapse" size={14} />
                </button>
              </>
            }
          />
          {stage}
          {markerStrip}
          {cardsDrawer}
        </main>
      ) : (
        <main ref={mainRef} className="flex min-h-0 flex-1">
          {/* só no Split: no Foco a tela é do apresentador e na Mesa o rundown
              já mostra os mesmos capítulos, em maior e com linha do tempo —
              ter as duas coisas ao mesmo tempo seria dizer duas vezes. E só
              se Assets estiver aceso: é um painel como o de Ajustes, e o
              operador pode querer a tela inteira para o roteiro e a saída. */}
          {state.sidebarVisible ? (
            <Sidebar
              tab={tab}
              transport={state.transport}
              cards={state.cards}
              rows={rows}
              dispatch={dispatch}
            />
          ) : null}

          {/* a coluna do meio: edição + transmissão numa fileira, a gaveta de
              cartões embaixo — com a MESMA largura das duas, nunca a da
              janela inteira. É o que deixa a coluna e o inspetor virem
              inteiros até o rodapé, como na maquete, em vez de os dois
              pararem onde a gaveta (antes irmã da `main`) começava. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              <section className="flex min-w-0 flex-col" style={{ flex: `${split} 1 0` }}>
                <PanelHeader
                  label={t('panel.edit')}
                  cor="var(--color-warn)"
                  detail={<MetaDaEdicao tab={tab} rows={rows} ppm={state.transport.ppm} />}
                  action={editorTools}
                />
                <Editor ref={editorRef} tab={tab} dispatch={dispatch} />
              </section>

              <div
                onMouseDown={startDrag}
                className="w-1 flex-none cursor-col-resize bg-[var(--color-line)] hover:bg-[var(--color-fog-2)]"
              />

              <section className="flex min-w-0 flex-col" style={{ flex: `${1 - split} 1 0` }}>
                <PanelHeader
                  label={t('panel.broadcasting')}
                  cor="var(--color-live)"
                  ponto
                  action={
                    <>
                      <span className="font-mono text-[10px] text-[var(--color-fog-3)]">{`${viewport.width} × ${viewport.height}`}</span>
                      <button
                        type="button"
                        onClick={toggleFocusMode}
                        title={t('panel.expand')}
                        className="rounded p-0.5 text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
                      >
                        <Icon name="expand" size={14} />
                      </button>
                    </>
                  }
                />
                {stage}
                {markerStrip}
              </section>
            </div>

            {state.transportPosition === 'regua' ? (
              <BarraDeTransporte
                state={state}
                tab={tab}
                displays={displays}
                keymap={keymap}
                rows={rows}
                dispatch={dispatch}
                run={run}
                position="regua"
              />
            ) : null}

            {cardsDrawer}
          </div>

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

      {/* Foco e Mesa não têm coluna nem inspetor — a régua fica fora do
          conteúdo do modo, entre o roteiro e o resto da tela, igual já era */}
      {state.transportPosition === 'regua' && state.layoutMode !== 'split' ? (
        <BarraDeTransporte
          state={state}
          tab={tab}
          displays={displays}
          keymap={keymap}
          rows={rows}
          dispatch={dispatch}
          run={run}
          position="regua"
        />
      ) : null}

      {/* na Mesa não há sidebar nem inspetor: a gaveta segue em largura
          total, como sempre foi */}
      {state.layoutMode === 'deck' ? cardsDrawer : null}

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
