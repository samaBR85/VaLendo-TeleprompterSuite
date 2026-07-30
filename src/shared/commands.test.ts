import { describe, expect, it } from 'vitest'
import {
  COMMANDS,
  COMMANDS_BY_ID,
  bindingsEqual,
  findConflicts,
  formatBinding,
  parseBinding,
  resolveKeymap,
  serializeBinding
} from './commands'

describe('registro de comandos', () => {
  it('não tem id repetido', () => {
    expect(new Set(COMMANDS.map((c) => c.id)).size).toBe(COMMANDS.length)
  })

  it('cobre os comandos exigidos: ritmo, marcadores e capítulos', () => {
    for (const id of [
      'speed.increase',
      'speed.decrease',
      'marker.create',
      'marker.next',
      'marker.prev',
      'chapter.next',
      'chapter.prev'
    ]) {
      expect(COMMANDS_BY_ID.has(id)).toBe(true)
    }
  })

  it('tem as 10 abas e os 9 saltos de marcador', () => {
    expect(COMMANDS.filter((c) => c.id.startsWith('tab.switch.'))).toHaveLength(10)
    expect(COMMANDS.filter((c) => c.id.startsWith('marker.goto.'))).toHaveLength(9)
  })

  it('sai do registro sem conflito de tecla', () => {
    expect([...findConflicts(resolveKeymap({}))].map(([signature]) => signature)).toEqual([])
  })

  it('todo atalho padrão é analisável', () => {
    for (const command of COMMANDS) {
      expect(parseBinding(command.defaultBinding), command.id).not.toBeNull()
    }
  })
})

describe('atalhos', () => {
  it('analisa modificadores e normaliza a tecla', () => {
    expect(parseBinding('Mod+Shift+k')).toEqual({ mod: true, alt: false, shift: true, key: 'K' })
    expect(parseBinding('Ctrl+arrowup')).toEqual({ mod: true, alt: false, shift: false, key: 'ArrowUp' })
    expect(parseBinding('Space')).toEqual({ mod: false, alt: false, shift: false, key: 'Space' })
    expect(parseBinding('Shift')).toBeNull()
  })

  it('mostra Cmd no macOS e Ctrl no resto', () => {
    const binding = parseBinding('Mod+Alt+S')!
    expect(formatBinding(binding, true)).toBe('Cmd+Option+S')
    expect(formatBinding(binding, false)).toBe('Ctrl+Alt+S')
  })

  it('serializa de volta para a forma neutra', () => {
    expect(serializeBinding(parseBinding('cmd+shift+z')!)).toBe('Mod+Shift+Z')
  })

  it('compara ignorando caixa', () => {
    expect(bindingsEqual(parseBinding('Mod+k')!, parseBinding('Ctrl+K')!)).toBe(true)
    expect(bindingsEqual(parseBinding('Mod+k')!, parseBinding('Alt+K')!)).toBe(false)
  })

  it('acusa conflito quando o usuário remapeia para uma tecla já usada', () => {
    const keymap = resolveKeymap({ 'marker.create': 'Mod+B' }) // já é o blackout
    const conflicts = findConflicts(keymap)
    expect(conflicts.get('mod+b')).toEqual(expect.arrayContaining(['marker.create', 'output.blackout']))
  })

  it('deixa o padrão intacto para os comandos não remapeados', () => {
    const keymap = resolveKeymap({ 'palette.open': 'Mod+P' })
    expect(keymap.get('palette.open')).toBe('Mod+P')
    expect(keymap.get('transport.playPause')).toBe('Space')
  })
})
