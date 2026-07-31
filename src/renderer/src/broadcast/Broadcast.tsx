import { useEffect, useState } from 'react'
import { PrompterCanvas } from '../prompter/PrompterCanvas'
import { activeTabOf, useAppState } from '../state/useAppState'

/** A janela que o apresentador vê. Nada de interface: só o texto. */
export function Broadcast(): React.JSX.Element {
  const { state, rows, dispatch } = useAppState()
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [covering, setCovering] = useState(false)

  // informa ao main o viewport real desta janela: é o que faz a prévia do
  // operador ser réplica exata em vez de aproximação do tamanho do monitor
  useEffect(() => {
    const publish = (): void => {
      const size = { width: window.innerWidth, height: window.innerHeight }
      setViewport(size)
      dispatch({ type: 'output/viewport', ...size })
    }

    publish()
    window.addEventListener('resize', publish)
    return () => window.removeEventListener('resize', publish)
  }, [dispatch])

  // se a transmissão subiu no mesmo monitor do operador, ela cobriu a
  // interface inteira. O aviso some sozinho, mas dá tempo de aprender a saída
  useEffect(() => {
    let alive = true
    void window.valendo.coversOperator().then((value) => {
      if (!alive || !value) return
      setCovering(true)
      setTimeout(() => alive && setCovering(false), 8_000)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!state) return <div style={{ width: '100%', height: '100%', background: '#000' }} />

  const tab = activeTabOf(state)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <PrompterCanvas
        blocks={tab.blocks}
        appearance={tab.appearance}
        transport={state.transport}
        viewport={viewport}
        rows={rows}
        readingMark={tab.appearance.readingMarkOnOutput}
        // esta é a única janela que alimenta o vidro do teleprompter, e a
        // única que espelha e gira para compensá-lo
        outputTransforms
      />

      {covering ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '14px 20px',
            background: '#e24b4a',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: Math.max(15, viewport.height * 0.02),
            textAlign: 'center'
          }}
        >
          Esta transmissão está cobrindo a janela do operador. Clique com o botão direito aqui para
          trocar de monitor ou encerrar.
        </div>
      ) : null}
    </div>
  )
}
