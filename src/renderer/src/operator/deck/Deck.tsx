import { useEffect, useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import type { Tab, Transport } from '@shared/types'
import type { PrompterMetrics, Viewport } from '../../prompter/PrompterCanvas'
import { PrompterStage } from '../../prompter/PrompterStage'
import { PanelHeader } from '../App'
import { Rundown } from './Rundown'
import { Timeline } from './Timeline'

interface Props {
  tab: Tab
  transport: Transport
  rows: number[]
  viewport: Viewport
  dispatch: (action: Action) => void
  onMetrics: (metrics: PrompterMetrics) => void
}

/**
 * O relógio da Mesa vive aqui dentro, à parte do relógio de rolagem de
 * verdade (que não usa `setInterval` nenhum, de propósito — ver `anchor.ts`).
 * Isto só precisa de uma posição aproximada a cada meio segundo para mover a
 * cabeça de leitura na linha do tempo; o mesmo padrão que o mostrador da
 * barra já usa, para não obrigar o app inteiro a remontar a cada tique.
 */
function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * A Mesa de comando: acompanhar um programa de vários blocos, não editá-lo.
 * Cada `§` do roteiro já é um trecho — nada novo para o operador escrever. A
 * duração de cada um sai da mesma régua que governa a rolagem de verdade
 * (`composeLines`), então o tempo mostrado aqui é o tempo que a leitura vai
 * levar, não uma conta à parte que pode divergir.
 */
export function Deck({ tab, transport, rows, viewport, dispatch, onMetrics }: Props): React.JSX.Element {
  const now = useNow()

  const lines = useMemo(
    () => composeLines(tab.blocks, tab.appearance, rows),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const segments = useMemo(() => buildRundown(tab.blocks, lines, tab.markers), [tab.blocks, lines, tab.markers])
  const totalRuler = totalWords(lines)
  const currentRuler = Math.min(totalRuler, Math.max(0, wordIndexAt(transport, now)))
  const currentIndex = segmentIndexAt(segments, currentRuler)

  const seek = (blockId: string): void => dispatch({ type: 'transport/seekAnchor', anchor: { blockId, wordOffset: 0 } })

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Timeline
        segments={segments}
        totalRuler={totalRuler}
        currentRuler={currentRuler}
        currentIndex={currentIndex}
        ppm={transport.ppm}
        onSeek={seek}
      />

      <div className="flex min-h-0 flex-1">
        <Rundown segments={segments} currentIndex={currentIndex} ppm={transport.ppm} onSeek={seek} />

        <div className="flex w-[300px] flex-none flex-col border-l border-[var(--color-line)]">
          <PanelHeader label="Prévia ao vivo" detail={`${viewport.width} × ${viewport.height}`} />
          <PrompterStage
            blocks={tab.blocks}
            appearance={tab.appearance}
            transport={transport}
            viewport={viewport}
            rows={rows}
            onMetrics={onMetrics}
          />
        </div>
      </div>
    </main>
  )
}
