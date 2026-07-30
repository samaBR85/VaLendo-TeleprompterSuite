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
  label: string
  group: CommandGroup
  defaultBinding: string
  /** não aparece na paleta; só existe para o atalho */
  hidden?: boolean
}

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
 */
export const COMMANDS: CommandSpec[] = [
  { id: 'transport.playPause', label: 'Iniciar ou pausar a rolagem', group: 'Transporte', defaultBinding: 'Space' },
  { id: 'transport.restart', label: 'Voltar ao início', group: 'Transporte', defaultBinding: 'Mod+Home' },
  { id: 'transport.jumpBack', label: 'Recuar algumas palavras', group: 'Transporte', defaultBinding: 'ArrowUp' },
  { id: 'transport.jumpForward', label: 'Avançar algumas palavras', group: 'Transporte', defaultBinding: 'ArrowDown' },
  { id: 'transport.freeze', label: 'Congelar a saída para reescrever', group: 'Transporte', defaultBinding: 'Mod+Shift+F' },

  { id: 'speed.increase', label: 'Acelerar o texto', group: 'Ritmo', defaultBinding: 'ArrowRight' },
  { id: 'speed.decrease', label: 'Desacelerar o texto', group: 'Ritmo', defaultBinding: 'ArrowLeft' },
  { id: 'speed.set.1', label: 'Ritmo lento', group: 'Ritmo', defaultBinding: 'Mod+Alt+1' },
  { id: 'speed.set.2', label: 'Ritmo médio', group: 'Ritmo', defaultBinding: 'Mod+Alt+2' },
  { id: 'speed.set.3', label: 'Ritmo rápido', group: 'Ritmo', defaultBinding: 'Mod+Alt+3' },

  { id: 'marker.create', label: 'Criar marcador aqui', group: 'Marcadores', defaultBinding: 'Mod+M' },
  { id: 'marker.next', label: 'Próximo marcador', group: 'Marcadores', defaultBinding: 'Mod+ArrowDown' },
  { id: 'marker.prev', label: 'Marcador anterior', group: 'Marcadores', defaultBinding: 'Mod+ArrowUp' },
  { id: 'chapter.next', label: 'Próximo capítulo', group: 'Marcadores', defaultBinding: 'Mod+PageDown' },
  { id: 'chapter.prev', label: 'Capítulo anterior', group: 'Marcadores', defaultBinding: 'Mod+PageUp' },

  { id: 'font.increase', label: 'Aumentar a fonte', group: 'Aparência', defaultBinding: 'Mod+=' },
  { id: 'font.decrease', label: 'Diminuir a fonte', group: 'Aparência', defaultBinding: 'Mod+-' },
  { id: 'margin.increase', label: 'Aumentar a margem', group: 'Aparência', defaultBinding: 'Mod+Shift+=' },
  { id: 'margin.decrease', label: 'Diminuir a margem', group: 'Aparência', defaultBinding: 'Mod+Shift+-' },
  { id: 'words.increase', label: 'Mais palavras por linha', group: 'Aparência', defaultBinding: 'Alt+=' },
  { id: 'words.decrease', label: 'Menos palavras por linha', group: 'Aparência', defaultBinding: 'Alt+-' },
  { id: 'colors.invert', label: 'Inverter cores', group: 'Aparência', defaultBinding: 'Mod+I' },

  { id: 'output.blackout', label: 'Tela preta na saída', group: 'Saída', defaultBinding: 'Mod+B' },
  { id: 'output.mirror', label: 'Espelhar horizontalmente', group: 'Saída', defaultBinding: 'Mod+Shift+M' },
  { id: 'output.rotate', label: 'Rotacionar a saída', group: 'Saída', defaultBinding: 'Mod+Shift+R' },
  { id: 'output.toggle', label: 'Abrir ou fechar a transmissão', group: 'Saída', defaultBinding: 'Mod+Shift+O' },

  { id: 'document.save', label: 'Salvar o roteiro num arquivo', group: 'Documento', defaultBinding: 'Mod+S' },
  { id: 'document.saveAs', label: 'Salvar o roteiro como…', group: 'Documento', defaultBinding: 'Mod+Shift+S' },
  { id: 'project.save', label: 'Salvar o projeto inteiro', group: 'Documento', defaultBinding: 'Mod+Shift+P' },
  { id: 'project.open', label: 'Abrir um projeto', group: 'Documento', defaultBinding: 'Mod+O' },
  { id: 'insert.chapter', label: 'Inserir capítulo', group: 'Documento', defaultBinding: 'Mod+Shift+C' },
  { id: 'insert.direction', label: 'Inserir direção de cena', group: 'Documento', defaultBinding: 'Mod+Shift+D' },
  { id: 'edit.undo', label: 'Desfazer', group: 'Documento', defaultBinding: 'Mod+Z' },
  { id: 'edit.redo', label: 'Refazer', group: 'Documento', defaultBinding: 'Mod+Shift+Z' },
  { id: 'tab.new', label: 'Nova aba', group: 'Documento', defaultBinding: 'Mod+T' },
  { id: 'tab.close', label: 'Fechar aba', group: 'Documento', defaultBinding: 'Mod+W' },

  { id: 'view.focusMode', label: 'Alternar modo foco', group: 'Visão', defaultBinding: 'F11' },
  { id: 'palette.open', label: 'Paleta de comandos', group: 'Visão', defaultBinding: 'Mod+K' },
  { id: 'keymap.open', label: 'Editar atalhos', group: 'Visão', defaultBinding: 'Mod+,' }
]

for (let n = 1; n <= 10; n += 1) {
  COMMANDS.push({
    id: `tab.switch.${n}`,
    label: `Ir para a aba ${n}`,
    group: 'Documento',
    defaultBinding: `Mod+${n === 10 ? 0 : n}`,
    hidden: true
  })
}

for (let n = 1; n <= 9; n += 1) {
  COMMANDS.push({
    id: `marker.goto.${n}`,
    label: `Saltar para o marcador ${n}`,
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
