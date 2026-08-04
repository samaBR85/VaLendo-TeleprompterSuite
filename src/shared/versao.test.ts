import { describe, expect, it } from 'vitest'
import { partesDaVersao, temVersaoMaisNova } from './versao'

describe('ler uma versão', () => {
  it('aceita com e sem o v da tag', () => {
    expect(partesDaVersao('v1.1.2')).toEqual([1, 1, 2])
    expect(partesDaVersao('1.1.2')).toEqual([1, 1, 2])
  })

  it('completa o que falta com zero', () => {
    expect(partesDaVersao('2')).toEqual([2, 0, 0])
    expect(partesDaVersao('2.3')).toEqual([2, 3, 0])
  })

  it('recusa o que não dá para comparar com segurança', () => {
    for (const ruim of ['', 'latest', 'v', '1.1.2.3', '1.x.0', 'v1.2.0-beta.1']) {
      expect(partesDaVersao(ruim), ruim).toBeNull()
    }
  })
})

describe('decidir se avisa', () => {
  it('avisa quando a de lá é maior', () => {
    expect(temVersaoMaisNova('1.1.2', 'v1.1.3')).toBe(true)
    expect(temVersaoMaisNova('1.1.2', 'v1.2.0')).toBe(true)
    expect(temVersaoMaisNova('1.9.9', 'v2.0.0')).toBe(true)
  })

  it('1.1.10 é mais nova que 1.1.9, e é aqui que a comparação de texto erra', () => {
    // "1.1.9" > "1.1.10" comparando caractere a caractere, porque '9' > '1'.
    // Este é o teste que existe por causa desse erro, e não por completude.
    expect(temVersaoMaisNova('1.1.9', 'v1.1.10')).toBe(true)
    expect(temVersaoMaisNova('1.1.10', 'v1.1.9')).toBe(false)
  })

  it('cala quando é a mesma', () => {
    expect(temVersaoMaisNova('1.1.2', 'v1.1.2')).toBe(false)
  })

  it('cala quando a de lá é MAIS VELHA', () => {
    // acontece de verdade: um build local à frente da última release. Avisar
    // aqui mandaria o operador "atualizar" para trás
    expect(temVersaoMaisNova('1.2.0', 'v1.1.9')).toBe(false)
  })

  it('cala diante de qualquer coisa ilegível', () => {
    for (const ruim of ['', 'latest', 'nightly', 'v1.2.0-rc1']) {
      expect(temVersaoMaisNova('1.1.2', ruim), ruim).toBe(false)
      expect(temVersaoMaisNova(ruim, 'v9.9.9'), ruim).toBe(false)
    }
  })
})
