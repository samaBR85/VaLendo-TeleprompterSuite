import { describe, expect, it } from 'vitest'
import { cartaoNoAr, MAX_CARTOES, novoCartaoId } from './cards'
import { createInitialState } from './defaults'
import { buildProject, readProject, serializeProject } from './project'
import type { AppState, Cartao } from './types'

const IMAGEM: Cartao = { id: 'c1', kind: 'image', nome: 'Standby', arquivo: 'c1.png' }
const RECADO: Cartao = { id: 'c2', kind: 'text', texto: 'CORTA' }

function comCartoes(cards: Cartao[], noAr: string | null = null): AppState {
  const base = createInitialState()
  return { ...base, cards, transport: { ...base.transport, card: noAr } }
}

describe('qual cartão está na tela', () => {
  it('nenhum, quando o transporte não aponta para nada', () => {
    expect(cartaoNoAr(comCartoes([IMAGEM]))).toBeNull()
  })

  it('o que o transporte aponta', () => {
    expect(cartaoNoAr(comCartoes([IMAGEM, RECADO], 'c2'))).toEqual(RECADO)
  })

  it('nenhum, quando aponta para um cartão que já foi removido', () => {
    // o reducer limpa isso, mas um workspace gravado no meio de uma versão
    // antiga pode chegar assim — e apontar para o vazio não pode quebrar a tela
    expect(cartaoNoAr(comCartoes([IMAGEM], 'sumiu'))).toBeNull()
  })
})

describe('só a imagem tem nome', () => {
  it('o recado não carrega um rótulo à parte da mensagem', () => {
    // dois campos pediriam escrever "Corta" em cima de "CORTA": a mensagem já
    // é o rótulo legível, e o segundo campo só dava trabalho
    expect('nome' in RECADO).toBe(false)
    expect('nome' in IMAGEM).toBe(true)
  })
})

describe('ids de cartão', () => {
  it('servem como nome de arquivo', () => {
    expect(novoCartaoId(Date.parse('2026-07-31'), 3)).toMatch(/^[a-z0-9]+$/)
  })

  it('não se repetem dentro do mesmo instante', () => {
    const agora = 1_700_000_000_000
    const ids = new Set(Array.from({ length: MAX_CARTOES }, (_, i) => novoCartaoId(agora, i)))
    expect(ids.size).toBe(MAX_CARTOES)
  })
})

describe('o cartão no ar é estado de momento', () => {
  it('não viaja no projeto: abrir um arquivo não sobe cartão na cara do apresentador', () => {
    const salvo = buildProject(comCartoes([IMAGEM], 'c1'), 0)
    expect(salvo.state.transport.card).toBeNull()
  })

  it('mas a lista de cartões viaja', () => {
    const salvo = buildProject(comCartoes([IMAGEM, RECADO]), 0)
    expect(salvo.state.cards).toEqual([IMAGEM, RECADO])
  })
})

describe('as imagens dentro do .valendo', () => {
  it('só entram quando há alguma', () => {
    // um programa sem cartão continua gerando o arquivo enxuto de antes
    expect(buildProject(comCartoes([]), 0).imagens).toBeUndefined()
  })

  it('voltam inteiras na leitura', () => {
    const bytes = Buffer.from('finge que é um png').toString('base64')
    const texto = serializeProject(comCartoes([IMAGEM]), 0, { 'c1.png': bytes })
    const lido = readProject(texto)

    expect(lido.error).toBeNull()
    expect(lido.imagens['c1.png']).toBe(bytes)
    expect(lido.state?.cards).toEqual([IMAGEM])
  })

  it('um projeto antigo, sem cartão nenhum, abre sem reclamar', () => {
    const semCartoes = serializeProject(comCartoes([]), 0)
    const lido = readProject(semCartoes)
    expect(lido.error).toBeNull()
    expect(lido.imagens).toEqual({})
  })

  it('um arquivo que não é projeto continua sendo recusado com frase, não com erro', () => {
    const lido = readProject('{"isto":"não é um projeto"}')
    expect(lido.state).toBeNull()
    expect(lido.error).toBeTruthy()
    expect(lido.imagens).toEqual({})
  })
})
