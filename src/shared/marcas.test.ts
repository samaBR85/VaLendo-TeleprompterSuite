import { describe, expect, it } from 'vitest'
import {
  aplicarMarca,
  corDaMarca,
  corNoPonto,
  edicaoEntre,
  guardarRecente,
  limparMarcas,
  marcasDaFatia,
  remapearMarcas,
  type Marca
} from './marcas'

/**
 * O texto de trabalho destes testes, com as posições à vista:
 *
 *     0         1         2
 *     0123456789012345678901234
 *     "A ação começa agora."
 *        └──┘  a marca cerca "ação" — de 2 a 6
 */
const TEXTO = 'A ação começa agora.'
const ACAO: Marca = { de: 2, ate: 6, cor: '#e5484d' }

/** Aplica a edição no texto de verdade, para o teste conferir contra a realidade. */
function editar(texto: string, posicao: number, removido: number, inserido: string): string {
  return texto.slice(0, posicao) + inserido + texto.slice(posicao + removido)
}

/** O que a marca cerca depois do remapeamento, lido do texto novo. */
function oQueCerca(texto: string, marcas: Marca[]): string[] {
  return marcas.map((m) => texto.slice(m.de, m.ate))
}

describe('as seis bordas aprovadas', () => {
  it('digitar DENTRO da marca: ela cresce e continua cercando a palavra inteira', () => {
    // "ação" → "açãozinha": o que entra herda a marca, senão a palavra sairia
    // pintada pela metade
    const novo = editar(TEXTO, 6, 0, 'zinha')
    const fora = remapearMarcas([ACAO], [{ posicao: 6, removido: 0, inserido: 5 }])
    expect(oQueCerca(novo, fora)).toEqual(['açãozinha'])
  })

  it('digitar logo DEPOIS do fim: a marca cresce — é continuar a palavra', () => {
    // o mesmo caso acima visto pela borda: a posição 6 É o fim da marca
    const fora = remapearMarcas([ACAO], [{ posicao: 6, removido: 0, inserido: 3 }])
    expect(fora[0]).toMatchObject({ de: 2, ate: 9 })
  })

  it('digitar logo ANTES do começo: a marca NÃO cresce, só desliza', () => {
    /*
     * A regra que impede a marca de virar um buraco negro. Se ela crescesse dos
     * dois lados, escrever ao lado de uma palavra pintada pintaria junto — e
     * escrever ao lado é muito mais frequente que continuar dentro.
     */
    const novo = editar(TEXTO, 2, 0, 'grande ')
    const fora = remapearMarcas([ACAO], [{ posicao: 2, removido: 0, inserido: 7 }])
    expect(oQueCerca(novo, fora)).toEqual(['ação'])
    expect(fora[0].de).toBe(9)
  })

  it('apagar o trecho marcado inteiro: a marca morre', () => {
    // marca sem texto embaixo não existe
    const fora = remapearMarcas([ACAO], [{ posicao: 2, removido: 4, inserido: 0 }])
    expect(fora).toEqual([])
  })

  it('colar POR CIMA do trecho marcado: a marca morre', () => {
    /*
     * Você trocou o conteúdo, não corrigiu. Manter a marca pintaria um texto
     * que ninguém escolheu pintar — e num roteiro no ar isso aparece na cara do
     * apresentador como uma palavra vermelha que ele não esperava.
     */
    const fora = remapearMarcas([ACAO], [{ posicao: 2, removido: 4, inserido: 7 }])
    expect(fora).toEqual([])
  })

  it('comer só uma ponta: a marca encolhe até o que sobrou', () => {
    // apaga "aç" (posições 2 e 3): sobra "ão", e é isso que fica pintado
    const novo = editar(TEXTO, 2, 2, '')
    const fora = remapearMarcas([ACAO], [{ posicao: 2, removido: 2, inserido: 0 }])
    expect(oQueCerca(novo, fora)).toEqual(['ão'])
  })
})

describe('edição longe da marca', () => {
  it('mexer ACIMA desliza a marca e ela continua na mesma palavra', () => {
    /*
     * O caso que motivou o arquivo inteiro: o operador corrige um parágrafo lá
     * em cima, tudo desce, e a marca tem de descer junto. Guardada como
     * "caractere 2 ao 6", ela passaria a pintar outra coisa.
     */
    const antes = 'Boa noite.\n' + TEXTO
    const marca: Marca = { de: 11 + 2, ate: 11 + 6, cor: '#e5484d' }
    const novo = editar(antes, 0, 0, 'Antes de mais nada.\n')
    const fora = remapearMarcas([marca], [edicaoEntre(antes, novo)!])
    expect(oQueCerca(novo, fora)).toEqual(['ação'])
  })

  it('mexer ABAIXO não toca na marca', () => {
    const fora = remapearMarcas([ACAO], [{ posicao: 14, removido: 0, inserido: 6 }])
    expect(fora[0]).toMatchObject({ de: 2, ate: 6 })
  })
})

