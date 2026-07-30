import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from '@shared/defaults'
import type { Appearance } from '@shared/types'

/**
 * A mescla que `loadState` aplica sobre a aparência gravada.
 *
 * Está aqui, e não só dentro de `storage.ts`, porque o modo de falha é
 * silencioso: um campo que nasce depois fica `undefined` no workspace de quem
 * já usava o app, e um booleano `undefined` vira `false` — o app assume o
 * oposto do padrão sem avisar ninguém.
 */
function mergeAppearance(saved: Partial<Appearance> | undefined): Appearance {
  return {
    ...DEFAULT_APPEARANCE,
    ...saved,
    timers: { ...DEFAULT_APPEARANCE.timers, ...saved?.timers }
  }
}

describe('migração da aparência gravada', () => {
  it('completa campo que ainda não existia no workspace salvo', () => {
    const antigo = { fontSize: 90 } as Partial<Appearance>
    const merged = mergeAppearance(antigo)

    expect(merged.fontSize).toBe(90)
    expect(merged.uniformSpeed).toBe(true)
  })

  it('completa dentro de timers, não só na raiz', () => {
    // a versão anterior gravava uma cor só; separar em duas apagaria ambas se
    // a mescla fosse rasa
    const antigo = {
      timers: { elapsed: true, remaining: true, corner: 'topLeft', sizePct: 5 }
    } as unknown as Partial<Appearance>

    const merged = mergeAppearance(antigo)

    expect(merged.timers.elapsed).toBe(true)
    expect(merged.timers.corner).toBe('topLeft')
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

describe('padrões dos relógios', () => {
  it('nascem desligados: o apresentador precisa ver o texto, não números', () => {
    expect(DEFAULT_APPEARANCE.timers.elapsed).toBe(false)
    expect(DEFAULT_APPEARANCE.timers.remaining).toBe(false)
  })

  it('verde para o decorrido e vermelho para o restante', () => {
    expect(DEFAULT_APPEARANCE.timers.elapsedColor.toUpperCase()).toBe('#5DCAA5')
    expect(DEFAULT_APPEARANCE.timers.remainingColor.toUpperCase()).toBe('#E24B4A')
  })
})
