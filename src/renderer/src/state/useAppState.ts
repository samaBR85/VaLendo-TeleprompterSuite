import { useCallback, useEffect, useState } from 'react'
import type { Action, HistoryInfo } from '@shared/actions'
import type { AppState, DisplayInfo, Tab } from '@shared/types'

export interface AppBinding {
  state: AppState | null
  history: HistoryInfo
  displays: DisplayInfo[]
  dispatch: (action: Action) => void
}

const EMPTY_HISTORY: HistoryInfo = { canUndo: false, canRedo: false, depth: 0 }

/**
 * Assina o estado do processo main. O renderer não guarda cópia própria de
 * nada que importe — só espelha o que o main manda.
 */
export function useAppState(): AppBinding {
  const [state, setState] = useState<AppState | null>(null)
  const [history, setHistory] = useState<HistoryInfo>(EMPTY_HISTORY)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

  useEffect(() => {
    let alive = true

    void window.valendo.getState().then((snapshot) => {
      if (!alive) return
      setState(snapshot.state)
      setHistory(snapshot.history)
    })
    void window.valendo.listDisplays().then((list) => {
      if (alive) setDisplays(list)
    })

    const offState = window.valendo.onState((snapshot) => {
      setState(snapshot.state)
      setHistory(snapshot.history)
    })
    const offDisplays = window.valendo.onDisplays(setDisplays)

    return () => {
      alive = false
      offState()
      offDisplays()
    }
  }, [])

  const dispatch = useCallback((action: Action) => window.valendo.dispatch(action), [])

  return { state, history, displays, dispatch }
}

export function activeTabOf(state: AppState): Tab {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]
}
