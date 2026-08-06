import { describe, expect, it } from 'vitest'
import { PESOS, degrauDoValor, pesosQueDesenham } from './pesos'

/**
 * As réguas abaixo são MEDIDAS, não inventadas: saíram do app rodando, com
 * `measureText` sobre a mesma frase a 64px, uma por fonte do menu. É por isso
 * que este teste vale alguma coisa — ele reproduz o que o Windows realmente
 * entrega, não o que a especificação do CSS promete.
 */
const MEDIDO: Record<string, Record<number, number>> = {
  // tem Light, Regular, Semibold, Bold e Black — mas não tem Medium, e o 500
  // cai no Semibold junto com o 600
  'Segoe UI': { 300: 1022.25, 400: 1070.28, 500: 1099.13, 600: 1099.13, 700: 1137.03, 800: 1190.22 },
  // Regular e Bold, só: três degraus para cada
  Georgia: { 300: 1056.13, 400: 1056.13, 500: 1056.13, 600: 1228.09, 700: 1228.09, 800: 1228.09 },
  // uma face e nada mais
  'Cascadia Mono': { 300: 1312.5, 400: 1312.5, 500: 1312.5, 600: 1312.5, 700: 1312.5, 800: 1312.5 },
  // a embutida, variável: cada degrau interpola e nenhum repete
  'Inter Variable': { 300: 1000, 400: 1020, 500: 1041, 600: 1063, 700: 1086, 800: 1110 }
}

const regua = (fonte: string) => (peso: number) => MEDIDO[fonte][peso]

describe('os degraus que o controle de peso pode oferecer', () => {
  it('na fonte variável embutida, todos os seis', () => {
    expect(pesosQueDesenham(regua('Inter Variable'))).toEqual([...PESOS])
  })

  it('em Segoe UI cai para cinco — o 600 sai porque repete o 500', () => {
    expect(pesosQueDesenham(regua('Segoe UI'))).toEqual([300, 400, 500, 700, 800])
  })

  it('em Georgia sobram dois, um por face instalada', () => {
    expect(pesosQueDesenham(regua('Georgia'))).toEqual([300, 600])
  })

  it('numa fonte de face única sobra um, e é assim que se sabe que o controle não serve', () => {
    expect(pesosQueDesenham(regua('Cascadia Mono'))).toEqual([300])
  })

  it('do grupo fica o MENOR: dizer 500 numa fonte sem 500 seria a mentira de novo', () => {
    // 400 e 500 desenham igual; o degrau tem de ser o 400
    const distintos = pesosQueDesenham((p) => (p <= 500 ? 100 : 200), [400, 500, 600])
    expect(distintos).toEqual([400, 600])
  })

  it('diferença de centésimo de pixel é a mesma face, não duas', () => {
    expect(pesosQueDesenham((p) => (p === 400 ? 1000 : 1000.02), [400, 500])).toEqual([400])
  })
})

describe('onde a bolinha pousa para um peso já gravado', () => {
  it('cai no degrau que desenha o que já está na tela', () => {
    expect(degrauDoValor(600, [300, 600])).toBe(600)
    expect(degrauDoValor(300, [300, 600])).toBe(300)
  })

  /*
   * O caso que a medição no app rodando derrubou.
   *
   * Em Georgia os degraus reais são 300 e 600. Um projeto com `fontWeight: 500`
   * está numericamente mais perto do 600 — mas o que o Windows desenha para 500
   * em Georgia é o Regular, que é o grupo do 300. Pousar no 600 mostraria
   * "Peso 600" com o texto em Regular na tela: a mesma mentira, de outro jeito.
   */
  it('500 numa fonte de degraus 300 e 600 pousa no 300, que é o que ele desenha', () => {
    expect(degrauDoValor(500, [300, 600])).toBe(300)
  })

  it('abaixo do primeiro degrau sobra o primeiro — é o mais leve que a fonte tem', () => {
    expect(degrauDoValor(200, [300, 600])).toBe(300)
  })

  it('sem degrau nenhum, devolve o próprio valor em vez de inventar um', () => {
    expect(degrauDoValor(500, [])).toBe(500)
  })
})
