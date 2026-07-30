import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { anchorFromWordIndex, composeLines, pixelFromAnchor, type Layout } from '@shared/anchor'
import { wordIndexAt } from '@shared/pacing'
import { chapterTitle } from '@shared/text'
import type { Appearance, Block, Transport } from '@shared/types'

export interface Viewport {
  width: number
  height: number
}

export interface PrompterMetrics {
  /** alguma linha composta não caberia na largura e o navegador dobrou */
  wrapping: boolean
  /** maior corpo de fonte em que nenhuma linha dobra */
  fitFontSize: number
  /** fileiras visuais de cada linha composta, na ordem */
  rows: number[]
}

interface Props {
  blocks: Block[]
  appearance: Appearance
  transport: Transport
  /** tamanho lógico da saída, em pixels reais do monitor de destino */
  viewport: Viewport
  /** fileiras medidas, vindas do main: main e renderer precisam da mesma régua */
  rows?: number[]
  onMetrics?: (metrics: PrompterMetrics) => void
}

/**
 * O mesmo componente desenha a janela da transmissão e a prévia do operador.
 *
 * A prévia roda no tamanho lógico do monitor de destino e só recebe um
 * `scale()` do container — por isso ela é réplica exata por construção, e não
 * por calibragem. Se um dia divergir, divergiu nas duas.
 */
