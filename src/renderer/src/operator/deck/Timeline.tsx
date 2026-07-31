import { formatClock, secondsForWords } from '@shared/pacing'
import type { RundownMarker, Segment } from '@shared/rundown'
import { useT } from '../../i18n'

interface Props {
  segments: Segment[]
  /** régua do documento inteiro — a soma de todo `rulerSpan` */
  totalRuler: number
  /** posição da leitura agora, na mesma unidade de régua */
  currentRuler: number
  currentIndex: number
  ppm: number
  onSeek: (blockId: string) => void
}

/**
 * Cores só para diferenciar um trecho do vizinho — não carregam sentido, ao
 * contrário do verde e do vermelho que o resto do app reserva para "pode ir" e
 * "no ar". São as mesmas quatro cores já usadas para identificar aba.
 */
const SEGMENT_COLORS = ['#378ADD', '#7F77DD', '#D4537E', '#1D9E75']

/** Marcação de tempo com um passo "redondo", para não empilhar números demais numa régua curta. */
const STEP_CANDIDATES = [15, 30, 60, 120, 300, 600, 900, 1800]

function niceStep(totalSeconds: number): number {
  for (const step of STEP_CANDIDATES) {
    if (totalSeconds / step <= 8) return step
  }
  return STEP_CANDIDATES[STEP_CANDIDATES.length - 1]
}

function pct(value: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.min(100, Math.max(0, (value / total) * 100))}%`
}

/**
 * A linha do tempo do programa: um trecho por capítulo, largura proporcional
 * à duração no ritmo atual, com a cabeça de leitura de verdade correndo por
 * cima — não um resumo, o mesmo relógio que move a marca de leitura na tela.
 */
export function Timeline({ segments, totalRuler, currentRuler, currentIndex, ppm, onSeek }: Props): React.JSX.Element {
  const { t } = useT()
  const totalSeconds = secondsForWords(totalRuler, ppm)
  const step = niceStep(totalSeconds)
  const marcas: number[] = []
  for (let t = 0; t <= totalSeconds + 0.001; t += step) marcas.push(t)

  return (
    <div data-timeline className="flex flex-none flex-col gap-1.5 border-b border-[var(--color-line)] px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--color-fog-2)] uppercase">
          {t('deck.timeline')}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-fog-2)]">
          <span className="text-[var(--color-fog-0)]">{formatClock(secondsForWords(currentRuler, ppm))}</span> de{' '}
          <span className="text-[var(--color-fog-0)]">{formatClock(totalSeconds)}</span>
        </span>
      </div>

      <div
        data-timeline-track
        className="relative flex h-14 overflow-hidden rounded-lg"
        style={{ opacity: totalRuler > 0 ? 1 : 0.4 }}
      >
        {totalRuler <= 0 ? (
          <div className="flex w-full items-center justify-center text-[11px] text-[var(--color-fog-2)]">
            sem capítulos para mostrar
          </div>
        ) : (
          segments.map((segment, index) => (
            <button
              key={segment.blockId}
              type="button"
              data-segment
              onClick={() => onSeek(segment.blockId)}
              title={`${segment.title || 'Sem capítulo'} · ${formatClock(secondsForWords(segment.rulerSpan, ppm))}`}
              className="relative flex flex-none flex-col justify-center overflow-hidden border-r border-black/30 px-2.5 text-left last:border-r-0"
              style={{
                width: pct(segment.rulerSpan, totalRuler),
                background: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                filter: index < currentIndex ? 'saturate(0.4) brightness(0.6)' : undefined
              }}
            >
              <span className="truncate text-[12px] font-medium text-white/95">
                {segment.title || 'Sem capítulo'}
              </span>
              <span className="font-mono text-[10px] text-white/70">
                {formatClock(secondsForWords(segment.rulerSpan, ppm))}
              </span>

              {segment.markers.map((marker: RundownMarker) => (
                <span
                  key={marker.marker.id}
                  data-marker-pin
                  title={marker.marker.label}
                  className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white/55"
                  style={{ left: pct(marker.rulerStart - segment.rulerStart, segment.rulerSpan) }}
                />
              ))}
            </button>
          ))
        )}

        {totalRuler > 0 ? (
          <div
            data-playhead
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[var(--color-go)] shadow-[0_0_8px_rgba(93,202,165,0.7)] transition-[left] duration-200 ease-linear"
            style={{ left: pct(currentRuler, totalRuler) }}
          />
        ) : null}
      </div>

      {totalRuler > 0 ? (
        <div className="relative h-3.5 text-[9px] text-[var(--color-fog-2)]">
          {marcas.map((t) => (
            <span
              key={t}
              className="absolute font-mono"
              style={{ left: `${(t / totalSeconds) * 100}%`, transform: t === 0 ? undefined : 'translateX(-50%)' }}
            >
              {formatClock(t)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
