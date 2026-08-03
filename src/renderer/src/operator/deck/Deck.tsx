import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import type { Cartao, CardOverlayStyle, Tab, Transport } from '@shared/types'
import type { PrompterMetrics, Viewport } from '../../prompter/PrompterCanvas'
import { PrompterStage } from '../../prompter/PrompterStage'
import { useT } from '../../i18n'
import { PanelHeader } from '../App'
import { Rundown } from './Rundown'
import { Timeline } from './Timeline'

interface Props {
  tab: Tab
  transport: Transport
  /** o cartão no ar, para a prévia compacta mostrar o mesmo que a transmissão */
  card?: Cartao | null
  /** o interruptor "OVERLAY" — decide se o texto sobrepõe o cartão acima */
  cardOverlay?: { enabled: boolean; style: CardOverlayStyle }
  /** som do vídeo nesta prévia — o mesmo nível do resto do app */
  cardVolume?: number
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
const PREVIEW_MIN = 220
// A prévia pode crescer até sobrar só o espaço mínimo da lista à esquerda —
// não um teto fixo, que deixava largura vazia sem uso em janelas largas.
const RUNDOWN_MIN = 320
// Proporção de referência aprovada: prévia grande o bastante para ler o
// texto de longe, lista ainda com espaço para os números não apertarem.
const PREVIEW_DEFAULT_RATIO = 0.58

export function Deck({
  tab,
  transport,
  rows,
  viewport,
  card = null,
  cardOverlay,
  cardVolume,
  dispatch,
  onMetrics
}: Props): React.JSX.Element {
  const { t } = useT()
  const now = useNow()
  const corpoRef = useRef<HTMLDivElement>(null)
  const [previewWidth, setPreviewWidth] = useState(300)

  // Mede a área disponível assim que a Mesa monta, para nascer na proporção
  // de referência em vez de sempre nos mesmos 300px — antes de pintar, para
  // não piscar do valor pequeno para o certo.
  useLayoutEffect(() => {
    const box = corpoRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    const max = Math.max(PREVIEW_MIN, box.width - RUNDOWN_MIN)
    setPreviewWidth(Math.min(max, Math.max(PREVIEW_MIN, Math.round(box.width * PREVIEW_DEFAULT_RATIO))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Arrasta a divisória: o mesmo gesto que já redimensiona edição × transmissão no Split. */
  const startDrag = (): void => {
    const onMove = (event: MouseEvent): void => {
      const box = corpoRef.current?.getBoundingClientRect()
      if (!box) return
      const max = Math.max(PREVIEW_MIN, box.width - RUNDOWN_MIN)
      setPreviewWidth(Math.min(max, Math.max(PREVIEW_MIN, box.right - event.clientX)))
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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

      <div ref={corpoRef} className="flex min-h-0 flex-1">
        <Rundown segments={segments} currentIndex={currentIndex} ppm={transport.ppm} onSeek={seek} />

        <div
          data-deck-resizer
          onMouseDown={startDrag}
          className="w-1 flex-none cursor-col-resize bg-[var(--color-line)] hover:bg-[var(--color-fog-2)]"
        />

        <div data-deck-preview className="flex min-h-0 flex-none flex-col" style={{ width: previewWidth }}>
          <PanelHeader
            label={t('panel.livePreview')}
            cor="var(--color-live)"
            ponto
            detail={`${viewport.width} × ${viewport.height}`}
          />
          <PrompterStage
            blocks={tab.blocks}
            appearance={tab.appearance}
            transport={transport}
            viewport={viewport}
            rows={rows}
            card={card}
            cardOverlay={cardOverlay}
            cardVolume={cardVolume}
            onSpeed={(delta) => dispatch({ type: 'transport/nudgePpm', delta })}
            onMetrics={onMetrics}
          />
        </div>
      </div>
    </main>
  )
}
