import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InsertKind } from '@shared/insertBlock'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { PrompterStage } from '../prompter/PrompterStage'
import { composeLines, totalWords } from '@shared/anchor'
import { cartaoNoAr } from '@shared/cards'
import { formatClock, secondsForWords } from '@shared/pacing'
import { anchorFromCaret, hasFormatting, totalWordCount } from '@shared/text'
import type { Tab } from '@shared/types'
import { LANGS, type Lang } from '@shared/i18n'
import { ProvedorDeIdioma, useT } from '../i18n'
import { activeTabOf, useAppState } from '../state/useAppState'
import { Icon, type IconName } from '../ui/Icon'
import { CabecalhoDePainel, SliderConsole, Tecla } from '../ui/console'
import { Wordmark, versionLabel } from '../ui/Wordmark'
import { UI_SCALE_MAX, UI_SCALE_MIN, UI_SCALE_STEP, applyUiScale, clampUiScale, loadUiScale } from '../ui/uiScale'
import { CloseConfirm } from './CloseConfirm'
import { UnsavedConfirm } from './UnsavedConfirm'
import { CardsDrawer } from './CardsDrawer'
import { CommandPalette } from './CommandPalette'
import { Credits } from './Credits'
import { Deck } from './deck/Deck'
import { EDITOR_FONT_MAX, EDITOR_FONT_MIN } from '@shared/defaults'
import { Editor, type EditorHandle } from './Editor'
import { Inspector } from './Inspector'
import { KeymapEditor } from './KeymapEditor'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { BarraDeArquivo, BarraDeTransporte, PocoDoAr, hint } from './Toolbar'
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
 * Um "aA" das pontas do slider de fonte, que anda um ponto por clique. O
 * tamanho do próprio glifo diz para que lado ele anda — o menor diminui.
 */
