import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from '@shared/defaults'
import { PRESET_SLOTS, presetsVazios, type Preset } from '@shared/presets'
import { defaultsDosPresets, loadPresets, normalizePresets, presetsPath, savePresets } from './presets'
import { FACTORY_DEFAULTS, defaultsPath, saveUserDefaults } from './userDefaults'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'valendo-presets-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const umPreset = (nome: string, extra: Partial<Preset> = {}): Preset => ({
  nome,
  cor: '#7ee0a8',
  appearance: DEFAULT_APPEARANCE,
  apresentadores: [],
  ppm: 150,
  ...extra
})

describe('os presets no disco', () => {
  it('sem arquivo nenhum, abre com os cinco vazios', () => {
    expect(loadPresets(dir)).toEqual(presetsVazios())
  })

  it('grava e relê, com nome, cor e apresentadores', () => {
    const presets = presetsVazios()
    presets.slots[2] = umPreset('Igreja', {
      apresentadores: [{ id: 'p1', nome: 'HARI', cor: '#7ee0a8', oculto: true }]
    })
    presets.padrao = 2
    savePresets(dir, presets)

    const lido = loadPresets(dir)
    expect(lido.slots[2]?.nome).toBe('Igreja')
    expect(lido.slots[2]?.apresentadores).toEqual([{ id: 'p1', nome: 'HARI', cor: '#7ee0a8', oculto: true }])
    expect(lido.padrao).toBe(2)
  })

  it('arquivo ilegível abre vazio, e não pela metade', () => {
    // meio preset desenharia uma tela meio certa, e o operador não teria como
    // saber quais campos vieram dele e quais o app inventou
    writeFileSync(presetsPath(dir), '{ isto não é json', 'utf8')
    expect(loadPresets(dir)).toEqual(presetsVazios())
  })

  it('grava por .tmp e renomeia, sem deixar arquivo pela metade', () => {
    savePresets(dir, presetsVazios())
    expect(existsSync(presetsPath(dir))).toBe(true)
    expect(existsSync(`${presetsPath(dir)}.tmp`)).toBe(false)
  })
})

describe('completar o que veio de uma versão antiga', () => {
  it('sempre cinco lugares, mesmo que o arquivo traga dois', () => {
    const fora = normalizePresets({ slots: [umPreset('A'), umPreset('B')], padrao: 0 })
    expect(fora.slots).toHaveLength(PRESET_SLOTS)
    expect(fora.slots.slice(2).every((s) => s === null)).toBe(true)
  })

  it('aparência incompleta é completada com a de fábrica', () => {
    // um preset gravado antes de um campo existir não pode desenhar meia tela
    const fora = normalizePresets({ slots: [{ nome: 'A', cor: '#fff', appearance: { fontSize: 90 } }] })
    expect(fora.slots[0]?.appearance.fontSize).toBe(90)
    expect(fora.slots[0]?.appearance.lineHeight).toBe(DEFAULT_APPEARANCE.lineHeight)
  })

  it('estrela apontando para lugar vazio vira sem estrela', () => {
    expect(normalizePresets({ slots: [], padrao: 3 }).padrao).toBeNull()
    expect(normalizePresets({ slots: [umPreset('A')], padrao: 9 }).padrao).toBeNull()
  })

  it('apresentador sem nome não entra', () => {
    const fora = normalizePresets({
      slots: [{ ...umPreset('A'), apresentadores: [{ nome: '  ' }, { nome: 'HARI' }] }]
    })
    expect(fora.slots[0]?.apresentadores.map((a) => a.nome)).toEqual(['HARI'])
  })
})

describe('a migração do padrão da versão anterior', () => {
  it('o defaults.json vira o preset do lugar 1, com a estrela', () => {
    /*
     * Sem isto, quem já tinha gravado "salvar como padrão" abriria a versão
     * nova com tudo de fábrica — perderia sem aviso os ajustes que escolheu.
     */
    saveUserDefaults(dir, {
      appearance: { ...DEFAULT_APPEARANCE, fontSize: 72, align: 'left' },
      ppm: 210
    })

    const presets = loadPresets(dir)
    expect(presets.padrao).toBe(0)
    expect(presets.slots[0]?.appearance.fontSize).toBe(72)
    expect(presets.slots[0]?.appearance.align).toBe('left')
    expect(presets.slots[0]?.ppm).toBe(210)
  })

  it('nasce SEM nome, porque aqui ainda não se sabe o idioma do app', () => {
    /*
     * O `Store` carrega os presets no construtor, antes de o workspace dizer em
     * que língua a interface fala. Batizar aqui em português repetiria o defeito
     * das abas `Aba 1`, que apareciam assim para todo mundo. A tela mostra
     * "Preset 1" traduzido enquanto o nome estiver vazio.
     */
    saveUserDefaults(dir, { appearance: DEFAULT_APPEARANCE, ppm: 150 })
    expect(loadPresets(dir).slots[0]?.nome).toBe('')
  })

  it('não migra quem nunca gravou padrão nenhum', () => {
    expect(loadPresets(dir)).toEqual(presetsVazios())
  })

  it('o defaults.json continua onde estava, para uma volta atrás funcionar', () => {
    saveUserDefaults(dir, { appearance: DEFAULT_APPEARANCE, ppm: 150 })
    loadPresets(dir)
    expect(existsSync(defaultsPath(dir))).toBe(true)
  })

  it('presets.json existente manda, e a migração não roda de novo', () => {
    // senão o padrão velho voltaria por cima toda abertura, desfazendo o que o
    // operador tivesse mudado no lugar 1
    saveUserDefaults(dir, { appearance: { ...DEFAULT_APPEARANCE, fontSize: 72 }, ppm: 210 })
    const meus = presetsVazios()
    meus.slots[0] = umPreset('O meu', { appearance: { ...DEFAULT_APPEARANCE, fontSize: 30 } })
    savePresets(dir, meus)

    expect(loadPresets(dir).slots[0]?.appearance.fontSize).toBe(30)
  })
})

describe('com o que uma aba nova nasce', () => {
  it('sem estrela, nasce de fábrica', () => {
    expect(defaultsDosPresets(presetsVazios())).toEqual(FACTORY_DEFAULTS)
  })

  it('com estrela, nasce com a aparência e a velocidade daquele preset', () => {
    // é o ÚNICO lugar em que a velocidade do preset entra: aplicar numa aba que
    // já existe não mexe no ppm, que é do transporte e não tem desfazer
    const presets = presetsVazios()
    presets.slots[1] = umPreset('Podcast', {
      appearance: { ...DEFAULT_APPEARANCE, fontSize: 64 },
      ppm: 190
    })
    presets.padrao = 1

    const nasce = defaultsDosPresets(presets)
    expect(nasce.appearance.fontSize).toBe(64)
    expect(nasce.ppm).toBe(190)
  })
})
