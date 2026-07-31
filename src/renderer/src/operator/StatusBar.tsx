import { useMemo, useState } from 'react'
import type { Action, HistoryInfo } from '@shared/actions'
import type { StorageHealth } from '@shared/api'
import { composeLines, totalWords } from '@shared/anchor'
import { formatClock, ppmForTarget, secondsForWords } from '@shared/pacing'
import { totalWordCount } from '@shared/text'
import type { AppState, LayoutMode, Tab } from '@shared/types'
import { Icon, type IconName } from '../ui/Icon'
import type { Chave } from '@shared/i18n'
import { useT } from '../i18n'
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

const MODOS: { mode: LayoutMode; icon: IconName; rotulo: 'mode.split' | 'mode.focus' | 'mode.deck' }[] = [
  { mode: 'split', icon: 'layoutSplit', rotulo: 'mode.split' },
  { mode: 'focus', icon: 'layoutFocus', rotulo: 'mode.focus' },
  { mode: 'deck', icon: 'layoutDeck', rotulo: 'mode.deck' }
]

/** Split, Foco e Mesa são jeitos de olhar para o mesmo roteiro, não documentos diferentes. */
function ModeSwitch({ mode, onChange }: { mode: LayoutMode; onChange: (mode: LayoutMode) => void }): React.JSX.Element {
  const { t } = useT()
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
          title={`${t(item.rotulo)} — ${t(`${item.rotulo}.hint` as Chave)}`}
          onClick={() => onChange(item.mode)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] transition-colors ${
            mode === item.mode
              ? 'bg-[var(--color-ink-3)] text-[var(--color-fog-0)]'
              : 'text-[var(--color-fog-2)] hover:text-[var(--color-fog-1)]'
          }`}
        >
          <Icon name={item.icon} size={15} />
          {t(item.rotulo)}
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
  const { t, tp, lang } = useT()
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
    <footer className="relative flex flex-none items-center border-t border-[var(--color-line)] bg-[var(--color-ink-1)] px-3 py-2 text-[11px]">
      <div className="flex items-center gap-4">
        {/* decorrido e restante saíram daqui: agora estão no mostrador da barra de
            cima, em corpo grande. Repetir os mesmos números em dois lugares só
            ensina o olho a não confiar em nenhum dos dois */}
        <Cell label={t('status.words')} value={spoken.toLocaleString(lang)} />
        <Cell label={t('status.duration')} value={formatClock(total)} />

        <label className="flex items-center gap-1.5">
          <span className="text-[var(--color-fog-2)]">{t('status.target')}</span>
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
      </div>

      {/* centralizado de verdade — `absolute` em vez de flex/auto-margin, para
          não depender de quanto os grupos dos dois lados pesam */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeSwitch mode={state.layoutMode} onChange={onModeChange} />
      </div>

      <div className="ml-auto flex items-center gap-4 text-[var(--color-fog-2)]">
        {/* dizer que está gravando é tão importante quanto dizer que falhou:
            sem o sinal positivo, silêncio e defeito têm a mesma cara */}
        <span
          data-storage
          style={storage.problem ? { color: 'var(--color-warn)' } : undefined}
          title={storage.problem ?? t('status.savedHint')}
        >
          {storage.problem ? t('status.notSaved') : t('status.saved')}
        </span>
        <span>{tp('status.markers', tab.markers.length)}</span>
        <span>{tp('status.undo', history.depth)}</span>
        <span>{t('status.paletteHint')}</span>
        <button
          type="button"
          onClick={onOpenCredits}
          title={t('app.credits')}
          className="tabular-nums hover:text-[var(--color-fog-0)]"
        >
          {versionLabel()}
        </button>
      </div>
    </footer>
  )
}