function FontStep({
  label,
  size,
  disabled,
  onClick
}: {
  label: string
  size: number
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
      style={{ fontSize: size }}
      className="flex-none rounded px-1 leading-none text-[var(--color-fog-3)] hover:text-[var(--color-fog-0)] disabled:opacity-30 disabled:hover:text-[var(--color-fog-3)]"
    >
      Aa
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

/**
 * A escala da interface do operador — o app inteiro, não só as letras.
 *
 * Fica com os outros controles do PROGRAMA (atalhos, busca, idioma) porque é
 * disso que se trata: não é aparência do roteiro, é o tamanho da mesa para o
 * olho de quem opera. O porquê de escalar tudo junto, e de isso nunca alcançar
 * a transmissão, está em `ui/uiScale.ts`.
 *
 * O gatilho mostra a porcentagem quando ela não é 100%: uma interface fora da
 * escala natural muda TODA medida da tela, e o operador precisa poder
 * descobrir isso olhando, sem abrir nada.
 */
function ScalePicker({
  scale,
  onChange
}: {
  scale: number
  onChange: (scale: number) => void
}): React.JSX.Element {
  const { t } = useT()
  const [aberto, setAberto] = useState(false)
  const porcento = Math.round(scale * 100)

  useEffect(() => {
    if (!aberto) return
    const fechar = (): void => setAberto(false)
    window.addEventListener('mousedown', fechar)
    return () => window.removeEventListener('mousedown', fechar)
  }, [aberto])

  return (
    <div className="relative" onMouseDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        data-ui-scale-picker
        title={`${t('app.uiScale')} — ${porcento}%`}
        aria-label={t('app.uiScale')}
        onClick={() => setAberto((v) => !v)}
        className={`flex h-8 items-center gap-1 rounded-md px-2 hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] ${
          aberto ? 'text-[var(--color-fog-0)]' : 'text-[var(--color-fog-2)]'
        }`}
      >
        <Icon name="uiScale" size={20} />
        {porcento === 100 ? null : (
          <span className="font-mono text-[10px] tabular-nums">{porcento}%</span>
        )}
      </button>

      {aberto ? (
        <div
          data-ui-scale-menu
          className="absolute top-full right-0 z-50 mt-1 w-[236px] rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] p-3"
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] text-[var(--color-fog-1)]">{t('app.uiScale')}</span>
            <span className="font-mono text-[12px] text-[var(--color-fog-0)] tabular-nums">{porcento}%</span>
          </div>
          <SliderConsole
            value={scale}
            min={UI_SCALE_MIN}
            max={UI_SCALE_MAX}
            step={UI_SCALE_STEP}
            cor="var(--color-accent)"
            aria-label={t('app.uiScale')}
            onValue={onChange}
            className="w-full"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="k-microcaps text-[var(--color-fog-3)]">
              {Math.round(UI_SCALE_MIN * 100)}% · {Math.round(UI_SCALE_MAX * 100)}%
            </span>
            <button
              type="button"
              data-ui-scale-reset
              disabled={porcento === 100}
              onClick={() => onChange(1)}
              className="rounded border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              {t('app.uiScaleReset')}
            </button>
          </div>
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
  // escala da interface: preferência da MÁQUINA, não do projeto — o valor já
  // foi aplicado antes do primeiro render (main.tsx); aqui só se guarda o que
  // está valendo, para o slider e o indicador mostrarem a verdade
  const [uiScale, setUiScale] = useState(loadUiScale)
  // espelho da escala para os atalhos: o `ui` dos comandos é memoizado, e sem
  // isso o `+` leria sempre a escala do render em que foi montado
  const escalaAtual = useRef(uiScale)
  escalaAtual.current = uiScale
  const [metrics, setMetrics] = useState<PrompterMetrics | null>(null)
  const [credits, setCredits] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [unsavedConfirm, setUnsavedConfirm] = useState(false)
  /**
   * CATCH: com ele ligado, a marca de leitura persegue o cursor do editor
   * sozinha — um "Go To" que nunca desliga. Preferência de sessão, como a
   * aba ativa do editor de nome: não sobrevive a fechar o app, e não é do
   * projeto — é só um jeito de operar que o operador liga quando quer.
   */
  const [catchAtivo, setCatchAtivo] = useState(false)
  const catchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** a divisória Edição×Transmissão mede a fração contra ESTE container — só as duas seções, nunca a Sidebar nem o Inspetor */
  const splitRef = useRef<HTMLDivElement>(null)
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

  /** Grava ou abre o programa inteiro num .valendo. Devolve se a gravação deu certo. */
  const project = useCallback(async (acao: 'salvar' | 'salvarComo' | 'abrir'): Promise<boolean> => {
    const salvando = acao === 'salvar' || acao === 'salvarComo'
    if (salvando) editorRef.current?.flush()
    await window.valendo.getState()

    const result = salvando
      ? await window.valendo.saveProject(acao === 'salvarComo')
      : await window.valendo.openProject()
    if (!result) return false

    setNotice(
      result.ok
        ? {
            title: salvando ? t('notice.projectSaved') : t('notice.projectOpened'),
            lines: [result.path],
            tone: 'ok'
          }
        : {
            title: salvando ? t('notice.projectSaveFail') : t('notice.projectOpenFail'),
            lines: [result.error ?? t('notice.unknownError')],
            tone: 'warn'
          }
    )
    return result.ok
  }, [])

  /**
   * Pedido de "novo projeto": se não há nada não salvo, cria direto; senão,
   * pergunta primeiro — o mesmo cuidado do fechar-com-transmissão-no-ar, só
   * que aqui a pergunta é sobre o projeto, não sobre a transmissão.
   */
  const novoProjeto = useCallback(async (): Promise<void> => {
    editorRef.current?.flush()
    await window.valendo.getState()
    const dirty = await window.valendo.projectIsDirty()
    if (dirty) {
      setUnsavedConfirm(true)
      return
    }
    dispatch({ type: 'project/new' })
  }, [dispatch])

  /** Aplica, grava e reflete no slider — a mesma porta para o slider e para os atalhos. */
  const mudarEscala = useCallback((escala: number) => {
    setUiScale(applyUiScale(escala))
  }, [])

  const toggleFocusMode = useCallback(() => {
    if (!state) return
    dispatch({ type: 'layout/mode', mode: state.layoutMode === 'focus' ? 'split' : 'focus' })
  }, [state, dispatch])

  /**
   * "Go To": só reposiciona a marca de leitura no ponto do cursor do editor —
   * nunca liga nem desliga o play. Tocando, ela salta e segue rolando dali;
   * pausada, salta e continua pausada.
   */
  const goToCaret = useCallback(() => {
    const handle = editorRef.current
    if (!handle || !state) return
    handle.flush()
    const { text, position } = handle.caret()
    const anchor = anchorFromCaret(activeTabOf(state).blocks, text, position)
    if (!anchor) return
    dispatch({ type: 'transport/seekAnchor', anchor })
  }, [state, dispatch])

  /**
   * O CATCH: cada movimento do cursor rearma um `goToCaret` daqui a pouco,
   * em vez de disparar na hora.
   *
   * Sem o atraso, digitar em ritmo normal mandaria um `seekAnchor` por letra
   * — o cursor anda a cada tecla, tanto quanto no clique ou na seta. Com ele,
   * uma rajada de teclas só dispara UM salto, depois que os dedos param —
   * o mesmo respiro que o próprio texto já usa antes de mandar para o main.
   */
  const onCaretMove = useCallback(() => {
    if (!catchAtivo) return
    if (catchTimer.current) clearTimeout(catchTimer.current)
    catchTimer.current = setTimeout(goToCaret, 220)
  }, [catchAtivo, goToCaret])

  useEffect(() => {
    return () => {
      if (catchTimer.current) clearTimeout(catchTimer.current)
    }
  }, [])

  /**
   * A roda do mouse muda o ritmo em QUALQUER lugar da mesa — menos onde ela
   * já tem dono.
   *
   * Antes valia só sobre a prévia e sobre a régua de velocidade, o que obriga
   * a mirar num alvo específico para acelerar no meio de um programa. Agora o
   * ouvinte é da janela, e a regra é a inversa: a roda pertence ao ritmo, a
   * não ser que o que está sob o ponteiro precise mesmo dela.
   *
   * Quem fica de fora:
   * - o editor, os atalhos e a paleta de comandos, ditos pelo operador: nos
   *   três a roda é o jeito de percorrer o conteúdo;
   * - qualquer painel que ROLE DE VERDADE naquele instante — os Ajustes e a
   *   coluna de Assets são listas altas, e sem esta parte da regra a metade
   *   de baixo delas ficaria inalcançável. Não é um item a mais da lista do
   *   operador: é a mesma razão que já justificava os três, aplicada a quem
   *   também rola;
   * - o que já foi tratado por outro handler (`defaultPrevented`) — a régua
   *   de velocidade tem o seu próprio, e sem esta guarda um giro sobre ela
   *   contaria duas vezes.
   */
  useEffect(() => {
    const rolavel = (alvo: EventTarget | null): boolean => {
      let no = alvo instanceof HTMLElement ? alvo : null
      while (no && no !== document.body) {
        // `data-sem-roda` marca as ilhas onde a roda é do conteúdo mesmo
        // quando elas ainda não têm o que rolar (uma paleta com dois
        // resultados, por exemplo) — senão a regra ligaria e desligaria
        // conforme o tamanho da lista
        if (no.dataset.semRoda !== undefined) return true
        const estilo = getComputedStyle(no)
        const podeRolar = /auto|scroll/.test(estilo.overflowY) && no.scrollHeight > no.clientHeight + 1
        if (podeRolar) return true
        no = no.parentElement
      }
      return false
    }

    const naRoda = (event: WheelEvent): void => {
      if (event.defaultPrevented || event.ctrlKey) return
      if (rolavel(event.target)) return
      event.preventDefault()
      dispatch({ type: 'transport/nudgePpm', delta: event.deltaY < 0 ? 1 : -1 })
    }

    // `passive: false` porque a intenção é justamente tomar a roda do
    // navegador; sem isso o `preventDefault` é ignorado
    window.addEventListener('wheel', naRoda, { passive: false })
    return () => window.removeEventListener('wheel', naRoda)
  }, [dispatch])

  // desligar cancela o salto que ainda estava para acontecer — senão um
  // clique em CATCH bem no meio da espera dispararia um Go To indesejado
  useEffect(() => {
    if (catchAtivo || !catchTimer.current) return
    clearTimeout(catchTimer.current)
    catchTimer.current = null
  }, [catchAtivo])

  const ui = useMemo(
    () => ({
      openPalette: () => setPalette(true),
      openKeymap: () => setKeymapOpen(true),
      toggleFocusMode,
      flushEditor: () => editorRef.current?.flush(),
      insertBlock: (kind: InsertKind) => editorRef.current?.insert(kind),
      removerFormatacao: () => editorRef.current?.removerFormatacao(),
      exportDocument: (saveAs: boolean) => void exportDocument(saveAs),
      project: (acao: 'salvar' | 'salvarComo' | 'abrir') => void project(acao),
      novoProjeto: () => void novoProjeto(),
      // o atalho lê a escala de agora por referência, e não da closure: dois
      // toques seguidos precisam somar dois degraus, não repetir o primeiro
      escala: (delta: 1 | -1 | 0) =>
        mudarEscala(delta === 0 ? 1 : clampUiScale(escalaAtual.current + delta * UI_SCALE_STEP))
    }),
    [toggleFocusMode, exportDocument, project, novoProjeto, mudarEscala]
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
  // corpo da fonte de EDITAR, não da SAÍDA (essa é aparência do roteiro, em
  // tab.appearance): conforto desta máquina, guardado com as outras
  const editorFontSize = state.maquina.editorFontSize
  const mudarFonteDoEditor = (editorFontSize: number): void =>
    dispatch({ type: 'maquina/patch', patch: { editorFontSize } })
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
      {/* volta tudo a texto simples: sem capítulo, sem direção. Apagado
          quando não há marcação nenhuma para tirar — assim o botão nunca é
          um clique que não faz nada. As palavras ficam; o Mod+Z devolve */}
      <EditorTool
        icon="clearFormat"
        label={t('editor.clearFormat')}
        disabled={!hasFormatting(tab.blocks)}
        onClick={() => run('edit.clearFormat')}
      />
      <span className="mx-0.5 h-3.5 w-px bg-[var(--color-line)]" />
      <EditorTool icon="undo" label={t('editor.undo')} disabled={!history.canUndo} onClick={() => run('edit.undo')} />
      <EditorTool icon="redo" label={t('editor.redo')} disabled={!history.canRedo} onClick={() => run('edit.redo')} />
    </>
  )

  const stage = (
    <PrompterStage
      cardVolume={state.maquina.cardVolume}
      blocks={tab.blocks}
      appearance={tab.appearance}
      transport={state.transport}
      viewport={viewport}
      rows={rows}
      marginGuides
      card={cartaoNoAr(state)}
      cardOverlay={state.cardOverlay}
      onMetrics={handleMetrics}
    />
  )

  const cardsDrawer = state.cardsVisible ? (
    <CardsDrawer
      cards={state.cards}
      noAr={state.transport.card}
      blackout={state.transport.blackout}
      clock={state.transport.video}
      volume={state.maquina.cardVolume}
      videoPerfil={state.webview.videoPerfil}
      cardOverlay={state.cardOverlay}
      altura={state.cardsHeight}
      dispatch={dispatch}
      onClose={() => dispatch({ type: 'layout/cards', visible: false })}
    />
  ) : null

  // A fileira embaixo da prévia: marcadores à esquerda, AR à direita.
  //
  // O AR morava lá em cima, na barra de arquivo — mas tela preta, congelar e
  // rede agem sobre o que está NA PRÉVIA, e ficam mais à mão colados nela do
  // que a três barras de distância. A fileira existe mesmo sem marcador
  // nenhum, porque o AR não depende deles.
  const markerStrip = (
    <div className="flex flex-none items-center gap-1.5 border-t border-[var(--color-line)] px-3 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
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
            <Icon name="marker" size={11} style={{ color: 'var(--color-live)' }} />
            {marker.label}
          </button>
        ))}
      </div>

      <PocoDoAr
        state={state}
        webviewLive={state.webview.enabled && webview.running && !webview.error}
        keymap={keymap}
        run={run}
        onOpenWebview={() => setWebviewOpen(true)}
      />
    </div>
  )

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
      const box = splitRef.current?.getBoundingClientRect()
      if (!box) return
      const ratio = Math.min(0.72, Math.max(0.2, (event.clientX - box.left) / box.width))
      dispatch({ type: 'layout/split', ratio })
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /** Duplo clique na divisória: devolve o meio exato, sem precisar arrastar de olho. */
  const resetSplit = (): void => dispatch({ type: 'layout/split', ratio: 0.5 })

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
        {/* a versão saiu do rodapé — este é o único lugar que ainda mostra
            build/versão, e também o gatilho dos créditos (era o rodapé antes) */}
        <button
          type="button"
          onClick={() => setCredits(true)}
          title={t('app.credits')}
          className="flex-none text-[12px] whitespace-nowrap text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
        >
          {versionLabel()}
        </button>

        {/* centralizado de verdade — `absolute`, e não flex/auto-margin, para
            não depender de quanto os grupos dos dois lados pesam (o mesmo
            truque do seletor de modo no rodapé). Só aparece com um .valendo
            de verdade por trás: nome de projeto que não existe ainda não
            é nome de nada. */}
        {nomeDoProjeto ? (
          <div
            data-project-name
            className="absolute left-1/2 -translate-x-1/2 truncate text-[19.5px] font-medium"
            style={{ color: '#62a8ff' }}
          >
            {nomeDoProjeto}
          </div>
        ) : null}

        {/* só o que é do app inteiro fica aqui: atalhos, busca e idioma. Os
            painéis e a posição do transporte desceram para a linha das abas —
            decidir o que aparece na tela é vizinho de decidir qual roteiro
            está na frente, não do nome do programa */}
        <div className="ml-auto flex flex-none items-center gap-2">
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
          <ScalePicker scale={uiScale} onChange={mudarEscala} />
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
        onNewProject={novoProjeto}
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
          onImport={importDocument}
          onNewProject={novoProjeto}
          position="topo"
        />
      ) : null}

      {state.layoutMode === 'deck' ? (
        /* a Mesa tem o rundown no lugar do editor, mas o AR vale para os três
           modos: sem esta fileira, tela preta e congelar sumiriam justo no
           modo em que o operador só acompanha o programa correr */
        <main className="flex min-h-0 flex-1 flex-col">
          <Deck
            tab={tab}
            transport={state.transport}
            rows={rows}
            viewport={viewport}
            card={cartaoNoAr(state)}
            cardOverlay={state.cardOverlay}
            cardVolume={state.maquina.cardVolume}
            dispatch={dispatch}
            onMetrics={handleMetrics}
          />
          {markerStrip}
        </main>
      ) : focusMode ? (
        /* a operação, sem o editor: escrever é trabalho do Split, e uma
           gaveta de edição aqui só tiraria altura da única coisa que este
           modo existe para mostrar — a tela do apresentador. Mas Assets é um
           PAINEL como os outros (Cards, Ajustes), não uma escrita — o
           operador pode querer o standby ou os capítulos à mão sem sair do
           Foco, então a coluna acende aqui do mesmo jeito que no Split */
        <main className="flex min-h-0 flex-1">
          {state.sidebarVisible ? (
            <Sidebar
              tab={tab}
              transport={state.transport}
              cards={state.cards}
              cardOverlay={state.cardOverlay}
              rows={rows}
              sidebarWidth={state.sidebarWidth}
              maquina={state.maquina}
              dispatch={dispatch}
            />
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1">
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
              cardOverlay={state.cardOverlay}
              rows={rows}
              sidebarWidth={state.sidebarWidth}
              maquina={state.maquina}
              dispatch={dispatch}
            />
          ) : null}

          {/* a coluna do meio: edição + transmissão numa fileira, a gaveta de
              cartões embaixo — com a MESMA largura das duas, nunca a da
              janela inteira. É o que deixa a coluna e o inspetor virem
              inteiros até o rodapé, como na maquete, em vez de os dois
              pararem onde a gaveta (antes irmã da `main`) começava. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* o ref do arrasto precisa ser DESTE container — o que envolve só
                as duas seções e a divisória —, nunca do `<main>` de fora, que
                também inclui a Sidebar e o Inspetor. Com o ref no `<main>`,
                `box.left` vinha deslocado pela largura da Sidebar (e
                `box.width` inchado pela do Inspetor também), e a conta
                `(clientX - box.left) / box.width` calculava a fração contra
                uma régua errada — a divisória pousava a alguma distância do
                cursor, não onde o clique foi, e o primeiro pulo lia como um
                piscar */}
            <div ref={splitRef} className="flex min-h-0 flex-1">
              <section className="flex min-w-0 flex-col" style={{ flex: `${state.editionSplit} 1 0` }}>
                <PanelHeader
                  label={t('panel.edit')}
                  cor="var(--color-warn)"
                  detail={<MetaDaEdicao tab={tab} rows={rows} ppm={state.transport.ppm} />}
                  action={editorTools}
                />
                <Editor
                  ref={editorRef}
                  tab={tab}
                  fontSize={editorFontSize}
                  dispatch={dispatch}
                  onCaretMove={onCaretMove}
                />

                {/* fonte de DIGITAR, não a da SAÍDA — essa mexe só no
                    textarea, para o operador que prefere letra maior (ou
                    menor) enquanto escreve. O texto continua quebrando pela
                    largura da caixa, igual a qualquer editor. */}
                <div className="flex flex-none items-center gap-2 border-t border-[var(--color-edge)] bg-[#17171a] px-3 py-1.5">
                  {/* CATCH: liga um Go To que nunca desliga sozinho — a
                      marca de leitura persegue o cursor do editor a cada
                      pausa na digitação. Antes do Go To, não depois: é o que
                      decide SE o salto acontece, o Go To é o salto único */}
                  <Tecla
                    title={t('toolbar.catchHint')}
                    aria-label={t('toolbar.catch')}
                    acesa={catchAtivo}
                    cor="var(--color-go)"
                    className="h-6 w-8 text-[9px] font-bold tracking-[0.04em]"
                    style={!catchAtivo ? { color: 'var(--color-go)' } : undefined}
                    onClick={() => setCatchAtivo((v) => !v)}
                  >
                    <Icon name="catch" size={13} />
                  </Tecla>
                  <Tecla
                    title="Go To"
                    aria-label="Go To"
                    cor="var(--color-go)"
                    className="h-6 w-7"
                    style={{ color: 'var(--color-go)' }}
                    onClick={goToCaret}
                  >
                    <Icon name="play" size={13} filled />
                  </Tecla>
                  <span className="mx-0.5 h-4 w-px flex-none bg-[var(--color-edge)]" />
                  {/* segunda porta para a mesma ação do Create Marker do
                      transporte — útil aqui, perto de onde o operador já
                      está olhando o roteiro, sem precisar alcançar o console */}
                  <Tecla
                    title={`${t('toolbar.marker')}${hint(keymap, 'marker.create')}`}
                    aria-label={t('toolbar.marker')}
                    cor="var(--color-live)"
                    className="h-6 w-7"
                    style={{ color: 'var(--color-live)' }}
                    onClick={() => run('marker.create')}
                  >
                    <Icon name="marker" size={13} />
                  </Tecla>
                  <span className="mx-0.5 h-4 w-px flex-none bg-[var(--color-edge)]" />
                  {/* loop: ao chegar no fim, volta ao início e continua
                      tocando — o Reiniciar do transporte acende junto,
                      mesmo aceso que este botão usa */}
                  <Tecla
                    title={t('toolbar.loop')}
                    aria-label={t('toolbar.loop')}
                    acesa={state.transport.loop}
                    cor="var(--color-go)"
                    className="h-6 w-7 text-[13px] leading-none"
                    style={!state.transport.loop ? { color: 'var(--color-go)' } : undefined}
                    onClick={() => dispatch({ type: 'transport/loop' })}
                  >
                    ∞
                  </Tecla>
                  {/* atraso do loop: quanto esperar parado no fim antes de
                      reiniciar — só importa com o loop ligado, mas fica
                      sempre visível para o operador pré-configurar */}
                  <label
                    title={t('toolbar.loopDelay')}
                    className="flex flex-none items-center gap-1 text-[10px] text-[var(--color-fog-3)]"
                  >
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={state.transport.loopDelaySeconds}
                      aria-label={t('toolbar.loopDelay')}
                      onChange={(event) =>
                        dispatch({ type: 'transport/loopDelay', seconds: Number(event.target.value) })
                      }
                      // as setas do spinner nativo não ajudam num campo de 0
                      // a 60 — só ocupam espaço que o campo não tem sobrando
                      className="w-9 rounded border border-[var(--color-edge)] bg-[var(--color-ink-2)] px-1 py-[1px] text-center font-mono text-[10px] text-[var(--color-fog-0)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    s
                  </label>
                  {/* empurra o tamanho da fonte para a ponta direita: à
                      esquerda ficam as ações sobre a LEITURA (para onde a
                      marca vai, se volta ao início), aqui só o conforto de
                      quem digita — e as duas famílias param de se confundir */}
                  <div className="min-w-0 flex-1" />
                  <span className="mx-0.5 h-4 w-px flex-none bg-[var(--color-edge)]" />
                  {/* os "aA" das pontas são botões: um clique anda um ponto.
                      O slider atravessa a faixa inteira num gesto, mas achar
                      exatamente 15px nele é sorte — os degraus resolvem isso */}
                  <FontStep
                    label={t('editor.fontSmaller')}
                    size={10}
                    disabled={editorFontSize <= EDITOR_FONT_MIN}
                    onClick={() => mudarFonteDoEditor(editorFontSize - 1)}
                  />
                  <SliderConsole
                    value={editorFontSize}
                    min={EDITOR_FONT_MIN}
                    max={EDITOR_FONT_MAX}
                    cor="var(--color-warn)"
                    aria-label={t('editor.fontSize')}
                    onValue={mudarFonteDoEditor}
                    className="w-24 flex-none"
                  />
                  <FontStep
                    label={t('editor.fontBigger')}
                    size={16}
                    disabled={editorFontSize >= EDITOR_FONT_MAX}
                    onClick={() => mudarFonteDoEditor(editorFontSize + 1)}
                  />
                  <span className="ml-1 w-8 flex-none text-right font-mono text-[10px] text-[var(--color-fog-2)] tabular-nums">
                    {editorFontSize}px
                  </span>
                </div>
              </section>

              <div
                onMouseDown={startDrag}
                onDoubleClick={resetSplit}
                title={t('app.splitReset')}
                className="w-1 flex-none cursor-col-resize bg-[var(--color-line)] hover:bg-[var(--color-fog-2)]"
              />

              <section className="flex min-w-0 flex-col" style={{ flex: `${1 - state.editionSplit} 1 0` }}>
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
                onImport={importDocument}
                onNewProject={novoProjeto}
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
              maquina={state.maquina}
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
          onImport={importDocument}
          onNewProject={novoProjeto}
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
      {unsavedConfirm ? (
        <UnsavedConfirm
          onCancel={() => setUnsavedConfirm(false)}
          onDiscard={() => {
            setUnsavedConfirm(false)
            dispatch({ type: 'project/new' })
          }}
          onSave={async () => {
            const ok = await project('salvar')
            setUnsavedConfirm(false)
            if (ok) dispatch({ type: 'project/new' })
          }}
        />
      ) : null}
    </div>
  )
}
