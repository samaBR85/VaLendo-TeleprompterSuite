import { useEffect, useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { formatBinding, parseBinding } from '@shared/commands'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import type { AppState, DisplayInfo, Tab } from '@shared/types'
import { Icon, type IconName } from '../ui/Icon'
import { useT } from '../i18n'
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

/**
 * O relógio do mostrador vive aqui dentro, e não no App.
 *
 * Se o App remarcasse a cada segundo, a prévia inteira remontaria junto — e ela
 * desenha o roteiro todo. Só a barra precisa piscar.
 */
function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function hint(keymap: Map<string, string>, commandId: string): string {
  const binding = parseBinding(keymap.get(commandId) ?? '')
  if (!binding) return ''
  return ` · ${formatBinding(binding, window.valendo.platform === 'darwin')}`
}

/** Nome do arquivo, sem o caminho todo, para caber no rótulo do botão. */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
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

function Campo({
  value,
  unit,
  tone,
  wide
}: {
  value: string
  unit: string
  tone?: string
  wide?: boolean
}): React.JSX.Element {
  return (
    <div className={`flex flex-none flex-col leading-[1.15] ${wide ? 'min-w-[54px]' : ''}`}>
      <span className="font-mono text-[21px] tabular-nums" style={{ color: tone ?? 'var(--color-fog-0)' }}>
        {value}
      </span>
      <span className="font-mono text-[8px] tracking-[0.16em] text-[var(--color-fog-2)] uppercase">{unit}</span>
    </div>
  )
}

/**
 * A barra de comando, arrumada como um console: documento à esquerda, o
 * transporte e o mostrador no centro, o ar à direita.
 *
 * O que está aqui é o que se usa com a transmissão correndo. Aparência —
 * inverter, espelhar, girar — mora nos ajustes, e as ferramentas de texto no
 * cabeçalho do editor, que é onde elas agem.
 */
export function Toolbar({
  state,
  tab,
  displays,
  keymap,
  rows,
  dispatch,
  run,
  onImport,
  webviewLive,
  onOpenWebview,
  onOpenCards
}: Props): React.JSX.Element {
  const { t } = useT()
  const { transport, output } = state
  const now = useNow()

  const ruler = useMemo(
    () => totalWords(composeLines(tab.blocks, tab.appearance, rows)),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const lidas = Math.min(ruler, Math.max(0, wordIndexAt(transport, now)))
  const total = secondsForWords(ruler, transport.ppm)
  const elapsed = secondsForWords(lidas, transport.ppm)

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
                  tint="#EF9F27"
                  onClick={onOpenCards}
                />
                <Tool
                  icon="freeze"
                  label={`${t('toolbar.freeze')}${hint(keymap, 'transport.freeze')}`}
                  active={transport.frozen}
                  tint="#378ADD"
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
                  tint="#1D9E75"
                  onClick={onOpenWebview}
                />
                <Tool
                  icon="monitor"
                  label={t('toolbar.identify')}
                  tint="#7F77DD"
                  onClick={() => window.valendo.identifyDisplays()}
                />
              </Grupo>
            </Pill>

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
              className="max-w-[190px] flex-none rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1.5 text-[11px]"
            >
              <option value="">{t('toolbar.pickMonitor')}</option>
              {displays.map((display) => (
                <option key={display.id} value={display.id}>
                  {display.label}
                  {display.primary ? ` · ${t('toolbar.primary')}` : ''}
                </option>
              ))}
            </select>

            {/* o botão diz o que ele está fazendo; quem diz o estado do
                programa é o "No ar" lá em cima. Os dois escritos igual
                desperdiçavam os dois — e o vermelho fica reservado para o
                indicador, que é o alarme */}
            <button
              type="button"
              data-broadcast-toggle
              disabled={output.displayId === null}
              onClick={() => run('output.toggle')}
              className={`flex-none rounded-lg border px-6 py-2.5 text-[18px] whitespace-nowrap disabled:opacity-30 ${
                output.enabled
                  ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/14 text-[var(--color-go)]'
                  : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
              }`}
            >
              {output.enabled ? t('toolbar.broadcasting') : t('toolbar.broadcast')}
            </button>
          </div>
        </div>

        {/* fila do que se toca a cada segundo com a transmissão correndo */}
        <div className="toolbar-fila">
          <div className="toolbar-grp-transporte flex flex-none items-center gap-1.5">
            <Tool icon="restart" label={`${t('toolbar.restart')}${hint(keymap, 'transport.restart')}`} size="grande" onClick={() => run('transport.restart')} />
            <Tool icon="up" label={`${t('toolbar.back')}${hint(keymap, 'transport.jumpBack')}`} size="grande" onClick={() => run('transport.jumpBack')} />
            <Tool
              icon={transport.playing ? 'pause' : 'play'}
              label={`${transport.playing ? t('toolbar.pause') : t('toolbar.play')}${hint(keymap, 'transport.playPause')}`}
              size="principal"
              go
              onClick={() => run('transport.playPause')}
            />
            <Tool icon="down" label={`${t('toolbar.forward')}${hint(keymap, 'transport.jumpForward')}`} size="grande" onClick={() => run('transport.jumpForward')} />
            <Tool icon="marker" label={`${t('toolbar.marker')}${hint(keymap, 'marker.create')}`} size="grande" onClick={() => run('marker.create')} />
          </div>

          {/* o mostrador: o que o operador lê de relance, do outro lado da sala */}
          <div className="toolbar-lcd flex flex-none items-center gap-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-0)] px-3.5 py-1.5">
            <div className="flex flex-none flex-col gap-[3px]">
              <SpeedRuler ppm={transport.ppm} onChange={(ppm) => dispatch({ type: 'transport/ppm', ppm })} />
              <div className="flex justify-between font-mono text-[8px] tracking-[0.12em] text-[var(--color-fog-2)]">
                <span>60</span>
                <span>500</span>
              </div>
            </div>
            <Campo value={String(transport.ppm)} unit={t('toolbar.ppm')} wide />
            <Campo value={formatClock(elapsed)} unit={t('toolbar.elapsed')} tone="var(--color-go)" />
            <Campo value={`−${formatClock(Math.max(0, total - elapsed))}`} unit={t('toolbar.remaining')} tone="var(--color-live)" />
          </div>
        </div>
      </div>
    </div>
  )
}