export function PrompterCanvas({
  blocks,
  appearance,
  transport,
  viewport,
  rows,
  onMetrics
}: Props): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const geometry = useRef<Layout>([])
  const lastMetrics = useRef('')

  const rotated = appearance.rotation === 90 || appearance.rotation === 270
  const stage = rotated
    ? { width: viewport.height, height: viewport.width }
    : { width: viewport.width, height: viewport.height }

  const readingLineY = stage.height * appearance.readingLinePct

  const lines = useMemo(
    () => composeLines(blocks, appearance, rows),
    [blocks, appearance.minWords, appearance.maxWords, appearance.uniformSpeed, rows]
  )

  /** Mede o DOM depois do layout. A composição das linhas não muda aqui — só a geometria. */
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const measure = (): void => {
      const nodes = [...container.querySelectorAll<HTMLElement>('[data-line]')]
      geometry.current = lines.map((spec, index) => {
        const node = nodes[index]
        return { ...spec, top: node?.offsetTop ?? 0, height: node?.offsetHeight ?? 0 }
      })

      if (!onMetrics) return

      const style = getComputedStyle(container)
      const available =
        container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)

      // quantas fileiras visuais cada linha ocupou de fato. É a régua de
      // rolagem: uma linha que dobrou tem o dobro da altura e precisa custar o
      // dobro, senão o texto passa por ela no dobro da velocidade
      const rowHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize)
      const measuredRows = [...nodes].map((node) =>
        rowHeight > 0 ? Math.max(1, Math.round(node.offsetHeight / rowHeight)) : 1
      )

      // largura natural de cada linha, medida sem permitir dobra, contra a
      // largura útil: é assim que se descobre se a regra de palavras por linha
      // está sendo respeitada de fato ou só no papel
      const probes = container.querySelectorAll<HTMLElement>('[data-probe-line]')

      let widest = 0
      for (const probe of probes) widest = Math.max(widest, probe.offsetWidth)

      const wrapping = widest > available + 1
      const fitFontSize =
        widest > 0 ? Math.max(12, Math.floor((appearance.fontSize * available) / widest)) : appearance.fontSize

      const signature = `${wrapping}:${fitFontSize}:${measuredRows.join(',')}`
      if (signature === lastMetrics.current) return
      lastMetrics.current = signature
      onMetrics({ wrapping, fitFontSize, rows: measuredRows })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [
    lines,
    appearance.fontFamily,
    appearance.fontSize,
    appearance.fontWeight,
    appearance.lineHeight,
    appearance.letterSpacing,
    appearance.marginPct,
    appearance.align,
    stage.width,
    stage.height,
    onMetrics
  ])

  /**
   * Um `requestAnimationFrame` por janela, alimentado pelo relógio do main.
   * Nenhuma mensagem por frame: cada janela deriva a própria posição, então
   * não existe deriva entre a prévia e o que o apresentador lê.
   */
  useEffect(() => {
    let frame = 0

    const tick = (): void => {
      frame = requestAnimationFrame(tick)
      const container = scrollRef.current
      if (!container || transport.frozen) return

      const wordIndex = wordIndexAt(transport, Date.now())
      const anchor = anchorFromWordIndex(geometry.current, wordIndex)
      if (!anchor) return

      const y = pixelFromAnchor(geometry.current, anchor)
      if (y === null) return

      container.style.transform = `translate3d(0, ${(readingLineY - y).toFixed(2)}px, 0)`
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [transport, readingLineY])

  const mirror = `${appearance.mirrorX ? ' scaleX(-1)' : ''}${appearance.mirrorY ? ' scaleY(-1)' : ''}`

  return (
    <div
      style={{
        width: viewport.width,
        height: viewport.height,
        background: appearance.bgColor,
        position: 'relative',
        overflow: 'hidden',
        flex: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: stage.width,
          height: stage.height,
          overflow: 'hidden',
          transform: `translate(-50%, -50%) rotate(${appearance.rotation}deg)${mirror}`
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            maskImage: appearance.focusDim
              ? 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 12%, #000 30%, #000 52%, rgba(0,0,0,0.4) 78%, transparent 100%)'
              : undefined
          }}
        >
          <div
            ref={scrollRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              paddingLeft: `${appearance.marginPct}%`,
              paddingRight: `${appearance.marginPct}%`,
              paddingBottom: stage.height,
              willChange: 'transform',
              fontFamily: appearance.fontFamily,
              fontSize: appearance.fontSize,
              fontWeight: appearance.fontWeight,
              lineHeight: appearance.lineHeight,
              letterSpacing: `${appearance.letterSpacing}em`,
              color: appearance.textColor,
              textAlign: appearance.align
            }}
          >
            {lines.map((line, index) => (
              <div
                key={`${line.blockId}-${index}`}
                data-line
                style={
                  line.kind === 'direction'
                    ? { color: appearance.directionColor, fontStyle: 'italic', opacity: 0.9 }
                    : line.kind === 'chapter'
                      ? // sem mudar o tamanho da fonte nem acrescentar padding: a
                        // altura da linha precisa continuar igual à de uma linha
                        // comum, senão o peso em palavras atribuído a ela (em
                        // anchor.ts) some de proporção e a rolagem trava aqui
                        { letterSpacing: '0.2em', opacity: 0.6, textTransform: 'uppercase' }
                      : undefined
                }
              >
                {line.spacer
                  ? // espaço inquebrável: um div vazio teria altura zero, e a
                    // linha em branco do roteiro não apareceria na tela
                    ' '
                  : line.kind === 'chapter'
                    ? chapterTitle({ id: line.blockId, kind: 'chapter', text: line.text })
                    : line.text}
              </div>
            ))}

            {/* sonda de medição: as mesmas linhas sem permitir dobra, fora do
                fluxo, só para saber a largura natural de cada uma */}
            {onMetrics ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  visibility: 'hidden',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {lines.map((line, index) => (
                  <div
                    key={`probe-${index}`}
                    data-probe-line
                    style={
                      line.kind === 'direction'
                        ? { fontStyle: 'italic' }
                        : line.kind === 'chapter'
                          ? { letterSpacing: '0.2em', textTransform: 'uppercase' }
                          : undefined
                    }
                  >
                    {line.kind === 'chapter'
                      ? chapterTitle({ id: line.blockId, kind: 'chapter', text: line.text })
                      : line.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* marca de leitura: espessura proporcional ao viewport para continuar
            visível quando a prévia do operador reduz a escala, e cunhas nas
            laterais, que sobrevivem melhor à redução do que uma linha fina */}
        <div
          data-reading-mark
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: readingLineY,
            height: Math.max(2, stage.height * 0.004),
            background: appearance.directionColor,
            opacity: 0.5,
            pointerEvents: 'none'
          }}
        />
        {([0, 1] as const).map((side) => (
          <div
            key={side}
            style={{
              position: 'absolute',
              top: readingLineY,
              [side === 0 ? 'left' : 'right']: 0,
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: `${stage.height * 0.014}px solid transparent`,
              borderBottom: `${stage.height * 0.014}px solid transparent`,
              [side === 0 ? 'borderLeft' : 'borderRight']:
                `${stage.height * 0.016}px solid ${appearance.directionColor}`,
              pointerEvents: 'none'
            }}
          />
        ))}
      </div>

      {transport.blackout ? (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
      ) : null}

      {transport.frozen ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `${Math.max(3, viewport.height * 0.006)}px solid ${appearance.directionColor}`,
            pointerEvents: 'none',
            opacity: 0.7
          }}
        />
      ) : null}
    </div>
  )
}
