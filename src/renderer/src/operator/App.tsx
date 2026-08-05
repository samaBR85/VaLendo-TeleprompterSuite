import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AjudaId } from '@shared/ajuda'
import type { MotivosDeFechar } from '@shared/api'
import type { InsertKind } from '@shared/insertBlock'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { PrompterStage } from '../prompter/PrompterStage'
import { ancoraEmPalavrasReais, anchorFromWordIndex, composeLines, totalWords } from '@shared/anchor'
import { cartaoNoAr } from '@shared/cards'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import { anchorFromCaret, hasFormatting, totalWordCount } from '@shared/text'
import type { Tab } from '@shared/types'
import { LANGS, type Lang } from '@shared/i18n'
import { ProvedorDeIdioma, useT } from '../i18n'
import { activeTabOf, useAppState } from '../state/useAppState'
import { Icon, type IconName } from '../ui/Icon'
import { ajuda, useEscutarAjuda } from '../ui/ajuda'
import { CabecalhoDePainel, SliderConsole, Tecla } from '../ui/console'
import { Wordmark, versionLabel } from '../ui/Wordmark'
import { UI_SCALE_MAX, UI_SCALE_MIN, UI_SCALE_STEP, applyUiScale, clampUiScale, loadUiScale } from '../ui/uiScale'
import { CloseConfirm } from './CloseConfirm'
import { UnsavedConfirm } from './UnsavedConfirm'
import { Welcome } from './Welcome'
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
import { BarraDeArquivo, BarraDeTransporte, PocoDoAr } from './Toolbar'
import { hint } from '../ui/atalho'
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
  /* o nome de quem fala não é falado: fora da contagem, esteja ele escondido
     na saída ou não — a duração tem de bater com o que sai pela boca */
  const spoken = useMemo(
    () => totalWordCount(tab.blocks, tab.apresentadores.map((a) => a.nome)),
    [tab.blocks, tab.apresentadores]
  )
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
  texto,
  label,
  atalho,
  disabled,
  acesa,
  ajudaId,
  onClick
}: {
  icon?: IconName
  /** rótulo curto no lugar do ícone — para "AA", que nenhum glifo diz melhor */
  texto?: string
  label: string
  /**
   * O atalho já formatado, como `hint()` devolve — vai só no `title`.
   *
   * Fora do `aria-label` de propósito: o leitor de tela anuncia o nome do
   * botão, e a tecla no meio dele viraria ruído lido em voz alta a cada
   * passagem. Quem usa teclado tem a lista inteira no Ctrl+, e na paleta.
   */
  atalho?: string
  disabled?: boolean
  /** ligado: fica âmbar, a cor da Edição, para se ler como estado e não como botão */
  acesa?: boolean
  ajudaId: AjudaId
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      {...ajuda(ajudaId)}
      title={`${label}${atalho ?? ''}`}
      aria-label={label}
      aria-pressed={acesa === undefined ? undefined : acesa}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-1 transition-colors hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] disabled:opacity-30 ${
        acesa ? 'bg-[var(--color-warn)]/18 text-[var(--color-warn)]' : 'text-[var(--color-fog-2)]'
      }`}
    >
      {icon ? (
        <Icon name={icon} size={14} />
      ) : (
        <span className="block px-0.5 text-[11px] leading-[14px] font-bold tracking-[0.06em]">{texto}</span>
      )}
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
  ajudaId,
  onClick
}: {
  label: string
  size: number
  disabled?: boolean
  ajudaId: AjudaId
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      {...ajuda(ajudaId)}
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
        {...ajuda('header.language')}
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
              {...ajuda('header.languageOption')}
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
        {...ajuda('header.uiScale')}
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
            {...ajuda('header.uiScaleSlider')}
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
              {...ajuda('header.uiScaleReset')}
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
          {...ajuda('header.dismissNotice')}
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
  estreia,
  atualizacao,
  dispatch
}: ReturnType<typeof useAppState>): React.JSX.Element {
  const { t } = useT()
  /* o ouvinte único que alimenta a Ajuda rápida — um `mouseover` no documento
     enxerga todo controle marcado com `data-ajuda`, sem que nenhum deles
     precise avisar ninguém. Ver `ui/ajuda.ts` */
  useEscutarAjuda()
  /*
   * As boas-vindas só na primeira abertura, e só até a pessoa decidir.
   *
   * O `estreia` do main continua verdadeiro a sessão inteira — ele conta sobre
   * a instalação, não sobre este modal. Quem fecha o guarda é este estado
   * local, senão escolher um idioma (que mexe no estado) traria a tela de volta
   * na cara de quem acabou de sair dela.
   */
  const [boasVindasFeitas, setBoasVindasFeitas] = useState(false)
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
  // null = ninguém pediu para fechar. Preenchido, carrega POR QUE fechar
  // precisa de confirmação, o que decide qual modal aparece
  const [closeConfirm, setCloseConfirm] = useState<MotivosDeFechar | null>(null)
  const [unsavedConfirm, setUnsavedConfirm] = useState(false)
  /**
   * CATCH: com ele ligado, a marca de leitura persegue o cursor do editor
   * sozinha — um "Go To" que nunca desliga. Preferência de sessão, como a
   * aba ativa do editor de nome: não sobrevive a fechar o app, e não é do
   * projeto — é só um jeito de operar que o operador liga quando quer.
   */
  const [catchAtivo, setCatchAtivo] = useState(false)
  /**
   * O editor acompanhando a leitura — o sentido inverso do CATCH.
   *
   * Os dois nunca ficam ligados juntos, e não é preferência: o CATCH move a
   * leitura para onde o cursor está, este move a tela do editor para onde a
   * leitura está. Ligados ao mesmo tempo, um alimentaria o outro e os dois
   * ficariam se perseguindo. Ligar um desliga o outro, na função abaixo.
   */
  const [seguirLeitura, setSeguirLeitura] = useState(false)
  /* há nome selecionado no editor? é só o que decide se o botão de
     apresentador está clicável — um botão que não pode fazer nada é pior que
     um apagado, porque ensina que o recurso não funciona */
  const [textoSelecionado, setTextoSelecionado] = useState(false)
  /**
   * Há digitação ainda dentro do respiro de 140ms do editor.
   *
   * Serve só para o botão DESFAZER acender nesse intervalo — o `canUndo` vem
   * do main, que ainda não recebeu o texto. Muda no máximo duas vezes por
   * rajada de digitação (entra e sai), então não custa renderização por tecla.
   */
  const [textoPendente, setTextoPendente] = useState(false)
  const catchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** a divisória Edição×Transmissão mede a fração contra ESTE container — só as duas seções, nunca a Sidebar nem o Inspetor */
  const splitRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorHandle>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 9_000)
    return () => clearTimeout(timer)
  }, [notice])

  // o main pede confirmação ao fechar, e diz por quê (transmissão no ar,
  // mudança não salva, ou os dois); a resposta sempre volta por IPC, mesmo
  // quando o operador cancela — sem isso o main fica esperando para sempre e a
  // janela nunca mais fecha
  useEffect(() => window.valendo.onConfirmClose((motivos) => setCloseConfirm(motivos)), [])

  const respondToClose = useCallback((confirmed: boolean) => {
    if (confirmed) editorRef.current?.flush()
    setCloseConfirm(null)
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

  /**
   * Grava ou abre o programa inteiro num .valendo. Devolve se deu certo.
   *
   * Com `caminho`, abre aquele arquivo direto — é por aqui que entram os
   * projetos recentes. Sem ele, pergunta no seletor, como sempre. Os recentes
   * não ganharam função própria justamente por isto: quem abre pela lista
   * merece o mesmo recado de sucesso ou de falha que quem abre pela pasta.
   */
  const project = useCallback(async (acao: 'salvar' | 'salvarComo' | 'abrir', caminho?: string): Promise<boolean> => {
    const salvando = acao === 'salvar' || acao === 'salvarComo'
    if (salvando) editorRef.current?.flush()
    await window.valendo.getState()

    const result = salvando
      ? await window.valendo.saveProject(acao === 'salvarComo')
      : caminho
        ? await window.valendo.openProjectPath(caminho)
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
   * "Salvar e fechar": só deixa a janela ir embora se a gravação der certo.
   *
   * Se o salvar falhar (disco cheio, arquivo em uso, ou o diálogo do "Salvar
   * como" cancelado), fechar assim mesmo perderia exatamente o trabalho que o
   * operador acabou de pedir para guardar — então o modal fica aberto, com o
   * aviso do erro na tela, e ele decide de novo.
   */
  const salvarEFechar = useCallback(async (): Promise<void> => {
    const ok = await project('salvar')
    if (ok) respondToClose(true)
  }, [project, respondToClose])

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
    setTextoSelecionado((editorRef.current?.selecao() ?? '') !== '')
    if (!catchAtivo) return
    if (catchTimer.current) clearTimeout(catchTimer.current)
    catchTimer.current = setTimeout(goToCaret, 220)
  }, [catchAtivo, goToCaret])

  useEffect(() => {
    return () => {
      if (catchTimer.current) clearTimeout(catchTimer.current)
    }
  }, [])

  /*
   * Os dois interruptores num lugar só: ligar um sempre desliga o outro.
   *
   * Escrito como par, e não como dois `setState` espalhados pelos botões, para
   * que a regra fique impossível de esquecer no dia em que aparecer um terceiro
   * caminho para ligá-los (a paleta de comandos, um atalho de teclado).
   */
  const alternarCatch = useCallback(() => {
    setCatchAtivo((ligado) => {
      if (!ligado) setSeguirLeitura(false)
      return !ligado
    })
  }, [])
  const alternarSeguir = useCallback(() => {
    setSeguirLeitura((ligado) => {
      if (!ligado) setCatchAtivo(false)
      return !ligado
    })
  }, [])

  /**
   * Registra como apresentador o nome que está selecionado no editor.
   *
   * Não escreve nada no roteiro: o nome já está lá, digitado por quem escreveu
   * o texto. O que nasce aqui é só o casamento entre aquele texto e uma cor —
   * por isso um `.txt` da redação vira roteiro de dois apresentadores sem uma
   * edição sequer.
   */
  /**
   * RELINK: reaponta um apresentador para o nome agora selecionado no editor.
   *
   * Mesmo id, mesma cor — só o nome muda. Corrigir "HARI" para "HARI OLIVEIRA"
   * no roteiro deixa de custar remover o chip e criar outro, o que perderia a
   * cor que já estava escolhida.
   */
  const reapontarApresentador = useCallback(
    (presenterId: string) => {
      const nome = editorRef.current?.selecao() ?? ''
      if (!nome || !state) return
      dispatch({ type: 'presenter/rename', tabId: activeTabOf(state).id, presenterId, nome })
    },
    [state, dispatch]
  )

  const criarApresentador = useCallback(() => {
    const nome = editorRef.current?.selecao() ?? ''
    if (!nome || !state) return
    dispatch({ type: 'presenter/add', tabId: activeTabOf(state).id, nome })
  }, [state, dispatch])

  /**
   * O "Go To" da Transmissão: traz o editor até onde a leitura está, uma vez.
   *
   * Aqui o cursor VAI junto, ao contrário do SEGUIR — foi um clique explícito
   * pedindo para ir até lá, então pousar o cursor é o que se espera, e não um
   * roubo no meio da digitação. Serve também de "voltar para a leitura" quando
   * o SEGUIR está ligado e você se afastou para consultar outro trecho.
   */
  const irParaLeitura = useCallback(() => {
    if (!state) return
    const aba = activeTabOf(state)
    const linhas = composeLines(aba.blocks, aba.appearance, rows)
    const anchor = anchorFromWordIndex(linhas, wordIndexAt(state.transport, Date.now()))
    if (!anchor) return
    editorRef.current?.mostrarAncora(ancoraEmPalavrasReais(linhas, anchor), { comCursor: true })
  }, [state, rows])

  /**
   * SEGUIR: o caminho de volta do Go To — o editor acompanha a leitura.
   *
   * Roda por relógio próprio, e não por `useNow()` no corpo do App: a leitura
   * anda o tempo todo, e re-renderizar a mesa inteira quatro vezes por segundo
   * para mexer numa faixa dentro do editor sairia caro justamente com o
   * programa no ar. Aqui o efeito chama o editor pela referência, e só o
   * editor redesenha.
   *
   * Quatro vezes por segundo dá conta: a 200 ppm a leitura anda três palavras
   * nesse intervalo, e a faixa marca a LINHA, não a palavra.
   */
  useEffect(() => {
    if (!seguirLeitura || !state) return
    // sem editor na tela não há o que acompanhar — no Foco e na Mesa ele não existe
    if (state.layoutMode !== 'split') return

    let ultima = ''
    const acompanhar = (): void => {
      const aba = activeTabOf(state)
      const linhas = composeLines(aba.blocks, aba.appearance, rows)
      const anchor = anchorFromWordIndex(linhas, wordIndexAt(state.transport, Date.now()))
      if (!anchor) return
      /* traduz da régua para palavras de verdade ANTES de entregar ao editor.
         Sem isto a marca caía sempre na última linha do parágrafo: com
         velocidade constante o `wordOffset` conta linhas de peso igual, não
         palavras, e o editor estourava o parágrafo procurando a enésima */
      const real = ancoraEmPalavrasReais(linhas, anchor)
      // só incomoda o editor quando a palavra muda de verdade
      const chave = `${real.blockId}:${real.wordOffset}`
      if (chave === ultima) return
      ultima = chave
      editorRef.current?.mostrarAncora(real)
    }

    acompanhar()
    const relogio = setInterval(acompanhar, 250)
    return () => clearInterval(relogio)
  }, [seguirLeitura, state, rows])

  /* ao desligar (ou ao sair do Split), a faixa some junto: marca parada num
     lugar qualquer viraria uma informação velha se passando por atual */
  useEffect(() => {
    if (!seguirLeitura || state?.layoutMode !== 'split') editorRef.current?.limparMarca()
  }, [seguirLeitura, state?.layoutMode])

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

  /** o filete que separa as famílias de ferramenta do cabeçalho da Edição */
  const divisorDeFerramentas = <span className="mx-0.5 h-3.5 w-px bg-[var(--color-line)]" />

  /*
   * Quatro famílias, separadas por filete, e a ordem é a do trabalho:
   *
   *   marcar o texto | quem fala | como o texto se vê | voltar atrás
   *
   * Sem os filetes as sete teclas liam como uma fila só, e o olho tinha de
   * descobrir sozinho que "AA" não tem parentesco com "remover formatação".
   */
  const editorTools = (
    <>
      <EditorTool
        ajudaId="editor.chapter"
        icon="chapter"
        label={t('editor.chapter')}
        atalho={hint(keymap, 'insert.chapter')}
        onClick={() => run('insert.chapter')}
      />
      <EditorTool
        ajudaId="editor.direction"
        icon="direction"
        label={t('editor.direction')}
        atalho={hint(keymap, 'insert.direction')}
        onClick={() => run('insert.direction')}
      />
      {/* volta tudo a texto simples: sem capítulo, sem direção. Apagado
          quando não há marcação nenhuma para tirar — assim o botão nunca é
          um clique que não faz nada. As palavras ficam; o Mod+Z devolve */}
      <EditorTool
        ajudaId="editor.clearFormat"
        icon="clearFormat"
        label={t('editor.clearFormat')}
        atalho={hint(keymap, 'edit.clearFormat')}
        disabled={!hasFormatting(tab.blocks)}
        onClick={() => run('edit.clearFormat')}
      />

      {divisorDeFerramentas}
      {/* Quem fala: transforma o nome SELECIONADO no roteiro em apresentador.
          Sozinho entre filetes — é a única ferramenta aqui que não age sobre
          o texto nem sobre a vista dele, mas sobre QUEM diz cada trecho. */}
      <EditorTool
        ajudaId="editor.presenter"
        icon="presenter"
        label={t('editor.presenter')}
        disabled={!textoSelecionado}
        onClick={criarApresentador}
      />

      {divisorDeFerramentas}
      {/* CAIXA ALTA do EDITOR. Tem um irmão nos Ajustes › Texto que faz o
          mesmo na SAÍDA, e os dois são independentes de propósito: quem
          digita e quem lê no vidro não precisam da mesma caixa. Ligá-los ao
          mesmo booleano seria um interruptor com duas alavancas.
          Pintura nos dois casos — o texto guardado não muda uma letra */}
      <EditorTool
        ajudaId="editor.allCaps"
        texto="AA"
        label={t('editor.allCaps')}
        acesa={state.maquina.editorAllCaps}
        onClick={() =>
          dispatch({ type: 'maquina/patch', patch: { editorAllCaps: !state.maquina.editorAllCaps } })
        }
      />

      {divisorDeFerramentas}
      {/* aceso também com digitação ainda no respiro de 140ms: nesse instante
          o main ainda não sabe do que foi escrito (`canUndo` falso), mas há
          sim o que desfazer — o comando descarrega o pendente antes de
          desfazer. Sem isto o botão ficava apagado justamente depois de
          digitar, o clique não fazia nada, e parecia precisar de dois */}
      <EditorTool
        ajudaId="editor.undo"
        icon="undo"
        label={t('editor.undo')}
        atalho={hint(keymap, 'edit.undo')}
        disabled={!history.canUndo && !textoPendente}
        onClick={() => run('edit.undo')}
      />
      <EditorTool
        ajudaId="editor.redo"
        icon="redo"
        label={t('editor.redo')}
        atalho={hint(keymap, 'edit.redo')}
        disabled={!history.canRedo}
        onClick={() => run('edit.redo')}
      />
    </>
  )

  const stage = (
    <PrompterStage
      cardVolume={state.maquina.cardVolume}
      blocks={tab.blocks}
      apresentadores={tab.apresentadores}
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
      keymap={keymap}
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
            {...ajuda('markers.chip')}
            /* o atalho vem do keymap, e não escrito à mão: só os nove
               primeiros marcadores têm tecla, e `hint` devolve vazio para o
               décimo em diante sem precisar contar aqui */
            title={`${t('cmd.marker.goto', { n: index + 1 })}${hint(keymap, `marker.goto.${index + 1}`)}`}
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
        dispatch={dispatch}
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
            build/versão, e também o gatilho dos créditos (era o rodapé antes)

            Com versão nova lá fora, ele fica VERDE e ganha um ponto. Ambiente,
            e não aviso: não rouba foco, não pede para ser dispensado e não
            volta a aparecer. Um balão no meio de uma gravação seria pior que
            ficar desatualizado. Quem quiser saber mais clica e cai no About,
            onde a linha diz qual é a versão e leva à página. */}
        <button
          type="button"
          data-atualizacao={atualizacao ?? undefined}
          {...ajuda('header.version')}
          onClick={() => setCredits(true)}
          title={atualizacao ? t('app.updateAvailable', { versao: atualizacao }) : t('app.credits')}
          className={`flex flex-none items-center gap-1.5 text-[12px] whitespace-nowrap ${
            atualizacao
              ? 'text-[var(--color-go)]'
              : 'text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]'
          }`}
        >
          {atualizacao ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-go)]" /> : null}
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
            {...ajuda('header.shortcuts')}
            onClick={() => setKeymapOpen(true)}
            title={`${t('app.shortcuts')}${hint(keymap, 'keymap.open')}`}
            aria-label={t('app.shortcuts')}
            className="flex h-8 w-9 items-center justify-center rounded-md text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="keyboard" size={20} />
          </button>
          <button
            type="button"
            {...ajuda('header.palette')}
            onClick={() => setPalette(true)}
            title={`${t('app.palette')}${hint(keymap, 'palette.open')}`}
            aria-label={t('app.palette')}
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
        onOpenRecent={(caminho) => void project('abrir', caminho)}
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
          onOpenRecent={(caminho) => void project('abrir', caminho)}
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
              keymap={keymap}
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
                    {...ajuda('panel.focusToggle')}
                    onClick={toggleFocusMode}
                    title={`${t('panel.collapse')}${hint(keymap, 'view.focusMode')}`}
                    aria-label={t('panel.collapse')}
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

          {/* mesmo painel do Split, com as mesmas props — Ajustes é um
              PAINEL como Assets e Cards, não uma tela de escrita, então o
              Foco não tem por que escondê-lo */}
          {state.inspectorVisible ? (
            <Inspector
              tab={tab}
              presets={state.presets}
              metrics={metrics}
              customDefaults={state.customDefaults}
              maquina={state.maquina}
              onRelink={reapontarApresentador}
              dispatch={dispatch}
            />
          ) : null}
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
              keymap={keymap}
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
                  apresentadores={tab.apresentadores}
                  fontSize={editorFontSize}
                  allCaps={state.maquina.editorAllCaps}
                  dispatch={dispatch}
                  onCaretMove={onCaretMove}
                  onPendenteChange={setTextoPendente}
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
                    {...ajuda('editor.catch')}
                    /* só o nome: a frase que explicava o CATCH mora agora na
                       Ajuda rápida, onde ela cabe inteira e não faz o operador
                       esperar um segundo parado em cima do botão */
                    title={t('toolbar.catch')}
                    aria-label={t('toolbar.catch')}
                    aria-pressed={catchAtivo}
                    acesa={catchAtivo}
                    cor="var(--color-live)"
                    className={`h-6 w-8 text-[9px] font-bold tracking-[0.04em] ${catchAtivo ? 'k-tecla-solida' : ''}`}
                    style={!catchAtivo ? { color: 'var(--color-go)' } : undefined}
                    onClick={alternarCatch}
                  >
                    <Icon name="catch" size={13} />
                  </Tecla>
                  <Tecla
                    {...ajuda('editor.goTo')}
                    title="Go To"
                    aria-label="Go To"
                    cor="var(--color-go)"
                    className="h-6 w-7"
                    style={{ color: 'var(--color-go)' }}
                    onClick={goToCaret}
                  >
                    <Icon name="goTo" size={13} filled />
                  </Tecla>
                  <span className="mx-0.5 h-4 w-px flex-none bg-[var(--color-edge)]" />
                  {/* segunda porta para a mesma ação do Create Marker do
                      transporte — útil aqui, perto de onde o operador já
                      está olhando o roteiro, sem precisar alcançar o console */}
                  <Tecla
                    {...ajuda('editor.marker')}
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
                      mesmo aceso que este botão usa.

                      Âmbar, e cheio quando ligado: o loop MUDA o que vai
                      acontecer no fim do roteiro, e não é uma escolha de
                      interface como as teclas verdes ao lado. É a mesma
                      família de tela preta e congelar — muda o que está
                      acontecendo, então acende inteiro com o ícone branco. */}
                  <Tecla
                    {...ajuda('editor.loop')}
                    title={t('toolbar.loop')}
                    aria-label={t('toolbar.loop')}
                    acesa={state.transport.loop}
                    cor="var(--color-warn)"
                    className={`h-6 w-7 ${state.transport.loop ? 'k-tecla-solida' : ''}`}
                    style={!state.transport.loop ? { color: 'var(--color-warn)' } : undefined}
                    onClick={() => dispatch({ type: 'transport/loop' })}
                  >
                    <Icon name="loop" size={15} />
                  </Tecla>
                  {/* atraso do loop: quanto esperar parado no fim antes de
                      reiniciar — só importa com o loop ligado, mas fica
                      sempre visível para o operador pré-configurar */}
                  <label
                    {...ajuda('editor.loopDelay')}
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
                    ajudaId="editor.fontSmaller"
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
                    {...ajuda('editor.fontSize')}
                    aria-label={t('editor.fontSize')}
                    onValue={mudarFonteDoEditor}
                    className="w-24 flex-none"
                  />
                  <FontStep
                    ajudaId="editor.fontBigger"
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
                {...ajuda('editor.split')}
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
                      {/* SEGUIR mora aqui, no cabeçalho de quem produz a
                          informação: é a leitura desta tela que o editor vai
                          acompanhar. Do outro lado, no rodapé da Edição, está
                          o par inverso (CATCH e Go To) — cada sentido no
                          painel de onde ele parte. */}
                      <Tecla
                        {...ajuda('panel.goToReading')}
                        title={t('panel.goToReading')}
                        aria-label={t('panel.goToReading')}
                        cor="var(--color-go)"
                        className="h-[18px] w-[22px]"
                        style={{ color: 'var(--color-go)' }}
                        onClick={irParaLeitura}
                      >
                        <Icon name="goTo" size={11} filled />
                      </Tecla>
                      <Tecla
                        {...ajuda('panel.follow')}
                        title={t('panel.follow')}
                        aria-label={t('panel.follow')}
                        aria-pressed={seguirLeitura}
                        acesa={seguirLeitura}
                        cor="var(--color-go)"
                        className={`h-[18px] px-1.5 text-[9px] font-bold tracking-[0.04em] ${
                          seguirLeitura ? 'k-tecla-solida' : ''
                        }`}
                        style={!seguirLeitura ? { color: 'var(--color-go)' } : undefined}
                        onClick={alternarSeguir}
                      >
                        {t('panel.follow.key')}
                      </Tecla>
                      <span className="font-mono text-[10px] text-[var(--color-fog-3)]">{`${viewport.width} × ${viewport.height}`}</span>
                      <button
                        type="button"
                        {...ajuda('panel.focusToggle')}
                        onClick={toggleFocusMode}
                        title={`${t('panel.expand')}${hint(keymap, 'view.focusMode')}`}
                        aria-label={t('panel.expand')}
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
                onOpenRecent={(caminho) => void project('abrir', caminho)}
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
              onRelink={reapontarApresentador}
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
          onOpenRecent={(caminho) => void project('abrir', caminho)}
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
        storage={storage}
        onModeChange={(mode) => dispatch({ type: 'layout/mode', mode })}
        onOpenPalette={() => setPalette(true)}
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
          som={state.webview.som}
          dispatch={dispatch}
          onClose={() => setWebviewOpen(false)}
        />
      ) : null}
      {credits ? <Credits atualizacao={atualizacao} onClose={() => setCredits(false)} /> : null}
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
      {/* Fechar com trabalho não salvo é o caso mais grave dos dois, e ganha o
          modal de três saídas — dá para salvar antes de ir embora. Se a
          transmissão também estiver no ar, o texto avisa disso na mesma tela,
          em vez de empilhar duas perguntas seguidas. Só transmissão no ar,
          sem nada pendente, continua com o modal de sempre. */}
      {closeConfirm?.naoSalvo ? (
        <UnsavedConfirm
          detalhe={closeConfirm.noAr ? t('close.unsavedAndOnAir') : t('close.unsavedDetail')}
          rotuloDescartar={t('close.unsavedDiscard')}
          rotuloSalvar={t('close.unsavedSave')}
          onCancel={() => respondToClose(false)}
          onDiscard={() => respondToClose(true)}
          onSave={salvarEFechar}
        />
      ) : closeConfirm ? (
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
      {/* por último no DOM, e sem concorrente: na abertura não existe nada
          salvo para confirmar nem transmissão para fechar */}
      {!boasVindasFeitas ? (
        <Welcome
          lang={state.language}
          onLang={(language) => dispatch({ type: 'estreia/language', language })}
          // `estreia` é o app abrindo pela primeira vez nesta máquina: não há
          // workspace nenhum, e portanto nada a continuar
          temSalvo={!estreia}
          onContinuar={() => {
            setBoasVindasFeitas(true)
            dispatch({ type: 'estreia/continuar' })
          }}
          onDemo={() => {
            setBoasVindasFeitas(true)
            dispatch({ type: 'estreia/demo' })
          }}
          onNovo={() => {
            setBoasVindasFeitas(true)
            dispatch({ type: 'project/new' })
          }}
          onAbrir={async () => {
            // o modal sai só se a pessoa realmente escolheu um arquivo:
            // cancelar o seletor tem que devolver a escolha, não a tela vazia
            if (await project('abrir')) setBoasVindasFeitas(true)
          }}
          onAbrirRecente={async (caminho) => {
            if (await project('abrir', caminho)) setBoasVindasFeitas(true)
          }}
        />
      ) : null}
    </div>
  )
}
