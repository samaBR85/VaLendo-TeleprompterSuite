import { describe, expect, it } from 'vitest'
import { deslocamentoDoArrasto, type Arrasto } from './arrastoDeAba'
import { createTab, TAB_COLORS } from './defaults'
import type { Tab } from './types'

const abas: Tab[] = ['A', 'B', 'C', 'D'].map((n, i) => createTab(n, '', TAB_COLORS[i]))
const LARGURA = 120
const arrastando = (qual: string, sobre: number): Arrasto => ({
  tabId: abas[qual.charCodeAt(0) - 65].id,
  sobre,
  larguraPx: LARGURA
})

/** o deslocamento de cada aba, na ordem, para ler o resultado de relance */
function fila(arrasto: Arrasto | null): number[] {
  return abas.map((_, i) => deslocamentoDoArrasto(abas, arrasto, i))
}

describe('a prévia do arrasto', () => {
  it('sem arrasto, ninguém se mexe', () => {
    expect(fila(null)).toEqual([0, 0, 0, 0])
  })

  it('a aba arrastada nunca desliza', () => {
    // ela já está sob o ponteiro; movê-la faria a ficha fugir da mão
    expect(fila(arrastando('A', 3))[0]).toBe(0)
  })

  it('indo para a frente, quem está no caminho abre para a ESQUERDA', () => {
    // A para o fim: B e C recuam uma casa, D fica onde está
    expect(fila(arrastando('A', 3))).toEqual([0, -LARGURA, -LARGURA, 0])
  })

  it('indo para trás, quem está no caminho abre para a DIREITA', () => {
    // D para o começo: A, B e C avançam uma casa
    expect(fila(arrastando('D', 0))).toEqual([LARGURA, LARGURA, LARGURA, 0])
  })

  it('só quem está ENTRE a origem e o alvo se mexe', () => {
    // C para a posição de B: só B desliza, A e D nem sabem que houve arrasto
    expect(fila(arrastando('C', 1))).toEqual([0, LARGURA, 0, 0])
  })

  it('soltar no mesmo lugar não move ninguém', () => {
    expect(fila(arrastando('B', 1))).toEqual([0, 0, 0, 0])
    // "depois de si mesma" é o mesmo lugar, depois do desconto da própria saída
    expect(fila(arrastando('B', 2))).toEqual([0, 0, 0, 0])
  })

  it('desconta a própria saída, igual ao reducer', () => {
    /*
     * `sobre` chega medido ANTES de a aba sair da fila. Se esta conta e a do
     * `tab/reorder` divergirem, a prévia abre um vão e o soltar entrega
     * outro — e o operador aprende a não confiar na animação, que é pior do
     * que não ter animação nenhuma.
     */
    expect(fila(arrastando('A', 2))).toEqual([0, -LARGURA, 0, 0])
  })

  it('aba que não está na fila não move nada', () => {
    expect(fila({ tabId: 'fantasma', sobre: 0, larguraPx: LARGURA })).toEqual([0, 0, 0, 0])
  })
})
