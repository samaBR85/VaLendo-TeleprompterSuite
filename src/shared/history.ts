import { applyPatches, enablePatches, produceWithPatches, type Objectish, type Patch } from 'immer'

enablePatches()

export interface HistoryStep {
  /**
   * Identidade do passo, estável enquanto ele coalesce.
   *
   * Existe por causa do disco: um passo que ainda está crescendo é gravado
   * inteiro a cada mudança, então o arquivo tem várias linhas do mesmo passo,
   * cada uma maior que a anterior. Sem o id, reabrir o app transformava um
   * arrasto de slider em dezenas de passos de desfazer — e os primeiros
   * Ctrl+Z não mudavam nada visível, porque desfaziam versões parciais.
   */
  id: string
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
  private seq = 0

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

    // o id carrega o instante para não colidir com o de outra sessão: o
    // arquivo é acumulado entre aberturas do app, e dois passos com o mesmo id
    // seriam mesclados num só ao reler
    const step: HistoryStep = {
      id: `${now.toString(36)}${(this.seq++).toString(36)}`,
      at: now,
      label,
      patches: [...patches],
      inverse: [...inverse]
    }
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

/**
 * Relê o histórico gravado, com a última versão de cada passo.
 *
 * O arquivo é só-append: enquanto um passo coalesce, ele é regravado inteiro a
 * cada mudança, e a linha mais nova contém tudo o que as anteriores tinham.
 * Aqui a última vence, na posição em que apareceu pela primeira vez — é o que
 * faz um arrasto de slider voltar a ser um Ctrl+Z, e não trinta.
 */
export function parseHistoryLines(lines: string[]): HistoryStep[] {
  const byId = new Map<string, HistoryStep>()
  let anonymous = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed) as HistoryStep
      if (!Array.isArray(parsed.patches) || !Array.isArray(parsed.inverse)) continue
      // arquivo de versão anterior não tem id: cada linha continua valendo por
      // si, que é o comportamento que aquele arquivo já tinha
      byId.set(typeof parsed.id === 'string' ? parsed.id : `sem-id-${anonymous++}`, parsed)
    } catch {
      // linha truncada por queda de energia: ignora e segue
    }
  }

  return [...byId.values()]
}
