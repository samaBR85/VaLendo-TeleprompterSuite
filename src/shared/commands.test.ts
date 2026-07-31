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

describe('a semântica das teclas', () => {
  const tecla = (id: string): string => COMMANDS_BY_ID.get(id)?.defaultBinding ?? ''

  it('o projeto é o salvar principal, e o roteiro é a variante', () => {
    // o projeto contém o roteiro; quem aperta o atalho "cru" quer guardar tudo
    expect(tecla('project.save')).toBe('Mod+S')
    expect(tecla('document.save')).toBe('Mod+Shift+S')
  })

  it('e salvar casa com abrir: os dois falam de projeto', () => {
    expect(tecla('project.open')).toBe('Mod+O')
    expect(tecla('project.save')).toBe('Mod+S')
  })

  it('marcador e capítulo são a mesma família: seta, e seta com Shift', () => {
    expect(tecla('marker.next')).toBe('Mod+ArrowDown')
    expect(tecla('chapter.next')).toBe('Mod+Shift+ArrowDown')
    expect(tecla('marker.prev')).toBe('Mod+ArrowUp')
    expect(tecla('chapter.prev')).toBe('Mod+Shift+ArrowUp')
  })

  it('nenhum Shift promete parentesco que não existe', () => {
    /*
     * A regra: se `Mod+X` e `Mod+Shift+X` existem, os dois têm de ser a mesma
     * família. Era aqui que doía — `Mod+M` criava marcador e `Mod+Shift+M`
     * espelhava a saída; `Mod+O` abria projeto e `Mod+Shift+O` ligava a
     * transmissão. O Shift dizia "variante disto" e entregava outra coisa.
     */
    // a família é o grupo do próprio comando, e não o prefixo do id: salvar o
    // projeto e salvar o roteiro têm ids diferentes e são a mesma coisa, e
    // marcador e capítulo também — os dois navegam para um ponto do texto
    const porTecla = new Map(COMMANDS.map((c) => [c.defaultBinding, c]))

    const mentirosos: string[] = []
    let examinados = 0
    for (const [binding, comando] of porTecla) {
      if (!binding.startsWith('Mod+Shift+')) continue
      const base = binding.replace('Mod+Shift+', 'Mod+')
      const irmao = porTecla.get(base)
      if (!irmao) continue
      // números são seletores de lista (aba, cartão): ali o modificador diz de
      // QUAL lista, e isso é intencional
      if (/^Mod\+\d$/.test(base)) continue
      examinados += 1
      if (irmao.group !== comando.group) {
        mentirosos.push(`${base}=${irmao.id} (${irmao.group}) vs ${binding}=${comando.id} (${comando.group})`)
      }
    }

    // sem isto o teste passaria de graça no dia em que alguém desfizesse todos
    // os pares — nenhum par para conferir também dá lista vazia
    expect(examinados).toBeGreaterThanOrEqual(5)
    expect(mentirosos).toEqual([])
  })
})
