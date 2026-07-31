export type CommandGroup =
  | 'Transporte'
  | 'Ritmo'
  | 'Marcadores'
  | 'Aparência'
  | 'Saída'
  | 'Documento'
  | 'Visão'

export interface CommandSpec {
  id: string
  group: CommandGroup
  defaultBinding: string
  /** não aparece na paleta; só existe para o atalho */
  hidden?: boolean
}

/*
 * O rótulo não mora aqui: sai do dicionário pela chave `cmd.<id>`, via
 * `rotuloDoComando()` em `i18n/index.ts`. Guardar o texto junto do comando
 * obrigaria este registro a existir seis vezes, uma por idioma.
 */

export interface Binding {
  /** Ctrl no Windows/Linux, Cmd no macOS */
  mod: boolean
  alt: boolean
  shift: boolean
  key: string
}

/**
 * Registro único de comandos. Dele saem, de graça, os atalhos, a paleta Ctrl+K
 * e o editor de teclas — em vez de `keydown` espalhado pela interface.
 *
 * A regra das teclas: a base é a coisa principal, e o Shift é a VARIANTE DELA.
 * `Mod+S` salva o projeto e `Mod+Shift+S` salva só o roteiro, porque o projeto
 * contém o roteiro — e casa com `Mod+O`, que já abre projeto. Onde a base e o
 * Shift eram famílias diferentes (marcador e espelho dividindo o M, abrir
 * projeto e ligar transmissão dividindo o O), a segunda saiu para `Mod+Alt` ou
 * para uma tecla própria: o Shift prometia parentesco que não existia.
 */
export const COMMANDS: CommandSpec[] = [
  { id: 'transport.playPause', group: 'Transporte', defaultBinding: 'Space' },
  { id: 'transport.restart', group: 'Transporte', defaultBinding: 'Mod+Home' },
  { id: 'transport.jumpBack', group: 'Transporte', defaultBinding: 'ArrowUp' },
  { id: 'transport.jumpForward', group: 'Transporte', defaultBinding: 'ArrowDown' },
  { id: 'transport.freeze', group: 'Transporte', defaultBinding: 'Mod+Shift+F' },

  { id: 'speed.increase', group: 'Ritmo', defaultBinding: 'ArrowRight' },
  { id: 'speed.decrease', group: 'Ritmo', defaultBinding: 'ArrowLeft' },
  { id: 'speed.set.1', group: 'Ritmo', defaultBinding: 'Mod+Alt+1' },
  { id: 'speed.set.2', group: 'Ritmo', defaultBinding: 'Mod+Alt+2' },
  { id: 'speed.set.3', group: 'Ritmo', defaultBinding: 'Mod+Alt+3' },

  { id: 'marker.create', group: 'Marcadores', defaultBinding: 'Mod+M' },
  { id: 'marker.next', group: 'Marcadores', defaultBinding: 'Mod+ArrowDown' },
  { id: 'marker.prev', group: 'Marcadores', defaultBinding: 'Mod+ArrowUp' },
  { id: 'chapter.next', group: 'Marcadores', defaultBinding: 'Mod+Shift+ArrowDown' },
  { id: 'chapter.prev', group: 'Marcadores', defaultBinding: 'Mod+Shift+ArrowUp' },

  { id: 'font.increase', group: 'Aparência', defaultBinding: 'Mod+=' },
  { id: 'font.decrease', group: 'Aparência', defaultBinding: 'Mod+-' },
  { id: 'margin.increase', group: 'Aparência', defaultBinding: 'Mod+Shift+=' },
  { id: 'margin.decrease', group: 'Aparência', defaultBinding: 'Mod+Shift+-' },
  { id: 'words.increase', group: 'Aparência', defaultBinding: 'Alt+=' },
  { id: 'words.decrease', group: 'Aparência', defaultBinding: 'Alt+-' },
  { id: 'colors.invert', group: 'Aparência', defaultBinding: 'Mod+I' },

  { id: 'output.blackout', group: 'Saída', defaultBinding: 'Mod+B' },
  { id: 'output.mirror', group: 'Saída', defaultBinding: 'Mod+Alt+M' },
  { id: 'output.rotate', group: 'Saída', defaultBinding: 'Mod+Alt+R' },
  { id: 'output.toggle', group: 'Saída', defaultBinding: 'Mod+Enter' },
  { id: 'card.hide', group: 'Saída', defaultBinding: 'Mod+Shift+0' },

  { id: 'document.save', group: 'Documento', defaultBinding: 'Mod+Shift+S' },
  { id: 'document.saveAs', group: 'Documento', defaultBinding: 'Mod+Alt+S' },
  { id: 'project.save', group: 'Documento', defaultBinding: 'Mod+S' },
  { id: 'project.open', group: 'Documento', defaultBinding: 'Mod+O' },
  { id: 'insert.chapter', group: 'Documento', defaultBinding: 'Mod+Shift+C' },
  { id: 'insert.direction', group: 'Documento', defaultBinding: 'Mod+Shift+D' },
  { id: 'edit.undo', group: 'Documento', defaultBinding: 'Mod+Z' },
  { id: 'edit.redo', group: 'Documento', defaultBinding: 'Mod+Shift+Z' },
  { id: 'tab.new', group: 'Documento', defaultBinding: 'Mod+T' },
  { id: 'tab.close', group: 'Documento', defaultBinding: 'Mod+W' },

  { id: 'view.focusMode', group: 'Visão', defaultBinding: 'F11' },
  { id: 'view.inspector', group: 'Visão', defaultBinding: 'F5' },
  { id: 'view.split', group: 'Visão', defaultBinding: 'F6' },
  { id: 'view.focus', group: 'Visão', defaultBinding: 'F7' },
  { id: 'view.deck', group: 'Visão', defaultBinding: 'F8' },
  { id: 'palette.open', group: 'Visão', defaultBinding: 'Mod+K' },
  { id: 'keymap.open', group: 'Visão', defaultBinding: 'Mod+,' }
]

