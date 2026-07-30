import type { Binding } from '@shared/commands'

const NAMED = /^(F\d{1,2}|Arrow(Up|Down|Left|Right)|Page(Up|Down)|Home|End|Space|Enter|Escape|Tab|Backspace|Delete)$/i

/** As únicas teclas sem modificador que continuam valendo dentro do editor. */
export const ALWAYS_GLOBAL = /^(F\d{1,2}|Escape)$/i

const SYMBOLS: Record<string, string> = {
  Equal: '=',
  Minus: '-',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Space: 'Space'
}

/**
 * Tecla física a partir de `event.code`.
 *
 * Sem isso `Ctrl+Shift+=` nunca dispara: com Shift o teclado devolve `+`, e em
 * ABNT2 vários símbolos trocam de lugar em relação ao layout americano.
 */
export function keyFromCode(code: string): string | null {
  const digit = /^Digit(\d)$/.exec(code)
  if (digit) return digit[1]
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]
  return SYMBOLS[code] ?? (NAMED.test(code) ? code : null)
}

export function matchesEvent(binding: Binding, event: KeyboardEvent, isMac: boolean): boolean {
  const mod = isMac ? event.metaKey : event.ctrlKey
  const foreignMod = isMac ? event.ctrlKey : event.metaKey
  if (binding.mod !== mod || foreignMod) return false
  if (binding.alt !== event.altKey) return false
  if (binding.shift !== event.shiftKey) return false

  const wanted = binding.key.toLowerCase()
  const fromKey = (event.key === ' ' ? 'Space' : event.key).toLowerCase()
  const fromCode = keyFromCode(event.code)?.toLowerCase()
  return wanted === fromKey || wanted === fromCode
}

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'Dead'])

/** Lê o atalho que o operador acabou de teclar no editor de teclas. */
export function bindingFromEvent(event: KeyboardEvent, isMac: boolean): Binding | null {
  if (MODIFIER_KEYS.has(event.key)) return null
  const key = keyFromCode(event.code) ?? (event.key === ' ' ? 'Space' : event.key)
  if (!key) return null
  return {
    mod: isMac ? event.metaKey : event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key: key.length === 1 ? key.toUpperCase() : key
  }
}

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}
