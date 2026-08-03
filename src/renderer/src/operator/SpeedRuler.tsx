import { useRef } from 'react'
import {
  PPM_MAX,
  PPM_MIN,
  PPM_STEP,
  SEGMENT_COUNT,
  clampPpm,
  filledSegments,
  ppmFromFraction,
  segmentColor
} from '@shared/ruler'

interface Props {
  ppm: number
  onChange: (ppm: number) => void
}

const SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, index) => index)

/**
 * O ritmo como uma régua de barrinhas, preenchida até onde se clica.
 *
 * Ganha do slider por um motivo de operação: no slider é preciso achar e
 * acertar um botão de 13px antes de arrastar, e no meio de uma gravação isso é
 * a diferença entre um gesto e dois. Aqui a régua inteira é alvo — o ponto onde
 * se clica já é o valor.
 */
export function SpeedRuler({ ppm, onChange }: Props): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  // arrastando por conta própria, e não por `hasPointerCapture`: a captura pode
  // não pegar, e aí o arrasto pararia no meio sem nada avisar
  const arrastando = useRef(false)
  const acesas = filledSegments(ppm)

  const fromPointer = (clientX: number): void => {
    const box = trackRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    onChange(ppmFromFraction((clientX - box.left) / box.width))
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const salto = event.shiftKey ? PPM_STEP * 5 : PPM_STEP
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? ppm + salto
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? ppm - salto
          : event.key === 'Home'
            ? PPM_MIN
            : event.key === 'End'
              ? PPM_MAX
              : null

    if (next === null) return
    event.preventDefault()
    onChange(clampPpm(next))
  }

  return (
    <div
      ref={trackRef}
      data-speed-ruler
      role="slider"
      tabIndex={0}
      aria-label="Ritmo em palavras por minuto"
      aria-valuemin={PPM_MIN}
      aria-valuemax={PPM_MAX}
      aria-valuenow={ppm}
      onPointerDown={(event) => {
        arrastando.current = true
        try {
          // a captura é o que mantém o arrasto vivo quando o ponteiro sai da
          // régua; se o navegador recusar, o arrasto ainda funciona por dentro
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // ponteiro que não existe mais: segue sem captura
        }
        fromPointer(event.clientX)
      }}
      onPointerMove={(event) => {
        if (arrastando.current) fromPointer(event.clientX)
      }}
      onPointerUp={() => {
        arrastando.current = false
      }}
      onPointerCancel={() => {
        arrastando.current = false
      }}
      onPointerLeave={(event) => {
        // sem captura, o ponteiro que sai da régua não volta a mandar eventos
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) arrastando.current = false
      }}
      onWheel={(event) => {
        // roda para cima acelera. `deltaY` é negativo subindo, e um passo por
        // entalhe deixa a roda igual às setas — nada de dois ritmos diferentes
        // para a mesma intenção
        event.preventDefault()
        onChange(clampPpm(ppm + (event.deltaY < 0 ? PPM_STEP : -PPM_STEP)))
      }}
      onKeyDown={onKeyDown}
      className="flex w-full cursor-pointer touch-none items-center justify-between rounded py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-go)]"
    >
      {/* barrinhas de largura FIXA, espaçadas por `justify-between`: todas
          idênticas por construção, em qualquer largura de régua. Antes cada
          uma era `flex:1` pintada por dentro com um gradiente repetido de
          2px — e como a fração de pixel que sobrava para cada uma era
          diferente, cada barrinha cortava o padrão num ponto e a régua lia
          como um pente torto. Se a coluna mudar de largura outra vez, quem
          respira é o vão entre as barras, não a barra.

          A cor é por barrinha (`segmentColor`), e não um gradiente CSS único:
          o degrau aceso mais à direita sempre lê a cor do PRÓPRIO ritmo — do
          verde (devagar) ao vermelho (rápido) —, e não uma média do trecho.
          Dali em diante fica o cinza-esverdeado de VU desligado. */}
      {SEGMENTS.map((index) => (
        <div
          key={index}
          data-segment={index < acesas ? 'on' : 'off'}
          style={{
            width: 4,
            height: 9,
            flex: 'none',
            borderRadius: 1,
            background: index < acesas ? segmentColor(index) : '#2c3a33'
          }}
        />
      ))}
    </div>
  )
}
