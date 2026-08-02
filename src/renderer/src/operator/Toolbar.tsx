import { useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { formatBinding, parseBinding } from '@shared/commands'
import { formatClock, ppmForTarget, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import { PPM_MAX, PPM_MIN } from '@shared/ruler'
import type { AppState, DisplayInfo, Tab, TransportPosition } from '@shared/types'
import { Icon, type IconName } from '../ui/Icon'
import { Digito, Lcd, Poco, Tecla } from '../ui/console'
import { useT } from '../i18n'
import { useNow } from '../ui/useNow'
import { SpeedRuler } from './SpeedRuler'

interface Props {
  state: AppState
  tab: Tab
  displays: DisplayInfo[]
  keymap: Map<string, string>
  /** régua de rolagem medida, para os tempos baterem com o que rola na tela */
  rows: number[]
  dispatch: (action: Action) => void
  run: (commandId: string) => void
  onImport: () => void
  /** a página da rede está mesmo no ar, e não só pedida */
  webviewLive: boolean
  onOpenWebview: () => void
  onOpenCards: () => void
}

/** " · Ctrl+K" para colar no fim de um rótulo, ou nada se o comando não tem tecla. */
export function hint(keymap: Map<string, string>, commandId: string): string {
  const binding = parseBinding(keymap.get(commandId) ?? '')
  if (!binding) return ''
  return ` · ${formatBinding(binding, window.valendo.platform === 'darwin')}`
}

/** Nome do arquivo, sem o caminho todo, para caber no rótulo do botão. */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/** "M:SS" digitado ou segundos crus — o mesmo aceite do campo antigo do rodapé. */
function parseDuration(text: string): number | null {
  const match = /^(\d+):([0-5]?\d)$/.exec(text.trim())
  if (match) return Number(match[1]) * 60 + Number(match[2])
  const seconds = Number(text.trim())
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

type Tamanho = 'normal' | 'grande' | 'principal'

const MEDIDA: Record<Tamanho, string> = {
  normal: 'h-[30px] w-[30px]',
  grande: 'h-10 w-10',
  principal: 'h-[52px] w-[52px]'
}

const ICONE: Record<Tamanho, number> = { normal: 17, grande: 21, principal: 26 }

function Tool({
  icon,
  label,
  size = 'normal',
  active,
  danger,
  go,
  tint,
  disabled,
  onClick
}: {
  icon: IconName
  label: string
  size?: Tamanho
  active?: boolean
  danger?: boolean
  go?: boolean
  /** cor própria em repouso, para o ícone não ficar plano — "tela preta" já tinha a dela */
  tint?: string
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  const tom = go
    ? 'bg-[var(--color-go)]/16 text-[var(--color-go)] hover:bg-[var(--color-go)]/24'
    : active
      ? danger
        ? 'bg-[var(--color-live)]/18 text-[var(--color-live)]'
        : 'bg-[var(--color-go)]/16 text-[var(--color-go)]'
      : danger
        ? 'text-[var(--color-live)] hover:bg-[var(--color-ink-3)]'
        : !tint
          ? 'text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]'
          : 'hover:bg-[var(--color-ink-3)]'

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={tint && !active && !danger ? { color: tint } : undefined}
      className={`flex flex-none items-center justify-center rounded-md transition-colors disabled:opacity-30 ${MEDIDA[size]} ${tom}`}
    >
      <Icon name={icon} size={ICONE[size]} />
    </button>
  )
}

/** A caixa de uma seção da mesa. Pode guardar mais de um grupo, separados por um traço. */
function Pill({
  name,
  className,
  children
}: {
  name: string
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      data-pill={name}
      className={`flex flex-none items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] p-1 pl-1.5 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}

function Grupo({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div data-grupo={label.toLowerCase()} className="flex flex-none items-center gap-1">
      <span className="px-1.5 pr-2.5 text-[9px] tracking-[0.14em] text-[var(--color-fog-2)] uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

function Divisoria(): React.JSX.Element {
  return <span className="mx-1 h-5 w-px flex-none bg-[var(--color-line)]" />
}

/**
 * O poço SAÍDA: monitor + Transmitir, no material do console.
 *
 * Mora num componente porque muda de casa com o layout: com o transporte no
 * topo (8a) ele fecha a barra do console; com o transporte na régua (8b) ele
 * sobe para a barra de arquivo — a maquete desenha assim nos dois casos, e o
 * botão precisa existir UMA vez em cada arrumação, nunca duas.
 *
 * O Transmitir é o próprio indicador de estado: apagado é um relevo vinho com
 * o ponto fundido; no ar, acende de vermelho com brilho vazando. O "No ar"
 * gigante do cabeçalho saiu — dois avisos do mesmo fato ensinavam o olho a
 * ignorar um deles.
 */
function PocoDeSaida({
  displays,
  output,
  dispatch,
  run
}: {
  displays: DisplayInfo[]
  output: AppState['output']
  dispatch: (action: Action) => void
  run: (commandId: string) => void
}): React.JSX.Element {
  const { t } = useT()

  return (
    <Poco rotulo={t('insp.tab.output')} cor="var(--color-live)" className="gap-[7px]" data-pill="saida">
      <select
        value={output.displayId ?? ''}
        onChange={(event) => {
          const value = event.target.value
          dispatch({
            type: 'output/set',
            displayId: value === '' ? null : Number(value),
            enabled: value !== '' && output.enabled
          })
        }}
        className="h-6 max-w-[190px] flex-none rounded-[5px] border border-[var(--color-edge)] bg-[#1e1e21] px-2 text-[10px] text-[var(--color-fog-2)]"
      >
        <option value="">{t('toolbar.pickMonitor')}</option>
        {displays.map((display) => (
          <option key={display.id} value={display.id}>
            {display.label}
            {display.primary ? ` · ${t('toolbar.primary')}` : ''}
          </option>
        ))}
      </select>

      <button
        type="button"
        data-broadcast-toggle
        disabled={output.displayId === null}
        onClick={() => run('output.toggle')}
        className="flex h-6 flex-none items-center gap-1.5 rounded-[5px] border border-[var(--color-edge)] px-3 text-[11px] font-semibold whitespace-nowrap transition-[filter] hover:brightness-115 disabled:opacity-30"
        style={
          output.enabled
            ? {
                background: 'linear-gradient(#5a2523, #3d1a19)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 0 14px rgba(255,77,77,.35)',
                color: '#ffb3ab'
              }
            : {
                background: 'linear-gradient(#2a2124, #201a1c)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
                color: '#d6a3a3'
              }
        }
      >
        <span
          className="h-[7px] w-[7px] flex-none rounded-full"
          style={
            output.enabled
              ? { background: 'var(--color-live)', boxShadow: '0 0 6px var(--color-live)' }
              : { background: '#4a2b2b', boxShadow: 'inset 0 0 3px #000' }
          }
        />
        {output.enabled ? t('toolbar.broadcasting') : t('toolbar.broadcast')}
      </button>
    </Poco>
  )
}

/**
 * A barra de preparação: arquivo à esquerda, o ar à direita.
 *
 * É o que se mexe ANTES e DEPOIS do programa — abrir, salvar, escolher o
 * monitor, subir a transmissão. Fica separada do transporte de propósito:
 * nas duas arrumações que o app oferece, esta continua sempre no topo,
 * enquanto o transporte é o que muda de lugar. O poço SAÍDA acompanha o
 * espaço livre: com o transporte na régua, é aqui que ele mora.
 */
export function BarraDeArquivo({
  state,
  tab,
  displays,
  keymap,
  dispatch,
  run,
  onImport,
  webviewLive,
  onOpenWebview,
  onOpenCards
}: Omit<Props, 'rows'>): React.JSX.Element {
  const { t } = useT()
  const { transport } = state

  return (
    <div className="toolbar-mesa border-b border-[var(--color-line)]">
      <div className="toolbar-linhas">
        {/* fila de preparação: documento à esquerda, ar à direita, quando a
            barra cabe numa linha só — nas outras larguras, esta é a linha de
            cima */}
        <div className="toolbar-fila">
          {/* uma caixa só, com um traço no meio: projeto e roteiro são coisas
              diferentes — um leva o programa inteiro, o outro só o texto —,
              mas os dois são arquivo, e uma caixa por grupo picotava a barra.
              O projeto vem primeiro porque é o que contém o outro */}
          <Pill name="documento" className="toolbar-grp-doc">
            <Grupo label={t('toolbar.group.project')}>
              <Tool
                icon="projectOpen"
                label={`${t('toolbar.openProject')}${hint(keymap, 'project.open')}`}
                onClick={() => run('project.open')}
              />
              <Tool
                icon="project"
                label={`${t('toolbar.saveProject')}${hint(keymap, 'project.save')}`}
                onClick={() => run('project.save')}
              />
            </Grupo>

            <Divisoria />

            <Grupo label={t('toolbar.group.script')}>
              <Tool icon="import" label={t('toolbar.import')} onClick={onImport} />
              <Tool
                icon="export"
                label={
                  tab.exportPath
                    ? `${t('toolbar.saveScriptTo', { file: fileName(tab.exportPath) })}${hint(keymap, 'document.save')}`
                    : `${t('toolbar.saveScript')}${hint(keymap, 'document.save')}`
                }
                onClick={() => run('document.save')}
              />
            </Grupo>
          </Pill>

          <div className="toolbar-grp-ar flex flex-none items-center gap-2">
            <Pill name="ar">
              <Grupo label={t('toolbar.group.air')}>
                <Tool
                  icon="blackout"
                  label={`${t('toolbar.blackout')}${hint(keymap, 'output.blackout')}`}
                  active={transport.blackout}
                  danger
                  onClick={() => run('output.blackout')}
                />
                <Tool
                  icon="card"
                  label={t('cards.toolbar')}
                  active={state.transport.card !== null}
                  tint="var(--color-warn)"
                  onClick={onOpenCards}
                />
                <Tool
                  icon="freeze"
                  label={`${t('toolbar.freeze')}${hint(keymap, 'transport.freeze')}`}
                  active={transport.frozen}
                  tint="var(--color-link)"
                  onClick={() => run('transport.freeze')}
                />
                {/* aceso pelo que está acontecendo, não pelo que foi pedido:
                    com a porta ocupada, o ícone verde diria que há uma página
                    no ar quando não há */}
                <Tool
                  icon="webview"
                  label={
                    webviewLive
                      ? t('toolbar.webviewOn')
                      : t('toolbar.webviewOff')
                  }
                  active={webviewLive}
                  tint="var(--color-go)"
                  onClick={onOpenWebview}
                />
                <Tool
                  icon="monitor"
                  label={t('toolbar.identify')}
                  tint="var(--color-accent-2)"
                  onClick={() => window.valendo.identifyDisplays()}
                />
              </Grupo>
            </Pill>

            {/* com o transporte no topo, a SAÍDA fecha a barra do console;
                aqui ela só aparece quando aquela barra desce para a régua */}
            {state.transportPosition === 'regua' ? (
              <PocoDeSaida displays={displays} output={state.output} dispatch={dispatch} run={run} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A barra de progresso do mostrador: quanto já rolou, com os marcadores em âmbar. */
function BarraDeProgresso({ fracao, ticks }: { fracao: number; ticks: number[] }): React.JSX.Element {
  return (
    <div className="relative h-[7px] overflow-hidden rounded-[4px] bg-[var(--color-lcd-track)]">
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${Math.min(100, fracao * 100)}%`,
          background: 'linear-gradient(90deg, #2b7d52, var(--color-go))'
        }}
      />
      {ticks.map((tick, index) => (
        <div
          key={index}
          className="absolute top-0 bottom-0 w-[2px] bg-[var(--color-warn)]"
          style={{ left: `${Math.min(100, tick * 100)}%` }}
        />
      ))}
    </div>
  )
}

/**
 * O "ALVO" da legenda do mostrador: clica, digita a duração, o ritmo se
 * ajusta para caber nela — a mesma conta que morava no rodapé. O texto fica
 * guardado depois de aplicar, porque a legenda é o lembrete do combinado:
 * "PREVISÃO" diz onde o ritmo atual leva, "ALVO" diz o que foi pedido.
 */
function AlvoDoLcd({
  ruler,
  dispatch
}: {
  ruler: number
  dispatch: (action: Action) => void
}): React.JSX.Element {
  const { t } = useT()
  const [editando, setEditando] = useState(false)
  const [alvo, setAlvo] = useState<string | null>(null)

  const aplicar = (texto: string): void => {
    const seconds = parseDuration(texto)
    if (seconds && ruler > 0) {
      dispatch({ type: 'transport/ppm', ppm: Math.round(ppmForTarget(ruler, seconds)) })
      setAlvo(formatClock(seconds))
    }
    setEditando(false)
  }

  if (editando) {
    return (
      <span className="flex items-center gap-1">
        <span>{t('lcd.target')}</span>
        <input
          autoFocus
          data-lcd-alvo
          placeholder="2:00"
          onBlur={(event) => aplicar(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setEditando(false)
          }}
          className="w-10 border-b border-[var(--color-lcd-caption)] bg-transparent text-center font-mono text-[10px] text-[var(--color-fog-05)] outline-none"
        />
      </span>
    )
  }

  return (
    <button
      type="button"
      data-lcd-alvo
      title={t('status.target')}
      onClick={() => setEditando(true)}
      className="k-microcaps cursor-pointer tracking-[0.1em] text-[var(--color-lcd-caption)] hover:text-[var(--color-fog-1)]"
    >
      {t('lcd.target')} {alvo ?? '—'}
    </button>
  )
}

/** O teclado de transporte: teclas físicas num poço fundo, o play maior e verde. */
function TecladoDeTransporte({
  playing,
  keymap,
  run
}: {
  playing: boolean
  keymap: Map<string, string>
  run: (commandId: string) => void
}): React.JSX.Element {
  const { t } = useT()
  const lado = 'h-11 w-12 rounded-lg'

  return (
    <Poco fundo className="gap-[7px] p-[5px]" data-grupo="transporte">
      <Tecla
        title={`${t('toolbar.restart')}${hint(keymap, 'transport.restart')}`}
        aria-label={t('toolbar.restart')}
        className={lado}
        onClick={() => run('transport.restart')}
      >
        <Icon name="restart" size={17} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.back')}${hint(keymap, 'transport.jumpBack')}`}
        aria-label={t('toolbar.back')}
        className={lado}
        onClick={() => run('transport.jumpBack')}
      >
        <Icon name="up" size={17} />
      </Tecla>
      <Tecla
        play
        title={`${playing ? t('toolbar.pause') : t('toolbar.play')}${hint(keymap, 'transport.playPause')}`}
        aria-label={playing ? t('toolbar.pause') : t('toolbar.play')}
        className="h-[46px] w-[86px] rounded-lg"
        onClick={() => run('transport.playPause')}
      >
        <Icon name={playing ? 'pause' : 'play'} size={20} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.forward')}${hint(keymap, 'transport.jumpForward')}`}
        aria-label={t('toolbar.forward')}
        className={lado}
        onClick={() => run('transport.jumpForward')}
      >
        <Icon name="down" size={17} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.marker')}${hint(keymap, 'marker.create')}`}
        aria-label={t('toolbar.marker')}
        className={lado}
        onClick={() => run('marker.create')}
      >
        <Icon name="marker" size={17} />
      </Tecla>
    </Poco>
  )
}

/**
 * O console de transporte: o que se toca a cada segundo com o programa correndo.
 *
 * Vive sozinho porque muda de lugar — no topo, logo abaixo das barras de
 * preparação (8a); ou como régua no rodapé, entre o roteiro e os cartões
 * (8b). As peças são as mesmas — mostrador de progresso, relógios, teclado,
 * velocidade —, só a moldura e a ordem mudam; a SAÍDA fecha a barra apenas no
 * topo, porque na régua ela sobe para a barra de arquivo.
 */
export function BarraDeTransporte({
  state,
  tab,
  displays,
  keymap,
  rows,
  dispatch,
  run,
  position
}: Pick<Props, 'state' | 'tab' | 'displays' | 'keymap' | 'rows' | 'dispatch' | 'run'> & {
  position: TransportPosition
}): React.JSX.Element {
  const { t } = useT()
  const { transport } = state
  const now = useNow()

  const lines = useMemo(
    () => composeLines(tab.blocks, tab.appearance, rows),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const segments = useMemo(() => buildRundown(tab.blocks, lines, tab.markers), [tab.blocks, lines, tab.markers])

  const ruler = totalWords(lines)
  const lidas = Math.min(ruler, Math.max(0, wordIndexAt(transport, now)))
  const total = secondsForWords(ruler, transport.ppm)
  const elapsed = secondsForWords(lidas, transport.ppm)
  const fracao = ruler > 0 ? lidas / ruler : 0
  const capitulo = segments[segmentIndexAt(segments, lidas)]?.title ?? ''
  const ticks = ruler > 0 ? segments.flatMap((s) => s.markers).map((m) => m.rulerStart / ruler) : []

  const compacto = position === 'regua'
  const corpo = compacto ? 24 : 26

  const decorrido = (
    <Digito
      valor={formatClock(elapsed)}
      rotulo={t('toolbar.elapsed')}
      cor="var(--color-go)"
      tamanho={corpo}
      className={`border-r border-[var(--color-lcd-line)] ${compacto ? 'px-3' : 'px-5'}`}
    />
  )
  const restante = (
    <Digito
      valor={`−${formatClock(Math.max(0, total - elapsed))}`}
      rotulo={t('toolbar.remaining')}
      cor="var(--color-live-soft)"
      tamanho={corpo}
      className={`border-r border-[var(--color-lcd-line)] ${compacto ? 'px-3' : 'px-5'}`}
    />
  )

  const velocidade = (
    <Lcd className={`${compacto ? 'h-12' : 'h-[52px]'} min-w-0 flex-1`}>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 border-r border-[var(--color-lcd-line)] px-4">
        <SpeedRuler ppm={transport.ppm} onChange={(ppm) => dispatch({ type: 'transport/ppm', ppm })} />
        <div className="k-microcaps flex justify-between gap-2 tracking-[0.1em] text-[var(--color-lcd-caption)]">
          <span>{PPM_MIN}</span>
          <span className="truncate">{t('lcd.speed')}</span>
          <span>{PPM_MAX}</span>
        </div>
      </div>
      <Digito valor={String(transport.ppm)} rotulo={t('toolbar.ppm')} tamanho={corpo} className="px-6" />
    </Lcd>
  )

  if (position === 'topo') {
    return (
      <div
        data-transporte="topo"
        className="flex flex-none items-center gap-2.5 border-b border-[var(--color-edge)] px-2.5 py-2"
        style={{ background: 'linear-gradient(#1b1b1f, #161618)' }}
      >
        <Lcd className="h-[52px] min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4">
            <BarraDeProgresso fracao={fracao} ticks={ticks} />
            <div className="k-microcaps flex items-center justify-between gap-3 tracking-[0.1em] text-[var(--color-lcd-caption)]">
              <span className="min-w-0 truncate">{capitulo ? `§ ${capitulo}` : ''}</span>
              <span className="flex flex-none items-center gap-1">
                <span>
                  {t('lcd.forecast')} {formatClock(total)} ·
                </span>
                <AlvoDoLcd ruler={ruler} dispatch={dispatch} />
              </span>
            </div>
          </div>
        </Lcd>

        {decorrido}
        {restante}

        <TecladoDeTransporte playing={transport.playing} keymap={keymap} run={run} />

        {velocidade}

        <PocoDeSaida displays={displays} output={state.output} dispatch={dispatch} run={run} />
      </div>
    )
  }

  return (
    <div
      data-transporte="regua"
      className="relative z-[2] flex h-[70px] flex-none items-center gap-2.5 border-y border-[var(--color-edge)] px-2.5"
      style={{
        background: 'linear-gradient(#2c2c31, #1e1e22)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(0,0,0,.45)'
      }}
    >
      <Lcd className="h-12 min-w-0 flex-1">
        {decorrido}
        {restante}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3">
          <BarraDeProgresso fracao={fracao} ticks={ticks} />
          <div className="k-microcaps flex items-center justify-between gap-3 tracking-[0.1em] text-[var(--color-lcd-caption)]">
            <span className="min-w-0 truncate">{capitulo}</span>
            <AlvoDoLcd ruler={ruler} dispatch={dispatch} />
          </div>
        </div>
      </Lcd>

      <TecladoDeTransporte playing={transport.playing} keymap={keymap} run={run} />

      {velocidade}
    </div>
  )
}