describe('várias edições de uma vez — o "trocar todas"', () => {
  it('as marcas entre um ponto e outro sobrevivem', () => {
    /*
     * Tratar "trocar todas" como UMA edição do primeiro ao último ponto
     * apagaria toda marca que estivesse no caminho, sem ninguém ter pedido.
     * Por isso a lista de edições existe.
     */
    //   'x aaa y MARCA z aaa w'
    //    0123456789...
    const marca: Marca = { de: 8, ate: 13, negrito: true }
    const edicoes = [
      { posicao: 2, removido: 3, inserido: 5 },
      { posicao: 16, removido: 3, inserido: 5 }
    ]
    const novo = 'x bbbbb y MARCA z bbbbb w'
    const fora = remapearMarcas([marca], edicoes)
    expect(oQueCerca(novo, fora)).toEqual(['MARCA'])
  })
})

describe('a edição entre dois textos', () => {
  it('digitar no meio', () => {
    expect(edicaoEntre('abcd', 'abXcd')).toEqual({ posicao: 2, removido: 0, inserido: 1 })
  })
  it('apagar no meio', () => {
    expect(edicaoEntre('abXcd', 'abcd')).toEqual({ posicao: 2, removido: 1, inserido: 0 })
  })
  it('trocar no meio', () => {
    expect(edicaoEntre('abXcd', 'abYZcd')).toEqual({ posicao: 2, removido: 1, inserido: 2 })
  })
  it('texto igual não é edição nenhuma', () => {
    expect(edicaoEntre('abc', 'abc')).toBeNull()
  })
  it('acrescentar no fim', () => {
    expect(edicaoEntre('abc', 'abcde')).toEqual({ posicao: 3, removido: 0, inserido: 2 })
  })
})

describe('aplicar e limpar sobre um trecho', () => {
  it('pintar onde não havia nada cria uma marca só', () => {
    expect(aplicarMarca([], 2, 6, { cor: '#e5484d' })).toEqual([{ de: 2, ate: 6, cor: '#e5484d' }])
  })

  it('pintar METADE de uma palavra já negrito devolve as duas metades', () => {
    // a metade de fora continua só negrito; a de dentro fica negrito E colorida
    const fora = aplicarMarca([{ de: 2, ate: 6, negrito: true }], 4, 6, { cor: '#e5484d' })
    expect(fora).toEqual([
      { de: 2, ate: 4, negrito: true },
      { de: 4, ate: 6, negrito: true, cor: '#e5484d' }
    ])
  })

  it('pintar por cima de uma marca inteira substitui a cor e guarda o resto', () => {
    const fora = aplicarMarca([{ de: 2, ate: 6, cor: '#111', negrito: true }], 2, 6, { cor: '#e5484d' })
    expect(fora).toEqual([{ de: 2, ate: 6, cor: '#e5484d', negrito: true }])
  })

  it('tirar a cor deixa a formatação em paz', () => {
    // o conta-gotas pontilhado tira COR, não o negrito — são coisas diferentes
    const fora = aplicarMarca([{ de: 2, ate: 6, cor: '#e5484d', negrito: true }], 2, 6, { cor: undefined })
    expect(fora).toEqual([{ de: 2, ate: 6, negrito: true }])
  })

  it('marca que ficaria sem nada dentro não é guardada', () => {
    expect(aplicarMarca([{ de: 2, ate: 6, cor: '#e5484d' }], 2, 6, { cor: undefined })).toEqual([])
  })

  it('limpar tira tudo do trecho e preserva as pontas de fora', () => {
    const fora = limparMarcas([{ de: 0, ate: 10, negrito: true }], 4, 6)
    expect(fora).toEqual([
      { de: 0, ate: 4, negrito: true },
      { de: 6, ate: 10, negrito: true }
    ])
  })

  it('trecho de tamanho zero não faz nada', () => {
    const marcas = [{ de: 2, ate: 6, cor: '#e5484d' }]
    expect(aplicarMarca(marcas, 4, 4, { negrito: true })).toBe(marcas)
    expect(limparMarcas(marcas, 4, 4)).toBe(marcas)
  })
})

describe('recortar para a composição de linhas', () => {
  it('marca que atravessa a quebra vira duas, cada uma medida da SUA linha', () => {
    /*
     * Sem isto, a segunda metade da palavra pintada apareceria sem cor — ou
     * pior, os índices da primeira linha pintariam o começo da segunda.
     */
    const marca: Marca = { de: 8, ate: 16, cor: '#e5484d' }
    const primeira = marcasDaFatia([marca], 0, 12)
    const segunda = marcasDaFatia([marca], 12, 24)
    expect(primeira).toEqual([{ de: 8, ate: 12, cor: '#e5484d' }])
    expect(segunda).toEqual([{ de: 0, ate: 4, cor: '#e5484d' }])
  })

  it('marca fora da fatia não entra', () => {
    expect(marcasDaFatia([{ de: 0, ate: 4, cor: '#e5484d' }], 10, 20)).toEqual([])
  })

  it('marca inteira dentro da fatia sai rebaseada', () => {
    expect(marcasDaFatia([{ de: 14, ate: 18, negrito: true }], 10, 20)).toEqual([
      { de: 4, ate: 8, negrito: true }
    ])
  })
})

