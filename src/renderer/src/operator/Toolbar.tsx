import { useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { formatBinding, parseBinding } from '@shared/commands'
import { formatClock, ppmForTarget, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import { PPM_MAX, PPM_MIN } from '@shared/ruler'
import type { AppState, DisplayInfo, Tab, TransportPosition } from '@shared/types'
import { Icon } from '../ui/Icon'
import { Digito, Lcd, Poco, Tecla } from '../ui/console'
import { useT } from '../i18n'
import { useNow } from '../ui/useNow'
import { SpeedRuler } from './SpeedRuler'
import { Tabs } from './Tabs'

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

/**
 * Os poços de arquivo: PROJETO e ROTEIRO, cada um com abrir/importar e salvar.
 *
 * Componente próprio porque mudam de andar com o layout: com o transporte no
 * topo (8a) moram na linha das abas; com ele na régua (8b) sobem para a linha
 * do wordmark, que fica com espaço sobrando — exatamente como a maquete
 * desenha as duas variantes.
 */
export function PocosDeArquivo({
  tab,
  keymap,
  run,
  onImport
}: {
  tab: Tab
  keymap: Map<string, string>
  run: (commandId: string) => void
  onImport: () => void
}): React.JSX.Element {
  const { t } = useT()

  return (
    <>
      <Poco rotulo={t('toolbar.group.project')} cor="var(--color-link)" data-pill="documento">
        <Tecla
          title={`${t('toolbar.openProject')}${hint(keymap, 'project.open')}`}
          aria-label={t('toolbar.openProject')}
          className="h-6 w-7"
          onClick={() => run('project.open')}
        >
          <Icon name="projectOpen" size={13} />
        </Tecla>
        <Tecla
          title={`${t('toolbar.saveProject')}${hint(keymap, 'project.save')}`}
          className="h-6 px-2 text-[11px]"
          onClick={() => run('project.save')}
        >
          {t('key.save')}
        </Tecla>
      </Poco>

      <Poco rotulo={t('toolbar.group.script')} cor="var(--color-warn)" data-pill="roteiro">
        {/* mesma pasta do PROJETO: abrir um roteiro também é abrir um
            arquivo, e as duas teclas precisam ler como a mesma ação */}
        <Tecla title={t('toolbar.import')} aria-label={t('toolbar.import')} className="h-6 w-7" onClick={onImport}>
          <Icon name="projectOpen" size={13} />
        </Tecla>
        <Tecla
          title={
            tab.exportPath
              ? `${t('toolbar.saveScriptTo', { file: fileName(tab.exportPath) })}${hint(keymap, 'document.save')}`
              : `${t('toolbar.saveScript')}${hint(keymap, 'document.save')}`
          }
          className="h-6 px-2 text-[11px]"
          onClick={() => run('document.save')}
        >
          {t('key.save')}
        </Tecla>
      </Poco>
    </>
  )
}

/**
 * O poço AR: o que age sobre a tela do apresentador com o programa correndo —
 * tela preta, congelar, rede local, identificar monitores.
 *
 * A maquete não desenha este grupo (o roteiro dela não precisava), mas o app
 * precisa: ele ganha o mesmo material dos outros poços, e cada tecla mantém a
 * cor de glifo que já tinha — apagada em repouso, acesa no estado. Sem
 * rótulo: fica na ponta da barra, junto das abas, e não precisa se apresentar
 * — CARDS foi para os PAINÉIS, junto de Assets e Ajustes, por ser um painel
 * como os outros dois, e não uma ação sobre o ar.
 */
export function PocoDoAr({
  state,
  webviewLive,
  keymap,
  run,
  onOpenWebview
}: {
  state: AppState
  webviewLive: boolean
  keymap: Map<string, string>
  run: (commandId: string) => void
  onOpenWebview: () => void
}): React.JSX.Element {
  const { t } = useT()
  const { transport } = state

  return (
    <Poco data-pill="ar">
      <Tecla
        title={`${t('toolbar.blackout')}${hint(keymap, 'output.blackout')}`}
        aria-label={t('toolbar.blackout')}
        acesa={transport.blackout}
        cor="var(--color-live)"
        className="h-9 w-10"
        style={!transport.blackout ? { color: 'var(--color-live)' } : undefined}
        onClick={() => run('output.blackout')}
      >
        <Icon name="blackout" size={17} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.freeze')}${hint(keymap, 'transport.freeze')}`}
        aria-label={t('toolbar.freeze')}
        acesa={transport.frozen}
        cor="var(--color-go)"
        className="h-9 w-10"
        style={!transport.frozen ? { color: 'var(--color-link)' } : undefined}
        onClick={() => run('transport.freeze')}
      >
        <Icon name="freeze" size={17} />
      </Tecla>
      {/* aceso pelo que está acontecendo, não pelo que foi pedido: com a porta
          ocupada, o verde diria que há uma página no ar quando não há */}
      <Tecla
        title={webviewLive ? t('toolbar.webviewOn') : t('toolbar.webviewOff')}
        aria-label={t('toolbar.webviewOff')}
        acesa={webviewLive}
        cor="var(--color-go)"
        className="h-9 w-10"
        style={!webviewLive ? { color: 'var(--color-go)' } : undefined}
        onClick={onOpenWebview}
      >
        <Icon name="webview" size={17} />
      </Tecla>
      <Tecla
        title={t('toolbar.identify')}
        aria-label={t('toolbar.identify')}
        className="h-9 w-10"
        style={{ color: 'var(--color-accent-2)' }}
        onClick={() => window.valendo.identifyDisplays()}
      >
        <Icon name="monitor" size={17} />
      </Tecla>
    </Poco>
  )
}

/**
 * O poço SAÍDA: monitor + Transmitir, no material do console.
 *
 * Mora num componente porque muda de casa com o layout: com o transporte no
 * topo (8a) ele fecha a barra do console; com o transporte na régua (8b) ele
 * mora na barra de abas, à direita do AR — a maquete desenha assim nos dois
 * casos, e o botão precisa existir UMA vez em cada arrumação, nunca duas.
 *
 * O Transmitir é o próprio indicador de estado: apagado é um relevo vinho com
 * o ponto fundido; no ar, acende de vermelho com brilho vazando. O "No ar"
 * gigante do cabeçalho saiu — dois avisos do mesmo fato ensinavam o olho a
 * ignorar um deles.
 *
 * `grande` é só o topo: ali a régua de velocidade encolheu pela metade
 * (`flex-[3_1_0%]` no LCD de progresso, sobrando espaço), e é esse espaço
 * que cresce aqui — monitor mais largo, para o nome do monitor caber
 * inteiro, e Transmitir maior, o botão que decide o programa inteiro.
 */
export function PocoDeSaida({
  displays,
  output,
  dispatch,
  run,
  grande
}: {
  displays: DisplayInfo[]
  output: AppState['output']
  dispatch: (action: Action) => void
  run: (commandId: string) => void
  grande?: boolean
}): React.JSX.Element {
  const { t } = useT()

  return (
    <Poco className="gap-[7px]" data-pill="saida">
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
        className={`flex-none rounded-[5px] border border-[var(--color-edge)] bg-[#1e1e21] text-[var(--color-fog-2)] ${
          grande ? 'h-8 max-w-[340px] px-2.5 text-[12px]' : 'h-6 max-w-[190px] px-2 text-[10px]'
        }`}
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
        className={`flex flex-none items-center gap-1.5 rounded-[5px] border border-[var(--color-edge)] font-semibold whitespace-nowrap transition-[filter] hover:brightness-115 disabled:opacity-30 ${
          grande ? 'h-11 min-w-[150px] justify-center px-6 text-[15px]' : 'h-6 px-3 text-[11px]'
        }`}
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
 * A linha das abas: arquivo, ar e as fichas dos roteiros.
 *
 * PROJETO/ROTEIRO abrem a linha nas duas arrumações — antes eles subiam para
 * o cabeçalho quando o transporte ia para a régua, mas o cabeçalho é do
 * PROGRAMA (nome do projeto, painéis), não do arquivo. As abas esticam
 * (`flex-1`), então tudo que vem depois delas — AR e, na régua, SAÍDA — fica
 * empurrado para a ponta direita da barra, na ordem em que aparece aqui.
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
  onOpenWebview
}: Omit<Props, 'rows'>): React.JSX.Element {
  return (
    <div className="flex flex-none items-center gap-2.5 border-b border-[var(--color-edge)] bg-[#17171a] px-2.5 py-[5px]">
      <PocosDeArquivo tab={tab} keymap={keymap} run={run} onImport={onImport} />

      <Tabs state={state} dispatch={dispatch} />

      <PocoDoAr state={state} webviewLive={webviewLive} keymap={keymap} run={run} onOpenWebview={onOpenWebview} />

      {/* com o transporte no topo, a SAÍDA fecha a barra do console; na
          régua, ela sobe para cá, à direita do AR */}
      {state.transportPosition === 'regua' ? (
        <PocoDeSaida displays={displays} output={state.output} dispatch={dispatch} run={run} />
      ) : null}
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
        {playing ? (
          <Icon name="pause" size={20} />
        ) : (
          // preenchido, e não contorno: um triângulo fino sobre o verde vivo
          // some de tão claro — o play é a única tecla que precisa de um
          // glifo sólido para ler de longe
          <Icon name="play" size={20} filled style={{ color: '#000' }} />
        )}
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
    // na régua a largura vem da coluna do grid, não de `flex-1`: as duas
    // pontas da barra (este LCD e o de decorrido/restante+progresso) usam a
    // MESMA coluna `1fr`, o que garante as duas do mesmo tamanho sempre —
    // é o que deixa o play exatamente no meio, não uma sobra do que os
    // conteúdos de cada lado pediam
    <Lcd className={`${compacto ? 'h-12' : 'h-[52px] flex-1'} min-w-0`}>
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
        {/* `flex-[2.25_1_0%]`, e não `flex-1`: contra o `flex-1` da régua de
            velocidade logo abaixo, essa razão é a medida (por tentativa e
            erro, com o app rodando) que deixa o play exatamente no centro
            horizontal da janela — o resto do bloco esquerdo (decorrido,
            restante) e do bloco direito (velocidade, SAÍDA) não é simétrico
            em largura, então a razão 1:1 não bastava */}
        <Lcd className="h-[52px] min-w-0 flex-[2.25_1_0%]">
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

        <PocoDeSaida displays={displays} output={state.output} dispatch={dispatch} run={run} grande />
      </div>
    )
  }

  return (
    // grade de 3 colunas, e não `flex`: duas colunas `1fr` IGUAIS nas pontas
    // garantem que o teclado de transporte (coluna do meio, `auto`) cai no
    // centro geométrico da régua sempre — com `flex-1` simples, cada ponta
    // cresce a partir do próprio conteúdo, e o lado mais cheio (decorrido +
    // restante + progresso) sobra maior que o outro, empurrando o play para
    // fora do centro
    <div
      data-transporte="regua"
      className="relative z-[2] grid h-[70px] flex-none items-center gap-2.5 border-y border-[var(--color-edge)] px-2.5"
      style={{
        gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
        background: 'linear-gradient(#2c2c31, #1e1e22)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(0,0,0,.45)'
      }}
    >
      <Lcd className="h-12 min-w-0">
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
