import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HistoryStep } from '@shared/history'
import { parseHistoryLines } from '@shared/history'
import { createInitialState } from '@shared/defaults'
import type { AppState } from '@shared/types'

function root(): string {
  return app.getPath('userData')
}

function workspacePath(): string {
  return join(root(), 'workspace.json')
}

function historyDir(): string {
  const dir = join(root(), 'history')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function historyPath(tabId: string): string {
  return join(historyDir(), `${tabId}.jsonl`)
}

/** Escreve em .tmp e renomeia: uma queda no meio da gravação não corrompe o arquivo. */
function writeAtomic(path: string, contents: string): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, contents, 'utf8')
  renameSync(tmp, path)
}

export function loadState(): AppState {
  try {
    const raw = readFileSync(workspacePath(), 'utf8')
    const parsed = JSON.parse(raw) as AppState
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return createInitialState()

    // nada transitório volta ligado depois de um fechamento inesperado
    parsed.transport = {
      ...parsed.transport,
      playing: false,
      blackout: false,
      frozen: false,
      startedAt: 0
    }

    // o monitor escolhido é lembrado, mas a transmissão nunca sobe sozinha:
    // abrir o app não pode jogar texto na tela do apresentador antes do
    // operador dizer que está pronto
    parsed.output = { ...parsed.output, enabled: false }
    if (!parsed.tabs.some((t) => t.id === parsed.activeTabId)) parsed.activeTabId = parsed.tabs[0].id
    return parsed
  } catch {
    return createInitialState()
  }
}

let pending: NodeJS.Timeout | null = null
let lastState: AppState | null = null

export function saveState(state: AppState, delayMs = 500): void {
  lastState = state
  if (pending) return
  pending = setTimeout(() => {
    pending = null
    flushState()
  }, delayMs)
}

export function flushState(): void {
  if (!lastState) return
  try {
    writeAtomic(workspacePath(), JSON.stringify(lastState, null, 2))
  } catch {
    // disco cheio ou permissão: não vale derrubar uma transmissão no ar por isso
  }
}

export function appendHistoryStep(tabId: string, step: HistoryStep): void {
  try {
    appendFileSync(historyPath(tabId), `${JSON.stringify(step)}\n`, 'utf8')
  } catch {
    // idem: histórico é conveniência, transmissão é prioridade
  }
}

export function loadHistorySteps(tabId: string): HistoryStep[] {
  try {
    return parseHistoryLines(readFileSync(historyPath(tabId), 'utf8').split('\n'))
  } catch {
    return []
  }
}
