import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from '@shared/defaults'
import type { Appearance } from '@shared/types'
import { mergeAppearance } from './mergeAppearance'

describe('migração da aparência gravada', () => {
  it('completa campo que ainda não existia no workspace salvo', () => {
    const merged = mergeAppearance({ fontSize: 90 })

    expect(merged.fontSize).toBe(90)
    expect(merged.uniformSpeed).toBe(true)
  })

  it('completa dentro de timers, não só na raiz', () => {
    // mescla rasa substituiria o objeto inteiro, e os campos novos ficariam
    // sem valor no workspace de quem já usava o app
    const merged = mergeAppearance({
      timers: { elapsed: true, sizePct: 5 }
    } as unknown as Partial<Appearance>)

    expect(merged.timers.elapsed).toBe(true)
    expect(merged.timers.sizePct).toBe(5)
    expect(merged.timers.elapsedColor).toBe(DEFAULT_APPEARANCE.timers.elapsedColor)
    expect(merged.timers.remainingColor).toBe(DEFAULT_APPEARANCE.timers.remainingColor)
  })

  it('não deixa nenhum campo indefinido, em nenhum nível', () => {
    const merged = mergeAppearance({})

    for (const [key, value] of Object.entries(merged)) {
      expect(value, key).toBeDefined()
    }
    for (const [key, value] of Object.entries(merged.timers)) {
      expect(value, `timers.${key}`).toBeDefined()
    }
  })

  it('respeita o que o operador já tinha escolhido', () => {
    const merged = mergeAppearance({
      uniformSpeed: false,
      timers: { ...DEFAULT_APPEARANCE.timers, elapsedColor: '#123456' }
    })

    expect(merged.uniformSpeed).toBe(false)
    expect(merged.timers.elapsedColor).toBe('#123456')
  })

  it('aguenta workspace sem aparência alguma', () => {
    expect(mergeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE)
  })
})

describe('nomes antigos que ainda precisam ser lidos', () => {
  it('recupera a posição gravada como "corner"', () => {
    // o campo virou `position` ao trocar os quatro cantos pela grade de nove;
    // a escolha do operador não pode se perder por causa disso
    const merged = mergeAppearance({ timers: { corner: 'bottomLeft' } } as unknown as Partial<Appearance>)
    expect(merged.timers.position).toBe('bottomLeft')
  })

  it('recupera a cor única gravada como "color" para o decorrido', () => {
    const merged = mergeAppearance({ timers: { color: '#abcdef' } } as unknown as Partial<Appearance>)
    expect(merged.timers.elapsedColor).toBe('#abcdef')
    expect(merged.timers.remainingColor).toBe(DEFAULT_APPEARANCE.timers.remainingColor)
  })

  it('prefere o nome atual quando os dois existem', () => {
    const merged = mergeAppearance({
      timers: { position: 'middleCenter', corner: 'topLeft' }
    } as unknown as Partial<Appearance>)
    expect(merged.timers.position).toBe('middleCenter')
  })

  it('descarta posição que não existe mais em vez de deixar o app quebrado', () => {
    const merged = mergeAppearance({ timers: { position: 'sideways' } } as unknown as Partial<Appearance>)
    expect(merged.timers.position).toBe(DEFAULT_APPEARANCE.timers.position)
  })
})

describe('a linha da marca de leitura', () => {
  it('nasce desligada na transmissão', () => {
    // o operador precisa da referência; o apresentador precisa do texto limpo
    expect(DEFAULT_APPEARANCE.readingMarkOnOutput).toBe(false)
  })

  it('workspace de antes do recurso não liga a linha sem pedir', () => {
    const merged = mergeAppearance({ fontSize: 50 })
    expect(merged.readingMarkOnOutput).toBe(false)
  })

  it('mas a escolha de quem ligou é respeitada', () => {
    const merged = mergeAppearance({ readingMarkOnOutput: true })
    expect(merged.readingMarkOnOutput).toBe(true)
  })
})

describe('compensação do vidro', () => {
  it('o espelho horizontal nasce ligado: é a montagem comum de teleprompter', () => {
    expect(DEFAULT_APPEARANCE.mirrorX).toBe(true)
    // vertical e giro dependem do rig, então esses o operador liga se precisar
    expect(DEFAULT_APPEARANCE.mirrorY).toBe(false)
    expect(DEFAULT_APPEARANCE.rotation).toBe(0)
  })

  it('workspace salvo antes disso mantém o espelho como o operador deixou', () => {
    // virar o texto de quem já tinha o app configurado seria pior que o
    // padrão antigo: no ar, ninguém entende por que o roteiro inverteu
    expect(mergeAppearance({ mirrorX: false }).mirrorX).toBe(false)
    expect(mergeAppearance({ mirrorX: true }).mirrorX).toBe(true)
  })
})

describe('padrões dos relógios', () => {
  it('nascem desligados: o apresentador precisa ver o texto, não números', () => {
    expect(DEFAULT_APPEARANCE.timers.elapsed).toBe(false)
    expect(DEFAULT_APPEARANCE.timers.remaining).toBe(false)
  })

  it('verde para o decorrido e vermelho para o restante', () => {
    expect(DEFAULT_APPEARANCE.timers.elapsedColor.toUpperCase()).toBe('#46D17F')
    expect(DEFAULT_APPEARANCE.timers.remainingColor.toUpperCase()).toBe('#FF6B5E')
  })
})
