import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CORES_DE_PRESET, PRESET_SLOTS, presetPadrao, presetsVazios, type Preset, type Presets } from '@shared/presets'
import type { Apresentador } from '@shared/types'
import { FACTORY_DEFAULTS, loadUserDefaults, normalizeDefaults, type UserDefaults } from './userDefaults'

/**
 * Os cinco presets, no disco desta máquina.
 *
 * Arquivo próprio, e não um campo do workspace, pelo mesmo motivo que o
 * `defaults.json` de antes era separado: o workspace é o trabalho de hoje, isto
 * é o JEITO do operador. Trocar de roteiro não pode ressetar a fonte, as cores
 * e os apresentadores que ele levou meia hora escolhendo — e um workspace
 * corrompido não pode levar junto cinco presets nomeados à mão.
 *
 * E fora do `AppState` de propósito: lá dentro viajariam no `.valendo` e
 * chegariam com o roteiro na máquina de um colega. Chegam à tela pelo
 * `StateSnapshot`, como o aviso de versão nova.
 */

export function presetsPath(dir: string): string {
  return join(dir, 'presets.json')
}

function normalizarApresentadores(lista: unknown): Apresentador[] {
  if (!Array.isArray(lista)) return []
  const fora: Apresentador[] = []
  for (const bruto of lista) {
    const a = bruto as Partial<Apresentador>
    if (typeof a?.nome !== 'string' || a.nome.trim() === '') continue
    fora.push({
      id: typeof a.id === 'string' && a.id !== '' ? a.id : `p${fora.length}`,
      nome: a.nome,
      cor: typeof a.cor === 'string' ? a.cor : CORES_DE_PRESET[fora.length % CORES_DE_PRESET.length],
      ...(a.oculto === true ? { oculto: true } : {})
    })
  }
  return fora
}

function normalizarPreset(bruto: unknown, lugar: number): Preset | null {
  if (!bruto || typeof bruto !== 'object') return null
  const p = bruto as Partial<Preset>
  // aparência e ppm passam pelo mesmo completador do padrão de fábrica: um
  // preset gravado por uma versão antiga não conhece os campos que nasceram
  // depois, e meio preset desenharia uma tela meio certa
  const { appearance, ppm } = normalizeDefaults({ appearance: p.appearance, ppm: p.ppm })
  return {
    // nome vazio não é erro: é "ainda não batizado", e a tela mostra
    // "Preset N" no idioma do app até o operador renomear
    nome: typeof p.nome === 'string' ? p.nome.slice(0, 24) : '',
    cor: typeof p.cor === 'string' ? p.cor : CORES_DE_PRESET[lugar % CORES_DE_PRESET.length],
    appearance,
    apresentadores: normalizarApresentadores(p.apresentadores),
    ppm
  }
}

/** Cinco lugares sempre, venha o arquivo como vier. */
export function normalizePresets(saved: unknown): Presets {
  const bruto = (saved ?? {}) as Partial<Presets>
  const lidos = Array.isArray(bruto.slots) ? bruto.slots : []
  const slots = Array.from({ length: PRESET_SLOTS }, (_, i) => normalizarPreset(lidos[i], i))

  const padrao = bruto.padrao
  const valido = Number.isInteger(padrao) && (padrao as number) >= 0 && (padrao as number) < PRESET_SLOTS
  return {
    slots,
    // estrela apontando para lugar vazio vira "sem estrela": melhor nascer de
    // fábrica do que nascer de um preset que não existe
    padrao: valido && slots[padrao as number] ? (padrao as number) : null
  }
}

/**
 * O `defaults.json` da versão anterior vira o preset do lugar 1, com a estrela.
 *
 * Sem isto, quem já tinha gravado "salvar como padrão" abriria a versão nova
 * com tudo de fábrica — perderia, sem aviso, os ajustes que escolheu a dedo.
 *
 * Nasce SEM nome porque aqui não se sabe o idioma do app: o `Store` carrega os
 * presets no construtor, antes de o workspace dizer em que língua a interface
 * fala. Batizar em português seria repetir o defeito das abas `Aba 1`, que
 * apareciam assim para todo mundo. Sem nome, a tela mostra "Preset 1"
 * traduzido, e o operador renomeia quando quiser.
 *
 * O `defaults.json` fica onde está, de propósito: não custa nada, e voltar para
 * uma versão anterior do app continua funcionando.
 */
function migrarDoPadraoAntigo(dir: string): Presets | null {
  const { defaults, custom } = loadUserDefaults(dir)
  if (!custom) return null

  const presets = presetsVazios()
  presets.slots[0] = {
    nome: '',
    cor: CORES_DE_PRESET[0],
    appearance: defaults.appearance,
    apresentadores: [],
    ppm: defaults.ppm
  }
  presets.padrao = 0
  return presets
}

/** Nunca lança: arquivo faltando ou ilegível abre com os cinco vazios. */
export function loadPresets(dir: string): Presets {
  const path = presetsPath(dir)
  if (!existsSync(path)) return migrarDoPadraoAntigo(dir) ?? presetsVazios()
  try {
    return normalizePresets(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return presetsVazios()
  }
}

/** Grava em .tmp e renomeia: uma queda no meio não deixa o preset pela metade. */
export function savePresets(dir: string, presets: Presets): void {
  const path = presetsPath(dir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(presets, null, 2), 'utf8')
  renameSync(tmp, path)
}

/**
 * Com o que uma aba nova nasce: o preset da estrela, ou a fábrica.
 *
 * É aqui que a velocidade do preset entra em cena — e no único lugar em que ela
 * pode entrar sem susto. Aplicar um preset numa aba que já existe NÃO mexe no
 * ppm: ele é do transporte, não da aba, e mudá-lo com o roteiro no ar mudaria o
 * ritmo do apresentador na hora, sem desfazer que devolvesse.
 */
export function defaultsDosPresets(presets: Presets): UserDefaults {
  const padrao = presetPadrao(presets)
  if (!padrao) return FACTORY_DEFAULTS
  return { appearance: padrao.appearance, ppm: padrao.ppm }
}
