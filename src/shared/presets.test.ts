import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from './defaults'
import {
  PRESET_SLOTS,
  apresentadoresAoAplicar,
  aparenciaDoPreset,
  lugarValido,
  presetPadrao,
  presetsVazios,
  type Preset
} from './presets'
import type { Apresentador } from './types'

const quem = (nome: string, cor: string, oculto?: boolean): Apresentador => ({
  id: `p-${nome.toLowerCase()}`,
  nome,
  cor,
  ...(oculto === undefined ? {} : { oculto })
})

/** O preset do programa de sempre: dois apresentadores, cada um na sua cor. */
const DO_PROGRAMA: Apresentador[] = [quem('HARI', '#7ee0a8'), quem('ROBSON', '#8ab4ff')]

const idNovo = (indice: number): string => `novo-${indice}`

describe('quem do preset entra na aba', () => {
  it('mesmo programa: o roteiro cita os dois, e os dois entram já coloridos', () => {
    /*
     * O caso que motivou guardar apresentadores no preset: chega o .txt da
     * semana com os nomes escritos, a aba ainda não registrou ninguém, e
     * registrar tudo à mão toda semana era o trabalho a economizar.
     */
    const fora = apresentadoresAoAplicar(DO_PROGRAMA, [], ['HARI', 'ROBSON', 'boa noite'], idNovo)
    expect(fora.map((a) => a.nome)).toEqual(['HARI', 'ROBSON'])
    expect(fora.map((a) => a.cor)).toEqual(['#7ee0a8', '#8ab4ff'])
  })

  it('outro programa: ninguém do preset entra, e ninguém da aba sai', () => {
    /*
     * A regra que substituiu "substituir a lista". Substituindo, os três
     * seriam apagados com as cores que alguém escolheu, dois órfãos entrariam
     * no lugar, e o texto perderia a cor inteira.
     */
    const daAba = [quem('ANA', '#ffd479'), quem('PEDRO', '#a99bff'), quem('CARLA', '#7fe3e0')]
    const fora = apresentadoresAoAplicar(DO_PROGRAMA, daAba, ['ANA', 'PEDRO', 'CARLA'], idNovo)
    expect(fora).toEqual(daAba)
  })

  it('nome que existe dos dois lados: fica o id da aba e vem a cor do preset', () => {
    // o id é o que sobrevive ao RELINK — jogá-lo fora quebraria um vínculo que
    // o operador já tinha consertado. A cor é o que o preset veio decidir.
    const daAba = [{ id: 'p-antigo', nome: 'HARI', cor: '#ff0000' }]
    const fora = apresentadoresAoAplicar(DO_PROGRAMA, daAba, ['HARI'], idNovo)
    expect(fora).toHaveLength(1)
    expect(fora[0].id).toBe('p-antigo')
    expect(fora[0].cor).toBe('#7ee0a8')
  })

  it('metade e metade: entra só quem o roteiro cita, sem mexer no resto', () => {
    const daAba = [quem('ANA', '#ffd479')]
    const fora = apresentadoresAoAplicar(DO_PROGRAMA, daAba, ['ANA', 'ROBSON'], idNovo)
    expect(fora.map((a) => a.nome)).toEqual(['ANA', 'ROBSON'])
    expect(fora[0]).toEqual(quem('ANA', '#ffd479'))
  })

  it('o HIDE de cada um vem junto', () => {
    const fora = apresentadoresAoAplicar([quem('HARI', '#7ee0a8', true)], [], ['HARI'], idNovo)
    expect(fora[0].oculto).toBe(true)
  })

  it('a caixa não importa, como em todo o resto do app', () => {
    // "Hari" e "HARI" são a mesma pessoa na frente da câmera
    const fora = apresentadoresAoAplicar(DO_PROGRAMA, [], ['Hari', 'robson'], idNovo)
    expect(fora.map((a) => a.nome)).toEqual(['HARI', 'ROBSON'])
  })

  it('não mexe nas listas que recebeu', () => {
    // o reducer chama isto de dentro de um rascunho do immer; devolver o mesmo
    // objeto de outra aba faria duas abas dividirem o mesmo apresentador
    const daAba = [quem('ANA', '#ffd479')]
    const fora = apresentadoresAoAplicar(DO_PROGRAMA, daAba, ['ANA', 'HARI'], idNovo)
    expect(daAba).toHaveLength(1)
    expect(fora[0]).not.toBe(daAba[0])
  })

  it('linha em branco no roteiro não deixa entrar apresentador sem nome', () => {
    const fora = apresentadoresAoAplicar([quem('', '#7ee0a8')], [], ['', '  '], idNovo)
    expect(fora).toEqual([])
  })
})

describe('os cinco lugares', () => {
  it('nasce com cinco vazios e sem estrela', () => {
    const presets = presetsVazios()
    expect(presets.slots).toHaveLength(PRESET_SLOTS)
    expect(presets.slots.every((s) => s === null)).toBe(true)
    expect(presets.padrao).toBeNull()
  })

  it('lugar fora da faixa não vale', () => {
    expect(lugarValido(0)).toBe(true)
    expect(lugarValido(PRESET_SLOTS - 1)).toBe(true)
    expect(lugarValido(-1)).toBe(false)
    expect(lugarValido(PRESET_SLOTS)).toBe(false)
    expect(lugarValido(1.5)).toBe(false)
  })

  it('estrela apontando para lugar vazio conta como sem estrela', () => {
    // o lugar pode ter sido apagado, ou o arquivo editado à mão. Melhor nascer
    // de fábrica do que nascer de um preset que não existe
    const presets = { ...presetsVazios(), padrao: 2 }
    expect(presetPadrao(presets)).toBeNull()
  })

  it('a estrela devolve o preset daquele lugar', () => {
    const preset: Preset = {
      nome: 'Estúdio 2',
      cor: '#7ee0a8',
      appearance: DEFAULT_APPEARANCE,
      apresentadores: [],
      ppm: 150
    }
    const presets = presetsVazios()
    presets.slots[1] = preset
    presets.padrao = 1
    expect(presetPadrao(presets)).toBe(preset)
  })
})

describe('a aparência que sai do preset', () => {
  const preset: Preset = {
    nome: 'Igreja',
    cor: '#8ab4ff',
    appearance: { ...DEFAULT_APPEARANCE, deixas: [{ nome: 'HARI', oculto: true }] },
    apresentadores: [],
    ppm: 150
  }

  it('os relógios são uma cópia, não o mesmo objeto', () => {
    // sem isto, mexer no relógio da aba mexeria no preset guardado
    const saiu = aparenciaDoPreset(preset)
    expect(saiu.timers).not.toBe(preset.appearance.timers)
    expect(saiu.timers).toEqual(preset.appearance.timers)
  })

  it('as deixas saem zeradas, para não trazer nomes velhos', () => {
    // deixas é DERIVADA dos apresentadores, e quem a mantém em dia é o funil por
    // onde toda troca de aba passa. A do preset é a de outro roteiro
    expect(aparenciaDoPreset(preset).deixas).toEqual([])
  })
})
