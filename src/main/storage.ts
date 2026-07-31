import { app } from 'electron'
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import type { StorageHealth } from '@shared/api'
import type { HistoryStep } from '@shared/history'
import { parseHistoryLines } from '@shared/history'
import { createInitialState } from '@shared/defaults'
import { idiomaDoSistema } from '@shared/i18n'
import { mergeAppearance } from './mergeAppearance'
import type { UserDefaults } from './userDefaults'
import type { AppState } from '@shared/types'

export function userDataRoot(): string {
  return app.getPath('userData')
}

function workspacePath(): string {
  return join(userDataRoot(), 'workspace.json')
}

function historyDir(): string {
  const dir = join(userDataRoot(), 'history')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function historyPath(tabId: string): string {
  return join(historyDir(), `${tabId}.jsonl`)
}

/* ------------------------------------------------------------------ saúde */

let problem: string | null = null
let notice: string | null = null
let onHealthChange: (() => void) | null = null

export function storageHealth(): StorageHealth {
  return { problem, notice }
}

/** O main usa isto para reemitir o estado assim que a saúde muda. */
export function onStorageHealth(handler: () => void): void {
  onHealthChange = handler
}

/**
 * Registra o problema e avisa a interface.
 *
 * O `catch {}` que existia aqui antes é exatamente o que deixou o app rodar
 * meia hora sem gravar sem ninguém perceber. Falha de gravação agora aparece
 * na tela e fica no log, com o erro do sistema junto — sem isso, o próximo
 * caso vira de novo uma investigação de arqueologia por data de arquivo.
 */
export function reportStorageProblem(next: string | null): void {
  const changed = problem !== next
  problem = next
  if (next) log(next)
  if (changed) onHealthChange?.()
}

/** Fato consumado, não condição: fica na tela até o operador dispensar. */
export function reportStorageNotice(next: string): void {
  notice = next
  log(next)
  onHealthChange?.()
}

export function dismissStorageNotice(): void {
  if (notice === null) return
  notice = null
  onHealthChange?.()
}

function describe(error: unknown): string {
  const e = error as NodeJS.ErrnoException
  return e?.code ? `${e.code}: ${e.message}` : String(e?.message ?? error)
}

function log(message: string): void {
  try {
    appendFileSync(join(userDataRoot(), 'problemas.log'), `${new Date().toISOString()} ${message}\n`, 'utf8')
  } catch {
    // se nem o log grava, não há mais nada a fazer daqui de dentro
  }
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/* ---------------------------------------------------------------- leitura */

/**
 * Carrega o workspace, e nunca descarta em silêncio o que não conseguiu ler.
 *
 * Começar do zero é indistinguível, para quem está olhando, de "o app abriu
 * normal" — só que o roteiro sumiu. Se o arquivo existe e não dá para ler, ele
 * é guardado com outro nome e o operador é avisado.
 */
export function loadState(defaults: UserDefaults, locale = 'pt-BR'): AppState {
  const path = workspacePath()
  // só na instalação nova: a partir daí vale o que o operador escolheu, e
  // trocar o idioma do Windows não pode mexer no app já configurado
  const fresh = (): AppState => createInitialState(defaults, idiomaDoSistema(locale))

  if (!existsSync(path)) return fresh()

  let saved: Partial<AppState>
  try {
    saved = JSON.parse(readFileSync(path, 'utf8')) as Partial<AppState>
  } catch (error) {
    const backup = `${path}.ilegivel-${stamp()}`
    try {
      copyFileSync(path, backup)
    } catch {
      // a cópia é cortesia; o aviso é o que importa
    }
    reportStorageNotice(
      `Não deu para ler o trabalho gravado (${describe(error)}). Abri um roteiro novo e guardei o anterior em ${backup}.`
    )
    return fresh()
  }

  if (!Array.isArray(saved.tabs) || saved.tabs.length === 0) return fresh()

  try {
    // completa por cima dos padrões: um workspace gravado por versão anterior
    // não tem os campos que vieram depois, e um booleano ausente viraria
    // `false` — o app assumiria o oposto do padrão sem avisar
    const state: AppState = { ...fresh(), ...saved } as AppState

    // nada transitório volta ligado depois de um fechamento inesperado
    state.transport = {
      ...state.transport,
      playing: false,
      blackout: false,
      card: null,
      frozen: false,
      startedAt: 0
    }

    // o monitor escolhido é lembrado, mas a transmissão nunca sobe sozinha:
    // abrir o app não pode jogar texto na tela do apresentador antes do
    // operador dizer que está pronto
    state.output = { ...state.output, enabled: false }

    // e o roteiro não vai para a rede sozinho, pelo mesmo motivo: pôr o texto
    // ao alcance de quem estiver no wi-fi é uma decisão do operador
    state.webview = { enabled: false }
    if (!state.tabs.some((t) => t.id === state.activeTabId)) state.activeTabId = state.tabs[0].id

    state.tabs = state.tabs.map((tab) => ({
      ...tab,
      appearance: mergeAppearance(tab.appearance)
    }))

    return state
  } catch (error) {
    reportStorageNotice(`O trabalho gravado veio quebrado (${describe(error)}). Abri um roteiro novo.`)
    return fresh()
  }
}

/* ----------------------------------------------------------------- escrita */

/** Escreve em .tmp e renomeia: uma queda no meio da gravação não corrompe o arquivo. */
function writeAtomic(path: string, contents: string): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, contents, 'utf8')
  renameSync(tmp, path)
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
    reportStorageProblem(null)
  } catch (error) {
    reportStorageProblem(
      `Não estou conseguindo salvar em ${workspacePath()} (${describe(error)}). O que você escrever agora pode se perder ao fechar.`
    )
  }
}

export function appendHistoryStep(tabId: string, step: HistoryStep): void {
  try {
    appendFileSync(historyPath(tabId), `${JSON.stringify(step)}\n`, 'utf8')
  } catch {
    // histórico é conveniência, transmissão é prioridade: não vale interromper
    // quem está no ar por causa do desfazer
  }
}

export function loadHistorySteps(tabId: string): HistoryStep[] {
  let path: string
  let lines: string[]
  try {
    path = historyPath(tabId)
    lines = readFileSync(path, 'utf8').split('\n')
  } catch {
    return []
  }

  const steps = parseHistoryLines(lines)

  // compacta o que a releitura já descartou: enquanto um passo coalesce ele é
  // regravado inteiro a cada mudança, e sem isto o arquivo cresce ao quadrado —
  // meia hora de trabalho virou 2 MB para 484 passos
  const gravadas = lines.filter((line) => line.trim()).length
  if (steps.length < gravadas) {
    try {
      writeAtomic(path, steps.map((step) => `${JSON.stringify(step)}\n`).join(''))
    } catch {
      // compactar é economia, não correção: o desfazer já está certo em memória
    }
  }

  return steps
}
