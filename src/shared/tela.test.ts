import { describe, expect, it } from 'vitest'
import {
  ANGULO_PADRAO,
  apoioDoRecado,
  corpoDoRecado,
  CORPO_MAX,
  CORPO_MIN,
  fundoDaTela,
  telaNova
} from './tela'

describe('o fundo da tela', () => {
  it('uma cor só sai chapada, não como gradiente de uma parada', () => {
    // chapado é mais barato de compor, e é o que foi pedido ao escolher chapado
    expect(fundoDaTela({ de: '#16253f' })).toBe('#16253f')
  })

  it('a segunda cor é o que faz virar gradiente', () => {
    const css = fundoDaTela({ de: '#12456b', ate: '#8e3fd4' })
    expect(css).toContain('linear-gradient')
    expect(css).toContain('#12456b')
    expect(css).toContain('#8e3fd4')
  })

  it('sem ângulo escolhido usa o padrão', () => {
    expect(fundoDaTela({ de: '#000', ate: '#fff' })).toContain(`${ANGULO_PADRAO}deg`)
  })

  it('ângulo ZERO é um ângulo, não a falta de um', () => {
    /*
     * A armadilha é escrever `angulo ?? PADRAO` com um valor que pode ser 0:
     * o gradiente de baixo para cima viraria diagonal sozinho, e o operador
     * veria o ângulo "0" no controle com a tela mostrando outra coisa.
     */
    expect(fundoDaTela({ de: '#000', ate: '#fff', angulo: 0 })).toContain('0deg')
  })

  it('fundo faltando ou cor vazia não deixa a tela sem background', () => {
    // um `background: undefined` deixaria aparecer o que estiver atrás do
    // cartão — que é justamente o roteiro que ele deveria estar cobrindo
    for (const caso of [undefined, { de: '' }, { de: '   ' }]) {
      expect(fundoDaTela(caso)).toBe('#000000')
    }
  })
})

describe('o recado', () => {
  it('topo e pé se apoiam em pontas opostas, meio no centro', () => {
    expect(apoioDoRecado('topo')).toBe('flex-start')
    expect(apoioDoRecado('meio')).toBe('center')
    expect(apoioDoRecado('pe')).toBe('flex-end')
  })

  it('sem posição escolhida fica no meio', () => {
    expect(apoioDoRecado(undefined)).toBe('center')
  })

  it('o corpo acompanha a altura do quadro, e não o pixel', () => {
    /*
     * O mesmo cartão é desenhado num ladrilho de ~99px de altura e numa saída
     * de 1080. Guardar o corpo em pixel daria um recado que cobre o ladrilho
     * inteiro ou some na tela grande — a proporção é o que se mantém.
     */
    const naGaveta = corpoDoRecado(11, 99)
    const noAr = corpoDoRecado(11, 1080)
    expect(naGaveta / 99).toBeCloseTo(noAr / 1080, 10)
    expect(noAr).toBeCloseTo(118.8, 5)
  })

  it('o corpo é preso à escala em qualquer valor doido', () => {
    expect(corpoDoRecado(-40, 1000)).toBeCloseTo((1000 * CORPO_MIN) / 100, 6)
    expect(corpoDoRecado(9999, 1000)).toBeCloseTo((1000 * CORPO_MAX) / 100, 6)
    expect(corpoDoRecado(undefined, 1000)).toBeGreaterThan(0)
  })
})

describe('a tela que nasce do botão', () => {
  it('vem chapada e sem recado — quem quiser gradiente escolhe', () => {
    const { fundo, recado } = telaNova()
    expect(fundo.ate).toBeUndefined()
    expect(fundoDaTela(fundo)).toBe(fundo.de)
    expect(recado.texto).toBe('')
  })

  it('o corpo padrão está dentro da escala do controle', () => {
    const { recado } = telaNova()
    expect(recado.corpoPct).toBeGreaterThanOrEqual(CORPO_MIN)
    expect(recado.corpoPct).toBeLessThanOrEqual(CORPO_MAX)
  })
})
