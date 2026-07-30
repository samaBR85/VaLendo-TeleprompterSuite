import { applyPatches, enablePatches, produceWithPatches, type Objectish, type Patch } from 'immer'

enablePatches()

export interface HistoryStep {
  at: number
  label: string
  patches: Patch[]
  inverse: Patch[]
}

/**
 * Desfazer infinito por patches.
 *
 * Sem limite de pilha, e cada passo é pequeno o suficiente para ser gravado em
 * `history/<id>.jsonl` — é isso que faz o histórico sobreviver a fechar o app.
 * Digitação contínua coalesce numa janela de tempo para não virar um passo por
 * tecla.
 */
export class History<T extends Objectish> {
  private past: HistoryStep[] = []
  private future: HistoryStep[] = []

  constructor(private readonly coalesceMs = 400) {}

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  get depth(): number {
    return this.past.length
  }

  /** Aplica a mudança e devolve `[novoEstado, passoGravável]`. */
  apply(state: T, label: string, recipe: (draft: T) => void, now: number): [T, HistoryStep | null] {
    const [next, patches, inverse] = produceWithPatches(state, recipe)
    if (patches.length === 0) return [state, null]

    this.future = []
    const last = this.past[this.past.length - 1]

    if (last && last.label === label && now - last.at <= this.coalesceMs) {
      last.patches.push(...patches)
      last.inverse.unshift(...inverse)
      last.at = now
      return [next as T, last]
    }

    const step: HistoryStep = { at: now, label, patches: [...patches], inverse: [...inverse] }
    this.past.push(step)
    return [next as T, step]
  }

  undo(state: T): T {
    const step = this.past.pop()
    if (!step) return state
    this.future.push(step)
    return applyPatches(state, step.inverse)
  }

  redo(state: T): T {
    const step = this.future.pop()
    if (!step) return state
    this.past.push(step)
    return applyPatches(state, step.patches)
  }

  /** Recarrega a pilha vinda do disco. Refazer não sobrevive ao reinício. */
  restore(steps: HistoryStep[]): void {
    this.past = steps
    this.future = []
  }

  serialize(): string[] {
    return this.past.map((step) => JSON.stringify(step))
  }
}

export function parseHistoryLines(lines: string[]): HistoryStep[] {
  const steps: HistoryStep[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed) as HistoryStep
      if (Array.isArray(parsed.patches) && Array.isArray(parsed.inverse)) steps.push(parsed)
    } catch {
      // linha truncada por queda de energia: ignora e segue
    }
  }
  return steps
}
