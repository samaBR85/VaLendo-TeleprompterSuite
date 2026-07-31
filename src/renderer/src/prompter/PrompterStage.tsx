import { useEffect, useRef, useState } from 'react'
import { PrompterCanvas, type PrompterMetrics, type Viewport } from './PrompterCanvas'
import type { Appearance, Block, Transport } from '@shared/types'

interface Props {
  blocks: Block[]
  appearance: Appearance
  transport: Transport
  viewport: Viewport
  rows?: number[]
  /** linhas do limite da margem; só a prévia do operador as mostra */
  marginGuides?: boolean
  onMetrics?: (metrics: PrompterMetrics) => void
}

/**
 * Encaixa a saída em tamanho real dentro do espaço disponível na tela do
 * operador. O canvas nunca é redimensionado — só recebe `scale()`, para que a
 * prévia siga sendo o mesmo desenho da transmissão.
 */
export function PrompterStage(props: Props): React.JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.1)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    const fit = (): void => {
      const { width, height } = box.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / props.viewport.width, height / props.viewport.height))
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [props.viewport.width, props.viewport.height])

  // o canvas fica em posição absoluta de propósito: `scale()` encolhe o desenho
  // mas não o tamanho de layout, então um canvas de 1920px em fluxo normal
  // estouraria a largura da janela e empurraria o inspetor para fora
  return (
    <div ref={boxRef} className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
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
            a informação de quem precisa dela */}
        <PrompterCanvas {...props} readingMark />
      </div>
    </div>
  )
}
