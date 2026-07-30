import { useCallback, useEffect, useState } from 'react'
import type { Action, HistoryInfo } from '@shared/actions'
import type { AppState, DisplayInfo, Tab } from '@shared/types'

export interface AppBinding {
  state: AppState | null
  history: HistoryInfo
  displays: DisplayInfo[]
  /** fileiras medidas da aba ativa; a régua de rolagem compartilhada */
  rows: number[]
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
  const [rows, setRows] = useState<number[]>([])

  useEffect(() => {
    let alive = true

    void window.valendo.getState().then((snapshot) => {
      if (!alive) return
      setState(snapshot.state)
      setHistory(snapshot.history)
      setRows(snapshot.rows)
    })
    void window.valendo.listDisplays().then((list) => {
      if (alive) setDisplays(list)
    })

    const offState = window.valendo.onState((snapshot) => {
      setState(snapshot.state)
      setHistory(snapshot.history)
      // identidade estável quando nada mudou: a régua entra em useMemo e não
      // pode disparar recomposição a cada mensagem de estado
      setRows((previous) => (sameRows(previous, snapshot.rows) ? previous : snapshot.rows))
    })
    const offDisplays = window.valendo.onDisplays(setDisplays)

    return () => {
      alive = false
      offState()
      offDisplays()
    }
  }, [])

  const dispatch = useCallback((action: Action) => window.valendo.dispatch(action), [])

  return { state, history, displays, rows, dispatch }
}

function sameRows(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function activeTabOf(state: AppState): Tab {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]
}
