import { describe, expect, it } from 'vitest'
import type { DisplayInfo } from '@shared/types'
import { buildBroadcastMenu } from './broadcastMenu'

function display(id: number, label: string, primary = false): DisplayInfo {
  return {
    id,
    label,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    size: { width: 1920, height: 1080 },
    scaleFactor: 1,
    rotation: 0,
    internal: false,
    primary
  }
}

const DISPLAYS = [
  display(1, 'Monitor 1 · vertical · 864×1537'),
  display(2, 'Monitor 2 · horizontal · 2048×1152'),
  display(3, 'Monitor 3 · horizontal · 2048×1152', true)
]

describe('buildBroadcastMenu', () => {
  it('oferece todos os monitores, para dar como sair de qualquer um deles', () => {
    const entries = buildBroadcastMenu(DISPLAYS, 3)
    expect(entries.filter((e) => e.displayId !== null)).toHaveLength(3)
  })

  it('sempre oferece encerrar a transmissão', () => {
    // é a saída de emergência: sem ela, transmitir no monitor do operador
    // deixa a interface coberta e o app inalcançável
    for (const current of [null, 1, 2, 3]) {
      const entries = buildBroadcastMenu(DISPLAYS, current)
      expect(entries.some((e) => e.displayId === null), `atual=${current}`).toBe(true)
    }
  })

  it('marca o monitor em uso', () => {
    const entries = buildBroadcastMenu(DISPLAYS, 2)
    expect(entries.filter((e) => e.checked).map((e) => e.displayId)).toEqual([2])
  })

  it('identifica qual é o monitor principal, que é onde o operador costuma estar', () => {
    const entries = buildBroadcastMenu(DISPLAYS, 1)
    expect(entries.find((e) => e.displayId === 3)?.label).toContain('principal')
  })

  it('separa o encerrar da lista de monitores', () => {
    const entries = buildBroadcastMenu(DISPLAYS, 1)
    expect(entries[entries.length - 1].separatorBefore).toBe(true)
  })

  it('ainda oferece encerrar quando não há monitor algum na lista', () => {
    expect(buildBroadcastMenu([], null)).toEqual([
      { label: 'Encerrar a transmissão', displayId: null, checked: false, separatorBefore: true }
    ])
  })
})