describe('a cor que o seletor mostra de volta', () => {
  it('devolve a cor da marca que cobre o ponto', () => {
    expect(corNoPonto([ACAO], 3)).toBe('#e5484d')
  })

  it('fora da marca, nenhuma cor', () => {
    // no fim EXCLUSIVO: a marca cerca 2..6, então a casa 6 já é de fora
    expect(corNoPonto([ACAO], 6)).toBeUndefined()
    expect(corNoPonto([ACAO], 1)).toBeUndefined()
    expect(corNoPonto(undefined, 3)).toBeUndefined()
  })

  it('marca só de negrito não devolve cor nenhuma', () => {
    // senão o gatilho da barra apagaria a cor ao selecionar um trecho negrito
    expect(corNoPonto([{ de: 2, ate: 6, negrito: true }], 3)).toBeUndefined()
  })

  it('com duas marcas no mesmo ponto, vale a de cima', () => {
    expect(corNoPonto([ACAO, { de: 0, ate: 10, cor: '#12a594' }], 3)).toBe('#12a594')
  })
})

describe('a roda das quatro cores recentes', () => {
  const roda = (cores: string[]): { recentes: string[]; proxima: number } =>
    cores.reduce(
      (estado, cor) => guardarRecente(estado.recentes, estado.proxima, cor),
      { recentes: [] as string[], proxima: 0 }
    )

  it('enche da esquerda para a direita', () => {
    expect(roda(['#111111', '#222222']).recentes).toEqual(['#111111', '#222222'])
  })

  it('cheia, a quinta cor recomeça na PRIMEIRA casa', () => {
    /*
     * O ponto de não ser uma pilha. Numa pilha, o quinto empurraria os quatro
     * e as três cores que o operador não tocou trocariam de lugar — a bolinha
     * que o dedo já sabia onde fica mudaria de casa a cada pincelada.
     */
    const estado = roda(['#111111', '#222222', '#333333', '#444444', '#555555'])
    expect(estado.recentes).toEqual(['#555555', '#222222', '#333333', '#444444'])
    expect(estado.proxima).toBe(1)
  })

  it('dá a volta inteira e recomeça de novo', () => {
    const oito = ['#111111', '#222222', '#333333', '#444444', '#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd']
    const estado = roda(oito)
    expect(estado.recentes).toEqual(['#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd'])
    expect(estado.proxima).toBe(0)
  })

  it('cor repetida não gasta a vez nem duplica', () => {
    // repintar com o mesmo vermelho de sempre não pode custar uma das quatro
    const antes = roda(['#111111', '#222222'])
    const depois = guardarRecente(antes.recentes, antes.proxima, '#111111')
    expect(depois).toEqual(antes)
  })

  it('a mesma cor em caixa diferente conta como repetida', () => {
    const antes = roda(['#e5484d'])
    expect(guardarRecente(antes.recentes, antes.proxima, '#E5484D')).toEqual(antes)
  })

  it('um índice estragado no disco não abre buraco na roda', () => {
    // ninguém edita o workspace.json à mão, mas quando editar não pode virar
    // uma lista esparsa — `undefined` no meio quebraria o desenho
    const estado = guardarRecente(['#111111'], 9, '#222222')
    expect(estado.recentes).toEqual(['#111111', '#222222'])
    expect(estado.recentes.every((c) => typeof c === 'string')).toBe(true)
  })
})

describe('a cor de um trecho inteiro — a regra do capítulo', () => {
  it('devolve a cor da marca', () => {
    expect(corDaMarca([ACAO])).toBe('#e5484d')
  })

  it('sem marca, sem cor', () => {
    expect(corDaMarca(undefined)).toBeUndefined()
    expect(corDaMarca([])).toBeUndefined()
  })

  it('marca só de negrito não tinge nada', () => {
    // um capítulo em negrito continua com a cor do sistema
    expect(corDaMarca([{ de: 0, ate: 4, negrito: true }])).toBeUndefined()
  })

  it('com duas cores, vale a ÚLTIMA', () => {
    // pintar de novo por cima é o gesto de trocar de ideia
    expect(corDaMarca([ACAO, { de: 0, ate: 2, cor: '#12a594' }])).toBe('#12a594')
  })

  it('pula as marcas sem cor ao procurar a última', () => {
    expect(corDaMarca([ACAO, { de: 0, ate: 2, negrito: true }])).toBe('#e5484d')
  })
})
