import { describe, expect, it } from 'vitest'
import { conteudoDaFaixa, faixaPedida, tamanhoDaFaixa } from './range'

describe('pedido de faixa de bytes', () => {
  it('sem cabeçalho, não há faixa: entrega o arquivo inteiro', () => {
    expect(faixaPedida(null, 1000)).toBeNull()
    expect(faixaPedida(undefined, 1000)).toBeNull()
    expect(faixaPedida('', 1000)).toBeNull()
  })

  it('lê o pedido mais comum de todos: daqui até o fim', () => {
    expect(faixaPedida('bytes=100-', 1000)).toEqual({ inicio: 100, fim: 999 })
  })

  it('lê um trecho fechado', () => {
    expect(faixaPedida('bytes=100-199', 1000)).toEqual({ inicio: 100, fim: 199 })
  })

  it('o pedido de sufixo é "os últimos tantos bytes", não "do zero até tantos"', () => {
    // é assim que o tocador busca o índice, que em mp4 costuma morar no fim
    expect(faixaPedida('bytes=-500', 1000)).toEqual({ inicio: 500, fim: 999 })
  })

  it('sufixo maior que o arquivo devolve o arquivo todo, sem estourar para trás', () => {
    expect(faixaPedida('bytes=-5000', 1000)).toEqual({ inicio: 0, fim: 999 })
  })

  it('apara o fim que passa do arquivo, em vez de recusar', () => {
    // o tocador costuma pedir um bloco redondo perto do fim; recusar aqui
    // faria o vídeo parar a poucos segundos do final
    expect(faixaPedida('bytes=900-99999', 1000)).toEqual({ inicio: 900, fim: 999 })
  })

  it('recusa o que não cabe: começo fora do arquivo, fim antes do começo, arquivo vazio', () => {
    expect(faixaPedida('bytes=1000-', 1000)).toBe('invalida')
    expect(faixaPedida('bytes=500-100', 1000)).toBe('invalida')
    expect(faixaPedida('bytes=0-10', 0)).toBe('invalida')
    expect(faixaPedida('bytes=-', 1000)).toBe('invalida')
    expect(faixaPedida('bytes=-0', 1000)).toBe('invalida')
  })

  it('cabeçalho que não é faixa de bytes é ignorado, não tratado como erro', () => {
    // outras unidades existem no papel e ninguém usa; entregar o arquivo
    // inteiro é a resposta certa, e é o que o cabeçalho manda fazer
    expect(faixaPedida('items=0-10', 1000)).toBeNull()
    expect(faixaPedida('bytes=abc-def', 1000)).toBeNull()
  })

  it('conta os bytes pelas duas pontas inclusivas', () => {
    // o erro de um byte aqui é o que corta o último quadro do vídeo
    expect(tamanhoDaFaixa({ inicio: 0, fim: 0 })).toBe(1)
    expect(tamanhoDaFaixa({ inicio: 100, fim: 199 })).toBe(100)
  })

  it('escreve o Content-Range como o cabeçalho pede', () => {
    expect(conteudoDaFaixa({ inicio: 100, fim: 199 }, 1000)).toBe('bytes 100-199/1000')
  })
})
