import { useEffect, useMemo, useState } from 'react'
import type { Action, HistoryInfo } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { formatClock, ppmForTarget, secondsForWords, wordIndexAt } from '@shared/pacing'
import { totalWordCount } from '@shared/text'
import type { AppState, Tab } from '@shared/types'
import { versionLabel } from '../ui/Wordmark'

interface Props {
  state: AppState
  tab: Tab
  history: HistoryInfo
  dispatch: (action: Action) => void
  onOpenCredits: () => void
}

function useNow(intervalMs = 400): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
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

export function StatusBar({ state, tab, history, dispatch, onOpenCredits }: Props): React.JSX.Element {
  const now = useNow()
  const [target, setTarget] = useState('')

  // "Palavras" é a contagem de fala de verdade. A régua de rolagem é outra
  // coisa: inclui o peso das linhas de direção e capítulo, que não são ditas
  // mas ocupam tempo de tela — por isso alimenta os tempos, não a contagem
  const spoken = useMemo(() => totalWordCount(tab.blocks), [tab.blocks])
  const ruler = useMemo(
    () => totalWords(composeLines(tab.blocks, tab.appearance)),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed]
  )

  const readWords = Math.min(ruler, Math.max(0, wordIndexAt(state.transport, now)))
  const total = secondsForWords(ruler, state.transport.ppm)
  const elapsed = secondsForWords(readWords, state.transport.ppm)

  const applyTarget = (): void => {
    const seconds = parseDuration(target)
    if (seconds && ruler > 0) dispatch({ type: 'transport/ppm', ppm: Math.round(ppmForTarget(ruler, seconds)) })
    setTarget('')
  }

  return (
    <footer className="flex flex-none items-center gap-4 border-t border-[var(--color-line)] bg-[var(--color-ink-1)] px-3 py-1.5 text-[11px]">
      <Cell label="Palavras" value={spoken.toLocaleString('pt-BR')} />
      <Cell label="Duração" value={formatClock(total)} />
      <Cell label="No ar" value={formatClock(elapsed)} tone="var(--color-fog-0)" />
      <Cell label="Resta" value={formatClock(total - elapsed)} tone="var(--color-warn)" />

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
