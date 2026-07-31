import { useCallback, useEffect, useState } from 'react'
import type { Action, HistoryInfo } from '@shared/actions'
import type { StorageHealth, WebviewInfo } from '@shared/api'
import type { AppState, DisplayInfo, Tab } from '@shared/types'

export interface AppBinding {
  state: AppState | null
  history: HistoryInfo
  displays: DisplayInfo[]
  /** fileiras medidas da aba ativa; a régua de rolagem compartilhada */
  rows: number[]
  /** o app está conseguindo gravar? */
  storage: StorageHealth
  /** endereços da página da rede local */
  webview: WebviewInfo
  dispatch: (action: Action) => void
}

const EMPTY_HISTORY: HistoryInfo = { canUndo: false, canRedo: false, depth: 0 }
const HEALTHY: StorageHealth = { problem: null, notice: null }
const SEM_REDE: WebviewInfo = { running: false, port: 0, addresses: [], error: null }

/**
 * Assina o estado do processo main. O renderer não guarda cópia própria de
 * nada que importe — só espelha o que o main manda.
 */
export function useAppState(): AppBinding {
  const [state, setState] = useState<AppState | null>(null)
  const [history, setHistory] = useState<HistoryInfo>(EMPTY_HISTORY)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [rows, setRows] = useState<number[]>([])
  const [storage, setStorage] = useState<StorageHealth>(HEALTHY)
  const [webview, setWebview] = useState<WebviewInfo>(SEM_REDE)

  useEffect(() => {
    let alive = true

    void window.valendo.getState().then((snapshot) => {
      if (!alive) return
      setState(snapshot.state)
      setHistory(snapshot.history)
      setRows(snapshot.rows)
      setStorage(snapshot.storage)
      setWebview(snapshot.webview)
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
      setStorage((previous) =>
        previous.problem === snapshot.storage.problem && previous.notice === snapshot.storage.notice
          ? previous
          : snapshot.storage
      )
      // identidade estável: sem isto o painel remontaria a cada mensagem
      setWebview((previous) =>
        previous.running === snapshot.webview.running &&
        previous.error === snapshot.webview.error &&
        previous.addresses.join() === snapshot.webview.addresses.join()
          ? previous
          : snapshot.webview
      )
    })
    const offDisplays = window.valendo.onDisplays(setDisplays)

    return () => {
      alive = false
      offState()
      offDisplays()
    }
  }, [])

  const dispatch = useCallback((action: Action) => window.valendo.dispatch(action), [])

  return { state, history, displays, rows, storage, webview, dispatch }
}

function sameRows(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function activeTabOf(state: AppState): Tab {
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]
}
