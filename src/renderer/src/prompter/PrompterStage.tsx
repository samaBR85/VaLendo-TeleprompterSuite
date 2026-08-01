import { useEffect, useRef, useState } from 'react'
import { canvasBox } from '@shared/output'
import { PrompterCanvas, type PrompterMetrics, type Viewport } from './PrompterCanvas'
import type { Appearance, Block, Cartao, Transport } from '@shared/types'

interface Props {
  blocks: Block[]
  appearance: Appearance
  transport: Transport
  viewport: Viewport
  rows?: number[]
  /** linhas do limite da margem; só a prévia do operador as mostra */
  marginGuides?: boolean
  /** o cartão no ar, se houver */
  card?: Cartao | null
  /**
   * Roda do mouse sobre a prévia muda o ritmo: para cima acelera.
   *
   * Só aqui e na régua, e não na janela inteira — sobre o editor a roda tem de
   * continuar rolando o texto, que é o que ela faz em qualquer editor.
   */
  onSpeed?: (delta: 1 | -1) => void
  onMetrics?: (metrics: PrompterMetrics) => void
}

/**
 * Encaixa a saída em tamanho real dentro do espaço disponível na tela do
 * operador. O canvas nunca é redimensionado — só recebe `scale()`, para que a
 * prévia siga sendo o mesmo desenho da transmissão.
 */
export function PrompterStage(props: Props): React.JSX.Element {
  // `onSpeed` é da moldura, não do desenho: repassar sujaria o canvas com uma
  // prop que ele não usa
  const { onSpeed: _roda, ...semRoda } = props
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.1)

  // a prévia não gira, então a caixa que ela desenha é o palco em pé, e não a
  // forma do monitor: encaixar pela forma do monitor deixaria o texto girado
  // transbordando a moldura
  const desenho = canvasBox(props.appearance.rotation, props.viewport, false)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    const fit = (): void => {
      const { width, height } = box.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / desenho.width, height / desenho.height))
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [desenho.width, desenho.height])

  // o canvas fica em posição absoluta de propósito: `scale()` encolhe o desenho
  // mas não o tamanho de layout, então um canvas de 1920px em fluxo normal
  // estouraria a largura da janela e empurraria o inspetor para fora
  return (
    <div
      ref={boxRef}
      onWheel={
        props.onSpeed
          ? (event) => {
              event.preventDefault()
              props.onSpeed?.(event.deltaY < 0 ? 1 : -1)
            }
          : undefined
      }
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
          // contorno para o operador ver onde termina a área da saída, já que o
          // fundo do prompter e o fundo do painel costumam ser da mesma cor
          outline: `${Math.max(1, 1 / scale)}px solid var(--color-line)`
        }}
      >
        {/* na prévia a marca aparece sempre: é dela que o operador tira a
            referência de onde a leitura está, e escondê-la aqui seria esconder
            a informação de quem precisa dela.

            `previaDoOperador` fica aqui e não em quem chama porque este
            componente É a prévia — só o Split e a Mesa o usam, e nunca os dois
            ao mesmo tempo. Deixar a cargo de quem chama seria abrir a porta
            para um dia a transmissão herdar som. */}
        <PrompterCanvas {...semRoda} readingMark previaDoOperador />
      </div>
    </div>
  )
}
