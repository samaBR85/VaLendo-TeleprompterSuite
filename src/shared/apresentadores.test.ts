import { describe, expect, it } from 'vitest'
import {
  chaveDoNome,
  coresDasLinhas,
  ehDeixa,
  linhasCandidatas,
  proximaCor,
  temParNoRoteiro,
  CORES_DE_APRESENTADOR,
  type LinhaPintavel
} from './apresentadores'
import { blocksFromText } from './text'
import type { Apresentador } from './types'

const HARI: Apresentador = { id: 'p1', nome: 'HARI', cor: '#7ee0a8' }
const ROBSON: Apresentador = { id: 'p2', nome: 'ROBSON', cor: '#8ab4ff' }
const DOIS = [HARI, ROBSON]

/** Monta linhas como `composeLines` as entrega, mas na mão e legíveis. */
const fala = (text: string): LinhaPintavel => ({ kind: 'speech', text })
const capitulo = (text: string): LinhaPintavel => ({ kind: 'chapter', text })
const direcao = (text: string): LinhaPintavel => ({ kind: 'direction', text })

describe('de quem é cada linha', () => {
  it('a fala embaixo do nome recebe a cor dele, e o nome não', () => {
    const cores = coresDasLinhas([fala('HARI'), fala('E agora The Bear...')], DOIS)
    expect(cores).toEqual([null, HARI.cor])
  })

  it('a cor atravessa parágrafos até o próximo nome', () => {
    /*
     * É o caso do roteiro real: HARI fala, o parágrafo seguinte continua sendo
     * dele (sem repetir o nome), e só o "ROBSON" troca o turno.
     */
    const cores = coresDasLinhas(
      [fala('HARI'), fala('primeira fala'), fala('segunda fala, mesmo dono'), fala('ROBSON'), fala('a resposta')],
      DOIS
    )
    expect(cores).toEqual([null, HARI.cor, HARI.cor, null, ROBSON.cor])
  })

  it('capítulo e direção não recebem cor, e NÃO trocam o turno', () => {
    // decisão do operador: eles são do sistema, não de quem fala — depois de um
    // capítulo quem estava falando continua falando
    const cores = coresDasLinhas(
      [fala('HARI'), fala('antes'), capitulo('## Bloco 2'), direcao('[olhar câmera 2]'), fala('depois')],
      DOIS
    )
    expect(cores).toEqual([null, HARI.cor, null, null, HARI.cor])
  })

  it('antes do primeiro nome ninguém é dono', () => {
    const cores = coresDasLinhas([fala('uma abertura sem nome'), fala('HARI'), fala('agora sim')], DOIS)
    expect(cores).toEqual([null, null, HARI.cor])
  })

  it('sem apresentador registrado, nada muda de cor', () => {
    const cores = coresDasLinhas([fala('HARI'), fala('a fala')], [])
    expect(cores).toEqual([null, null])
  })

  it('a caixa não conta — em roteiro ninguém digita o nome sempre igual', () => {
    const cores = coresDasLinhas([fala('Hari'), fala('a fala'), fala('  robson  '), fala('outra')], DOIS)
    expect(cores).toEqual([null, HARI.cor, null, ROBSON.cor])
  })

  it('o nome no meio do parágrafo troca o turno ali mesmo', () => {
    // "HARI / Faz sentido? / ROBSON / Faz." é um parágrafo só, com duas deixas
    const cores = coresDasLinhas([fala('HARI'), fala('Faz sentido?'), fala('ROBSON'), fala('Faz.')], DOIS)
    expect(cores).toEqual([null, HARI.cor, null, ROBSON.cor])
  })

  it('reconhece a deixa para desenhá-la diferente', () => {
    expect(ehDeixa(fala('ROBSON'), DOIS)).toBe(ROBSON)
    expect(ehDeixa(fala('uma fala qualquer'), DOIS)).toBeUndefined()
    // um capítulo escrito com o nome do apresentador continua sendo capítulo
    expect(ehDeixa(capitulo('HARI'), DOIS)).toBeUndefined()
  })
})

describe('o par entre o chip e o roteiro', () => {
  const roteiro = blocksFromText('## Abertura\n\nHARI\nboa noite\n\nROBSON\nboa noite também')

  it('acha o nome que está escrito no roteiro', () => {
    expect(temParNoRoteiro(linhasCandidatas(roteiro), HARI)).toBe(true)
  })

  it('acusa o par perdido quando o nome mudou no texto', () => {
    // é o caso do RELINK: "HARI" virou "HARI OLIVEIRA" e a cor sumiria calada
    const renomeado = blocksFromText('HARI OLIVEIRA\nboa noite')
    expect(temParNoRoteiro(linhasCandidatas(renomeado), HARI)).toBe(false)
  })

  it('não confunde um capítulo com uma deixa', () => {
    const so = blocksFromText('## ROBSON\n\numa fala')
    expect(temParNoRoteiro(linhasCandidatas(so), ROBSON)).toBe(false)
  })
})

describe('cores oferecidas', () => {
  it('a próxima é sempre uma que ninguém está usando', () => {
    expect(proximaCor([])).toBe(CORES_DE_APRESENTADOR[0])
    expect(proximaCor([CORES_DE_APRESENTADOR[0]])).toBe(CORES_DE_APRESENTADOR[1])
    expect(proximaCor([CORES_DE_APRESENTADOR[1], CORES_DE_APRESENTADOR[0]])).toBe(CORES_DE_APRESENTADOR[2])
  })

  it('esgotadas as seis, volta para a primeira em vez de ficar sem cor', () => {
    expect(proximaCor([...CORES_DE_APRESENTADOR])).toBe(CORES_DE_APRESENTADOR[0])
  })

  it('nenhuma delas se confunde com capítulo, direção ou "no ar"', () => {
    const proibidas = ['#f0b429', '#62a8ff', '#ff4d4d']
    for (const cor of CORES_DE_APRESENTADOR) expect(proibidas).not.toContain(cor.toLowerCase())
  })
})

describe('chaveDoNome', () => {
  it('ignora espaço nas pontas e caixa', () => {
    expect(chaveDoNome('  HARI ')).toBe(chaveDoNome('hari'))
  })

  it('mas não é vazia à toa — linha em branco não casa com ninguém', () => {
    expect(coresDasLinhas([fala('HARI'), fala(''), fala('a fala')], DOIS)).toEqual([null, HARI.cor, HARI.cor])
  })
})
