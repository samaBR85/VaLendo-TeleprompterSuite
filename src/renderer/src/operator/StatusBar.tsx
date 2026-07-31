import { useMemo, useState } from 'react'
import type { Action, HistoryInfo } from '@shared/actions'
import type { StorageHealth } from '@shared/api'
import { composeLines, totalWords } from '@shared/anchor'
import { formatClock, ppmForTarget, secondsForWords } from '@shared/pacing'
import { totalWordCount } from '@shared/text'
import type { AppState, LayoutMode, Tab } from '@shared/types'
import { Icon, type IconName } from '../ui/Icon'
import { versionLabel } from '../ui/Wordmark'

interface Props {
  state: AppState
  tab: Tab
  history: HistoryInfo
  rows: number[]
  storage: StorageHealth
  dispatch: (action: Action) => void
  onOpenCredits: () => void
  onModeChange: (mode: LayoutMode) => void
}

const MODOS: { mode: LayoutMode; label: string; icon: IconName; hint: string }[] = [
  { mode: 'split', label: 'Split', icon: 'layoutSplit', hint: 'edição e transmissão lado a lado' },
  { mode: 'focus', label: 'Foco', icon: 'layoutFocus', hint: 'transmissão em largura total · F11' },
  { mode: 'deck', label: 'Mesa', icon: 'layoutDeck', hint: 'linha do tempo e rundown de um programa com vários blocos' }
]

/** Split, Foco e Mesa são jeitos de olhar para o mesmo roteiro, não documentos diferentes. */
function ModeSwitch({ mode, onChange }: { mode: LayoutMode; onChange: (mode: LayoutMode) => void }): React.JSX.Element {
  return (
    <div
      data-mode-switch
      className="flex flex-none items-center gap-0.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] p-1"
    >
      {MODOS.map((item) => (
        <button
          key={item.mode}
          type="button"
          data-mode={item.mode}
          title={`${item.label} — ${item.hint}`}
          onClick={() => onChange(item.mode)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] transition-colors ${
            mode === item.mode
              ? 'bg-[var(--color-ink-3)] text-[var(--color-fog-0)]'
              : 'text-[var(--color-fog-2)] hover:text-[var(--color-fog-1)]'
          }`}
        >
          <Icon name={item.icon} size={15} />
          {item.label}
        </button>
      ))}
    </div>
  )
}

function parseDuration(text: string): number | null {
  const match = /^(\d+):([0-5]?\d)$/.exec(text.trim())
  if (match) return Number(match[1]) * 60 + Number(match[2])
  const seconds = Number(text.trim())
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }): React.JSX.Element {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[var(--color-fog-2)]">{label}</span>
      <span className="tabular-nums" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </span>
  )
}

export function StatusBar({
  state,
  tab,
  history,
  rows,
  storage,
  dispatch,
  onOpenCredits,
  onModeChange
}: Props): React.JSX.Element {
  const [target, setTarget] = useState('')

  // "Palavras" é a contagem de fala de verdade. A régua de rolagem é outra
  // coisa: inclui o peso das linhas de direção e capítulo, que não são ditas
  // mas ocupam tempo de tela — por isso alimenta os tempos, não a contagem
  const spoken = useMemo(() => totalWordCount(tab.blocks), [tab.blocks])
  const ruler = useMemo(
    () => totalWords(composeLines(tab.blocks, tab.appearance, rows)),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )

  const total = secondsForWords(ruler, state.transport.ppm)

  const applyTarget = (): void => {
    const seconds = parseDuration(target)
    if (seconds && ruler > 0) dispatch({ type: 'transport/ppm', ppm: Math.round(ppmForTarget(ruler, seconds)) })
    setTarget('')
  }

  return (
    <footer className="flex flex-none items-center gap-4 border-t border-[var(--color-line)] bg-[var(--color-ink-1)] px-3 py-2 text-[11px]">
      <ModeSwitch mode={state.layoutMode} onChange={onModeChange} />
      <div className="h-8 w-px flex-none bg-[var(--color-line)]" />

      {/* decorrido e restante saíram daqui: agora estão no mostrador da barra de
          cima, em corpo grande. Repetir os mesmos números em dois lugares só
          ensina o olho a não confiar em nenhum dos dois */}
      <Cell label="Palavras" value={spoken.toLocaleString('pt-BR')} />
      <Cell label="Duração" value={formatClock(total)} />

      <label className="flex items-center gap-1.5">
        <span className="text-[var(--color-fog-2)]">Duração-alvo</span>
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          onBlur={applyTarget}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyTarget()
          }}
          placeholder="2:00"
          className="w-14 rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-1.5 py-0.5 text-center outline-none"
        />
      </label>

      <div className="ml-auto flex items-center gap-4 text-[var(--color-fog-2)]">
        {/* dizer que está gravando é tão importante quanto dizer que falhou:
            sem o sinal positivo, silêncio e defeito têm a mesma cara */}
        <span
          data-storage
          style={storage.problem ? { color: 'var(--color-warn)' } : undefined}
          title={storage.problem ?? 'O trabalho está sendo gravado no disco'}
        >
          {storage.problem ? 'não está salvando' : 'salvo'}
        </span>
        <span>{tab.markers.length} marcadores</span>
        <span>{history.depth.toLocaleString('pt-BR')} passos de desfazer</span>
        <span>Ctrl+K comandos</span>
        <button
          type="button"
          onClick={onOpenCredits}
          title="Créditos"
          className="tabular-nums hover:text-[var(--color-fog-0)]"
        >
          {versionLabel()}
        </button>
      </div>
    </footer>
  )
}
