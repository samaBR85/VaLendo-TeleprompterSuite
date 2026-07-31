import { useEffect, useRef, useState } from 'react'
import type { WebviewFrame } from '@shared/api'
import { canvasBox } from '@shared/output'
import { idiomaDoSistema, traduzir } from '@shared/i18n'
import { PrompterCanvas } from '../prompter/PrompterCanvas'

const PADRAO = { width: 1_920, height: 1_080 }

/**
 * A mesma leitura, para quem está na gravação.
 *
 * Desenha com o mesmo `PrompterCanvas` da transmissão, no viewport real da
 * saída, e só encolhe com `scale()` — pelo mesmo motivo da prévia do operador:
 * réplica por construção, e não por calibragem.
 */
export function Webview(): React.JSX.Element {
  const [quadro, setQuadro] = useState<WebviewFrame | null>(null)
  const [ligado, setLigado] = useState(false)
  const [tela, setTela] = useState({ width: window.innerWidth, height: window.innerHeight })
  /**
   * Diferença entre o relógio de quem transmite e o deste aparelho.
   *
   * O celular de quem assiste pode estar minutos adiantado; o relógio de
   * rolagem é uma hora absoluta, então sem esse acerto a leitura apareceria em
   * outro ponto do roteiro.
   */
  const desvio = useRef(0)

  useEffect(() => {
    const fonte = new EventSource('/estado')

    fonte.onmessage = (evento) => {
      const recebido = JSON.parse(evento.data) as WebviewFrame
      desvio.current = recebido.now - Date.now()
      setQuadro(recebido)
      setLigado(true)
    }
    fonte.onerror = () => setLigado(false)

    const aoRedimensionar = (): void =>
      setTela({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', aoRedimensionar)

    return () => {
      fonte.close()
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [])

  // antes do primeiro quadro não há idioma vindo do app ainda, então a
  // página cai no idioma do próprio aparelho de quem abriu — depois disso
  // vale o que o operador escolheu
  const idioma = quadro?.language ?? idiomaDoSistema(navigator.language)

  if (!quadro) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7e858d',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 15
        }}
      >
        {traduzir(idioma, 'web.waiting')}
      </div>
    )
  }

  const viewport = quadro.viewport ?? PADRAO
  // esta página é de conferência: quem acompanha pelo celular lê direto da
  // tela, sem o vidro do teleprompter no caminho, então nada de girar nem
  // espelhar aqui — e a caixa a encaixar é o palco em pé, não o monitor
  const desenho = canvasBox(quadro.appearance.rotation, viewport, false)
  const escala = Math.min(tela.width / desenho.width, tela.height / desenho.height)

  // o relógio da rolagem é absoluto; corrigido, o texto sobe aqui no mesmo
  // instante em que sobe na tela do apresentador
  const transport = { ...quadro.transport, startedAt: quadro.transport.startedAt - desvio.current }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${escala})`,
          transformOrigin: 'center'
        }}
      >
        <PrompterCanvas
          blocks={quadro.blocks}
          appearance={quadro.appearance}
          transport={transport}
          viewport={viewport}
          rows={quadro.rows}
          card={quadro.card}
          cardBaseUrl="/cartao/"
          // quem assiste vê o que o apresentador vê, marca inclusive
          readingMark={quadro.appearance.readingMarkOnOutput}
        />
      </div>

      {!ligado ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '5px 12px',
            borderRadius: 6,
            background: 'rgba(226,75,74,0.9)',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13
          }}
        >
          {traduzir(idioma, 'web.offline')}
        </div>
      ) : null}
    </div>
  )
}
