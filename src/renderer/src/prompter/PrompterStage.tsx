import { useEffect, useRef, useState } from 'react'
import { canvasBox } from '@shared/output'
import { PrompterCanvas, type PrompterMetrics, type Viewport } from './PrompterCanvas'
import type { Apresentador, Appearance, Block, Cartao, CardOverlayStyle, Transport } from '@shared/types'

interface Props {
  blocks: Block[]
  /** quem fala este roteiro — a cor de cada um vem daqui */
  apresentadores?: Apresentador[]
  appearance: Appearance
  transport: Transport
  viewport: Viewport
  rows?: number[]
  /** linhas do limite da margem; só a prévia do operador as mostra */
  marginGuides?: boolean
  /** o cartão no ar, se houver */
  card?: Cartao | null
  /** o interruptor "OVERLAY" — decide se o texto sobrepõe o cartão acima */
  cardOverlay?: { enabled: boolean; style: CardOverlayStyle }
  /** nível do som do vídeo nesta prévia, 0 a 1 — preferência da máquina */
  cardVolume?: number
  /*
   * A roda do mouse mudava o ritmo só aqui, e agora vale na janela inteira —
   * o ouvinte mora em `App.tsx`, junto da regra de onde ela NÃO vale (editor,
   * modais, painéis que precisam rolar). Ter um `onWheel` próprio aqui faria
   * o mesmo giro contar duas vezes sobre a prévia.
   */
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
            a informação de quem precisa dela.

            `previaDoOperador` fica aqui e não em quem chama porque este
            componente É a prévia — só o Split e a Mesa o usam, e nunca os dois
            ao mesmo tempo. Deixar a cargo de quem chama seria abrir a porta
            para um dia a transmissão herdar som. */}
        <PrompterCanvas {...props} readingMark previaDoOperador />
      </div>
    </div>
  )
}