for (let n = 1; n <= 10; n += 1) {
  COMMANDS.push({
    id: `tab.switch.${n}`,
    group: 'Documento',
    defaultBinding: `Mod+${n === 10 ? 0 : n}`,
    hidden: true
  })
}

// um por cartão: seis é o que cabe no painel e o que a mão alcança sem olhar
for (let n = 1; n <= 6; n += 1) {
  COMMANDS.push({
    id: `card.show.${n}`,
    group: 'Saída',
    defaultBinding: `Mod+Shift+${n}`,
    hidden: true
  })
}

for (let n = 1; n <= 9; n += 1) {
  COMMANDS.push({
    id: `marker.goto.${n}`,
    group: 'Marcadores',
    defaultBinding: `Alt+${n}`,
    hidden: true
  })
}

export const COMMANDS_BY_ID = new Map(COMMANDS.map((c) => [c.id, c]))

const NAMED_KEYS = new Set([
  'Space', 'Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Home', 'End',
  'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
])

function normalizeKey(raw: string): string {
  if (raw === ' ') return 'Space'
  const named = [...NAMED_KEYS].find((k) => k.toLowerCase() === raw.toLowerCase())
  if (named) return named
  return raw.length === 1 ? raw.toUpperCase() : raw
}

export function parseBinding(text: string): Binding | null {
  const parts = text.split('+').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const binding: Binding = { mod: false, alt: false, shift: false, key: '' }
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'mod' || lower === 'ctrl' || lower === 'cmd' || lower === 'control') binding.mod = true
    else if (lower === 'alt' || lower === 'option') binding.alt = true
    else if (lower === 'shift') binding.shift = true
    else binding.key = normalizeKey(part)
  }
  return binding.key ? binding : null
}

export function formatBinding(binding: Binding, isMac: boolean): string {
  const parts: string[] = []
  if (binding.mod) parts.push(isMac ? 'Cmd' : 'Ctrl')
  if (binding.alt) parts.push(isMac ? 'Option' : 'Alt')
  if (binding.shift) parts.push('Shift')
  parts.push(binding.key)
  return parts.join('+')
}

export function serializeBinding(binding: Binding): string {
  const parts: string[] = []
  if (binding.mod) parts.push('Mod')
  if (binding.alt) parts.push('Alt')
  if (binding.shift) parts.push('Shift')
  parts.push(binding.key)
  return parts.join('+')
}

export function bindingsEqual(a: Binding, b: Binding): boolean {
  return a.mod === b.mod && a.alt === b.alt && a.shift === b.shift && a.key.toLowerCase() === b.key.toLowerCase()
}

export function resolveKeymap(overrides: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const command of COMMANDS) {
    map.set(command.id, overrides[command.id] ?? command.defaultBinding)
  }
  return map
}

/** Dois comandos na mesma tecla. A interface avisa antes de gravar. */
export function findConflicts(keymap: Map<string, string>): Map<string, string[]> {
  const bySignature = new Map<string, string[]>()
  for (const [commandId, text] of keymap) {
    const binding = parseBinding(text)
    if (!binding) continue
    const signature = serializeBinding(binding).toLowerCase()
    const list = bySignature.get(signature) ?? []
    list.push(commandId)
    bySignature.set(signature, list)
  }
  const conflicts = new Map<string, string[]>()
  for (const [signature, ids] of bySignature) {
    if (ids.length > 1) conflicts.set(signature, ids)
  }
  return conflicts
}
