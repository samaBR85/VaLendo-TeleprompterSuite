import { formatClock, secondsForWords } from '@shared/pacing'
import type { Segment } from '@shared/rundown'
import { Icon } from '../../ui/Icon'

interface Props {
  segments: Segment[]
  currentIndex: number
  ppm: number
  onSeek: (blockId: string) => void
}

const COLUNAS = '28px 1fr 70px 76px 84px 22px'

function StatusPill({ status }: { status: 'feito' | 'no-ar' | 'a-seguir' }): React.JSX.Element {
  const texto = status === 'no-ar' ? 'no ar' : status === 'feito' ? 'feito' : 'a seguir'
  const classe =
    status === 'no-ar'
      ? 'bg-[var(--color-go)]/16 text-[var(--color-go)]'
      : status === 'feito'
        ? 'text-[var(--color-fog-2)] opacity-60'
        : 'border border-[var(--color-line)] text-[var(--color-fog-2)]'
  return (
    <span data-status={status} className={`rounded-full px-2 py-0.5 text-center text-[10px] whitespace-nowrap ${classe}`}>
      {texto}
    </span>
  )
}

/**
 * A lista de trabalho da Mesa de comando: um trecho por linha, com o selo que
 * troca sozinho conforme a leitura passa por ele. Clicar numa linha salta a
 * leitura para lá — o mesmo salto de capítulo que já existe em outro lugar.
 */
export function Rundown({ segments, currentIndex, ppm, onSeek }: Props): React.JSX.Element {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="grid flex-none gap-2.5 border-b border-[var(--color-line)] px-4 py-2 font-mono text-[9px] tracking-[0.1em] text-[var(--color-fog-2)] uppercase"
        style={{ gridTemplateColumns: COLUNAS }}
      >
        <span>#</span>
        <span>Bloco</span>
        <span className="text-right">Palavras</span>
        <span className="text-right">Duração</span>
        <span>Status</span>
        <span />
      </div>

      <div data-rundown className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {segments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 text-[12px] text-[var(--color-fog-2)]">
            Nada para mostrar ainda — escreva o roteiro no Split.
          </div>
        ) : (
          segments.map((segment, index) => {
            const status = index < currentIndex ? 'feito' : index === currentIndex ? 'no-ar' : 'a-seguir'
            return (
              <button
                key={segment.blockId}
                type="button"
                data-rundown-row
                data-status={status}
                onClick={() => onSeek(segment.blockId)}
                className={`grid items-center gap-2.5 border-b border-[var(--color-line)]/60 px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-ink-2)] ${
                  status === 'no-ar' ? 'border-l-2 border-l-[var(--color-go)] bg-[var(--color-go)]/[0.06] pl-[14px]' : ''
                } ${status === 'feito' ? 'opacity-50' : ''}`}
                style={{ gridTemplateColumns: COLUNAS }}
              >
                <span className="font-mono text-[11px] text-[var(--color-fog-2)]">{index + 1}</span>
                <span className="truncate text-[13px] text-[var(--color-fog-0)]">
                  {segment.title || 'Sem capítulo'}
                </span>
                <span className="font-mono text-[11px] text-[var(--color-fog-2)] text-right">
                  {segment.spokenWords}
                </span>
                <span className="font-mono text-[12px] text-[var(--color-fog-1)] text-right">
                  {formatClock(secondsForWords(segment.rulerSpan, ppm))}
                </span>
                <StatusPill status={status} />
                <span className="flex items-center justify-center text-[var(--color-fog-2)]">
                  <Icon name="down" size={12} className="-rotate-90" />
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
