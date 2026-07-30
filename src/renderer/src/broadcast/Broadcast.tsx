import { useEffect, useState } from 'react'
import { PrompterCanvas } from '../prompter/PrompterCanvas'
import { activeTabOf, useAppState } from '../state/useAppState'

/** A janela que o apresentador vê. Nada de interface: só o texto. */
export function Broadcast(): React.JSX.Element {
  const { state, dispatch } = useAppState()
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })

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

  if (!state) return <div style={{ width: '100%', height: '100%', background: '#000' }} />

  const tab = activeTabOf(state)

  return (
    <PrompterCanvas
      blocks={tab.blocks}
      appearance={tab.appearance}
      transport={state.transport}
      viewport={viewport}
    />
  )
}
