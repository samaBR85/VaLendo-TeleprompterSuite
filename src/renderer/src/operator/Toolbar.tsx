import type { Action, HistoryInfo } from '@shared/actions'
import { formatBinding, parseBinding } from '@shared/commands'
import type { AppState, DisplayInfo, Tab } from '@shared/types'
import { Icon, type IconName } from '../ui/Icon'

interface Props {
  state: AppState
  tab: Tab
  history: HistoryInfo
  displays: DisplayInfo[]
  keymap: Map<string, string>
  dispatch: (action: Action) => void
  run: (commandId: string) => void
  onImport: () => void
}

function hint(keymap: Map<string, string>, commandId: string): string {
  const binding = parseBinding(keymap.get(commandId) ?? '')
  if (!binding) return ''
  return ` · ${formatBinding(binding, window.valendo.platform === 'darwin')}`
}

function Tool({
  icon,
  label,
  active,
  danger,
  disabled,
  onClick
}: {
  icon: IconName
  label: string
  active?: boolean
  danger?: boolean
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
      className={`rounded-md p-1.5 transition-colors disabled:opacity-30 ${
        active
          ? danger
            ? 'bg-[var(--color-live)]/18 text-[var(--color-live)]'
            : 'bg-[var(--color-go)]/16 text-[var(--color-go)]'
          : 'text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]'
      }`}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

export function Toolbar({
  state,
  tab,
  history,
  displays,
  keymap,
  dispatch,
  run,
  onImport
}: Props): React.JSX.Element {
  const { transport, output } = state

  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] px-3 py-1.5">
      <div className="flex items-center gap-0.5">
        <Tool icon="restart" label={`Voltar ao início${hint(keymap, 'transport.restart')}`} onClick={() => run('transport.restart')} />
        <Tool
          icon={transport.playing ? 'pause' : 'play'}
          label={`${transport.playing ? 'Pausar' : 'Iniciar'}${hint(keymap, 'transport.playPause')}`}
          active={transport.playing}
          onClick={() => run('transport.playPause')}
        />
        <Tool icon="up" label={`Recuar${hint(keymap, 'transport.jumpBack')}`} onClick={() => run('transport.jumpBack')} />
        <Tool icon="down" label={`Avançar${hint(keymap, 'transport.jumpForward')}`} onClick={() => run('transport.jumpForward')} />
      </div>

      <div className="h-4 w-px bg-[var(--color-line)]" />

      <label className="flex items-center gap-2 text-[11px]">
        <span className="text-[var(--color-fog-2)]">Ritmo</span>
        <input
          type="range"
          min={60}
          max={320}
          step={1}
          value={transport.ppm}
          onChange={(event) => dispatch({ type: 'transport/ppm', ppm: Number(event.target.value) })}
          className="w-24"
        />
        <span className="w-14 tabular-nums text-[var(--color-fog-0)]">{transport.ppm} ppm</span>
      </label>

      <div className="h-4 w-px bg-[var(--color-line)]" />

      <div className="flex items-center gap-0.5">
        <Tool icon="import" label="Importar roteiro (txt, md, docx, pdf)" onClick={onImport} />
        <Tool icon="marker" label={`Criar marcador${hint(keymap, 'marker.create')}`} onClick={() => run('marker.create')} />
        <Tool icon="undo" label={`Desfazer${hint(keymap, 'edit.undo')}`} disabled={!history.canUndo} onClick={() => run('edit.undo')} />
        <Tool icon="redo" label={`Refazer${hint(keymap, 'edit.redo')}`} disabled={!history.canRedo} onClick={() => run('edit.redo')} />
      </div>

      <div className="h-4 w-px bg-[var(--color-line)]" />

      <div className="flex items-center gap-0.5">
        <Tool icon="contrast" label={`Inverter cores${hint(keymap, 'colors.invert')}`} onClick={() => run('colors.invert')} />
        <Tool icon="mirror" label={`Espelhar${hint(keymap, 'output.mirror')}`} active={tab.appearance.mirrorX} onClick={() => run('output.mirror')} />
        <Tool icon="rotate" label={`Rotacionar${hint(keymap, 'output.rotate')}`} active={tab.appearance.rotation !== 0} onClick={() => run('output.rotate')} />
        <Tool icon="freeze" label={`Congelar a saída${hint(keymap, 'transport.freeze')}`} active={transport.frozen} onClick={() => run('transport.freeze')} />
        <Tool icon="blackout" label={`Tela preta${hint(keymap, 'output.blackout')}`} active={transport.blackout} danger onClick={() => run('output.blackout')} />
      </div>

      <div className="ml-auto flex items-center gap-2">
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
          className="max-w-[230px] rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1 text-[11px]"
        >
          <option value="">Escolha o monitor da transmissão</option>
          {displays.map((display) => (
            <option key={display.id} value={display.id}>
              {display.label}
              {display.primary ? ' · principal' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => window.valendo.identifyDisplays()}
          title="Mostra um número grande em cada monitor"
          className="rounded-md border border-[var(--color-line)] px-2 py-1 text-[11px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]"
        >
          Identificar
        </button>

        <button
          type="button"
          disabled={output.displayId === null}
          onClick={() => run('output.toggle')}
          className={`rounded-md border px-2.5 py-1 text-[11px] disabled:opacity-30 ${
            output.enabled
              ? 'border-[var(--color-live)]/50 bg-[var(--color-live)]/16 text-[var(--color-live)]'
              : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
          }`}
        >
          {output.enabled ? 'No ar' : 'Transmitir'}
        </button>
      </div>
    </div>
  )
}
