import { describe, expect, it } from 'vitest'
import { appliesOutputTransforms, canvasBox, isQuarterTurn, stageSize } from './output'

const DEITADO = { width: 1_920, height: 1_080 }
const EM_PE = { width: 1_080, height: 1_920 }

describe('appliesOutputTransforms', () => {
  it('só a transmissão compensa o vidro do teleprompter', () => {
    expect(appliesOutputTransforms('broadcast')).toBe(true)
  })

  it('a prévia e a página da rede mostram o texto como foi escrito', () => {
    expect(appliesOutputTransforms('preview')).toBe(false)
  })
})

describe('isQuarterTurn', () => {
  it('90 e 270 trocam largura por altura', () => {
    expect(isQuarterTurn(90)).toBe(true)
    expect(isQuarterTurn(270)).toBe(true)
  })

  it('0 e 180 mantêm a forma', () => {
    expect(isQuarterTurn(0)).toBe(false)
    expect(isQuarterTurn(180)).toBe(false)
  })
})

describe('stageSize', () => {
  it('sem giro de um quarto, o palco é o próprio monitor', () => {
    expect(stageSize(0, DEITADO)).toEqual(DEITADO)
    expect(stageSize(180, DEITADO)).toEqual(DEITADO)
  })

  it('girado um quarto de volta, o palco fica em pé', () => {
    expect(stageSize(90, DEITADO)).toEqual(EM_PE)
    expect(stageSize(270, DEITADO)).toEqual(EM_PE)
  })

  it('um monitor em pé girado um quarto compõe deitado', () => {
    expect(stageSize(90, EM_PE)).toEqual(DEITADO)
  })

  it('o palco não depende de quem desenha — é o que garante a mesma quebra de linha', () => {
    // a prévia não gira, mas compõe na mesma largura da transmissão que gira
    expect(stageSize(90, DEITADO)).toEqual(stageSize(90, DEITADO))
  })
})

describe('canvasBox', () => {
  it('a transmissão desenha na forma do monitor, mesmo girada', () => {
    expect(canvasBox(90, DEITADO, true)).toEqual(DEITADO)
    expect(canvasBox(270, DEITADO, true)).toEqual(DEITADO)
    expect(canvasBox(0, DEITADO, true)).toEqual(DEITADO)
  })

  it('sem aplicar o giro, a caixa acompanha o palco para não recortar o texto', () => {
    expect(canvasBox(90, DEITADO, false)).toEqual(EM_PE)
    expect(canvasBox(270, DEITADO, false)).toEqual(EM_PE)
  })

  it('sem giro de um quarto, as duas superfícies desenham a mesma caixa', () => {
    expect(canvasBox(0, DEITADO, false)).toEqual(canvasBox(0, DEITADO, true))
    expect(canvasBox(180, DEITADO, false)).toEqual(canvasBox(180, DEITADO, true))
  })

  it('espelhar não muda a forma da caixa em nenhuma das duas', () => {
    // espelho é só reflexão: a caixa é a mesma, com ou sem ele
    expect(canvasBox(0, DEITADO, true)).toEqual(canvasBox(0, DEITADO, false))
  })
})
