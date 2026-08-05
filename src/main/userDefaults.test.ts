import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE, SPEED_PRESETS, createInitialState, createTab } from '@shared/defaults'
import {
  FACTORY_DEFAULTS,
  clearUserDefaults,
  defaultsPath,
  loadUserDefaults,
  normalizeDefaults,
  saveUserDefaults
} from './userDefaults'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valendo-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('padrão gravado pelo operador', () => {
  it('sem arquivo, usa o de fábrica e diz que não é personalizado', () => {
    const { defaults, custom } = loadUserDefaults(dir)

    expect(custom).toBe(false)
    expect(defaults).toEqual(FACTORY_DEFAULTS)
  })

  it('grava e relê os ajustes de agora', () => {
    saveUserDefaults(dir, {
      appearance: { ...DEFAULT_APPEARANCE, fontSize: 50, marginPct: 0, align: 'center' },
      ppm: 260
    })

    const { defaults, custom } = loadUserDefaults(dir)

    expect(custom).toBe(true)
    expect(defaults.appearance.fontSize).toBe(50)
    expect(defaults.appearance.marginPct).toBe(0)
    expect(defaults.appearance.align).toBe('center')
    expect(defaults.ppm).toBe(260)
  })

  it('apagar volta ao de fábrica', () => {
    saveUserDefaults(dir, { appearance: DEFAULT_APPEARANCE, ppm: 300 })
    clearUserDefaults(dir)

    expect(loadUserDefaults(dir)).toEqual({ defaults: FACTORY_DEFAULTS, custom: false })
  })

  it('apagar quando não há nada gravado não explode', () => {
    expect(() => clearUserDefaults(dir)).not.toThrow()
  })

  it('arquivo ilegível vale como fábrica, não como meio padrão', () => {
    // um padrão pela metade é pior que nenhum: o operador não teria como saber
    // quais campos vieram dele e quais o app inventou
    writeFileSync(defaultsPath(dir), '{ isto não é json', 'utf8')

    expect(loadUserDefaults(dir)).toEqual({ defaults: FACTORY_DEFAULTS, custom: false })
  })

  it('grava por .tmp e renomeia, sem deixar arquivo pela metade', () => {
    saveUserDefaults(dir, { appearance: DEFAULT_APPEARANCE, ppm: 200 })

    const gravado = JSON.parse(readFileSync(defaultsPath(dir), 'utf8'))
    expect(gravado.ppm).toBe(200)
    expect(() => readFileSync(`${defaultsPath(dir)}.tmp`, 'utf8')).toThrow()
  })
})

describe('completar o padrão gravado', () => {
  it('preenche campo que nasceu depois da gravação', () => {
    const { appearance } = normalizeDefaults({ appearance: { fontSize: 90 } } as never)

    expect(appearance.fontSize).toBe(90)
    expect(appearance.uniformSpeed).toBe(DEFAULT_APPEARANCE.uniformSpeed)
    expect(appearance.timers.position).toBe(DEFAULT_APPEARANCE.timers.position)
  })

  it('ritmo fora da faixa é trazido para dentro, não aceito nem descartado', () => {
    expect(normalizeDefaults({ ppm: 5_000 } as never).ppm).toBe(500)
    expect(normalizeDefaults({ ppm: 2 } as never).ppm).toBe(60)
  })

  it('ritmo que não é número cai no de fábrica', () => {
    expect(normalizeDefaults({ ppm: 'rápido' } as never).ppm).toBe(FACTORY_DEFAULTS.ppm)
    expect(normalizeDefaults({}).ppm).toBe(FACTORY_DEFAULTS.ppm)
  })
})

describe('o padrão chega em quem nasce depois', () => {
  it('aba nova nasce com a aparência do padrão', () => {
    const meuJeito = { ...DEFAULT_APPEARANCE, fontSize: 50, textColor: '#00FF00' }

    const tab = createTab('Aba 2', '', '#000000', meuJeito)

    expect(tab.appearance.fontSize).toBe(50)
    expect(tab.appearance.textColor).toBe('#00FF00')
  })

  it('a aba fica com cópia própria: mexer nela não contamina o padrão', () => {
    const meuJeito = { ...DEFAULT_APPEARANCE, timers: { ...DEFAULT_APPEARANCE.timers } }

    const tab = createTab('Aba 2', '', '#000000', meuJeito)
    tab.appearance.timers.sizePct = 99

    expect(meuJeito.timers.sizePct).toBe(DEFAULT_APPEARANCE.timers.sizePct)
  })

  it('o workspace novo começa no ritmo do padrão', () => {
    const state = createInitialState({ appearance: DEFAULT_APPEARANCE, ppm: 260 })

    expect(state.transport.ppm).toBe(260)
  })

  it('sem padrão informado, o workspace novo é o de fábrica', () => {
    expect(createInitialState().transport.ppm).toBe(SPEED_PRESETS[1])
  })
})
