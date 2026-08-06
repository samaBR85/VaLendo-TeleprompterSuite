import { describe, expect, it } from 'vitest'
import type { Block, Marca } from './types'
import {
  anchorFromCaret,
  caretFromAnchor,
  blockWordCount,
  blocksFromText,
  chapterTitle,
  hasFormatting,
  fatiasPorBloco,
  marcasNoTexto,
  reconcileBlocks,
  serializeBlocks,
  stripFormatting,
  totalWordCount,
  words
} from './text'

describe('classificação de blocos', () => {
  it('reconhece fala, direção e capítulo', () => {
    const blocks = blocksFromText('## Abertura\n\nboa noite a todos\n\n[olhar câmera 2]\n\n## Bloco 2')
    expect(blocks.map((b) => b.kind)).toEqual(['chapter', 'speech', 'direction', 'chapter'])
  })

  it('aceita qualquer nível de cabeçalho, de # a ######', () => {
    const blocks = blocksFromText('# um\n\n### três\n\n###### seis')
    expect(blocks.map((b) => b.kind)).toEqual(['chapter', 'chapter', 'chapter'])
    expect(blocks.map(chapterTitle)).toEqual(['um', 'três', 'seis'])
  })

  it('o § de antes da 173 NÃO é mais capítulo — vira fala', () => {
    // decisão explícita do operador: não arrastar a marca antiga. Um roteiro
    // escrito antes da troca abre com os títulos contando tempo como fala,
    // e é isso que tem que acontecer — não um erro silencioso.
    const blocks = blocksFromText('§ Abertura\n\nboa noite')
    expect(blocks.map((b) => b.kind)).toEqual(['speech', 'speech'])
  })

  it('direções e capítulos não contam palavras', () => {
    const blocks = blocksFromText('## Abertura\n\numa duas três\n\n[não conta]')
    expect(blocks.map(blockWordCount)).toEqual([0, 3, 0])
    expect(totalWordCount(blocks)).toBe(3)
  })

  it('preserva a quebra de linha que o operador digitou', () => {
    // ele colocou ali de propósito: a quebra precisa chegar até a tela do
    // apresentador, não virar espaço
    const blocks = blocksFromText('primeira linha\nsegunda linha\n\noutro parágrafo')

    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('primeira linha\nsegunda linha')
    expect(blocks[1].text).toBe('outro parágrafo')
  })

  it('faz ida e volta pelo editor sem alterar o texto', () => {
    // o editor compara o que recebe com o que mandou; toda diferença aqui é
    // uma chance de o cursor pular sozinho enquanto se digita
    const roundTrip = (text: string): string => serializeBlocks(blocksFromText(text))

    expect(roundTrip('abc\n')).toBe('abc\n')
    expect(roundTrip('abc\ndef')).toBe('abc\ndef')
    expect(roundTrip('abc\n\ndef')).toBe('abc\n\ndef')
    // linha em branco no fim não tem parágrafo para sustentar, e é descartada
    expect(roundTrip('abc\n\n')).toBe('abc')
  })
})

describe('reconcileBlocks — estabilidade dos ids', () => {
  it('mantém o id dos parágrafos intocados ao inserir um novo acima', () => {
    const before = blocksFromText('parágrafo um\n\nparágrafo dois')
    const after = reconcileBlocks(before, 'parágrafo um\n\nNOVO\n\nparágrafo dois')

    expect(after).toHaveLength(3)
    expect(after[0].id).toBe(before[0].id)
    expect(after[2].id).toBe(before[1].id)
    expect(after[1].id).not.toBe(before[1].id)
  })

  it('mantém o id ao digitar dentro de um parágrafo', () => {
    const before = blocksFromText('o apresentador fala com calma')
    const after = reconcileBlocks(before, 'o apresentador fala com muita calma')
    expect(after[0].id).toBe(before[0].id)
  })

  it('mantém o id de um parágrafo movido de lugar', () => {
    const before = blocksFromText('alfa alfa alfa\n\nbeta beta beta')
    const after = reconcileBlocks(before, 'beta beta beta\n\nalfa alfa alfa')
    expect(after[0].id).toBe(before[1].id)
    expect(after[1].id).toBe(before[0].id)
  })

  it('gera id novo para um parágrafo que não parece com nenhum anterior', () => {
    const before = blocksFromText('alfa alfa alfa')
    const after = reconcileBlocks(before, 'alfa alfa alfa\n\nzzz qqq www')
    expect(after[0].id).toBe(before[0].id)
    expect(before.some((b) => b.id === after[1].id)).toBe(false)
  })

  it('não reaproveita o mesmo id duas vezes', () => {
    const before = blocksFromText('igual igual igual')
    const after = reconcileBlocks(before, 'igual igual igual\n\nigual igual igual')
    expect(new Set(after.map((b) => b.id)).size).toBe(2)
  })

  it('sobrevive a ida e volta pelo texto do editor', () => {
    const blocks = blocksFromText('## Título\n\nfala aqui\n\n[direção]')
    const round = reconcileBlocks(blocks, serializeBlocks(blocks))
    expect(round.map((b) => b.id)).toEqual(blocks.map((b) => b.id))
    expect(round.map((b) => b.kind)).toEqual(blocks.map((b) => b.kind))
  })
})

describe('anchorFromCaret — o "Go To" do rodapé da edição', () => {
  it('acha o bloco e a palavra certos dentro de um parágrafo de fala', () => {
    const text = 'boa noite a todos\n\nsegundo parágrafo aqui'
    const blocks = blocksFromText(text)

    // cursor logo depois de "boa noite" (9 caracteres) — 2 palavras percorridas
    const anchor = anchorFromCaret(blocks, text, 9)
    expect(anchor).toEqual({ blockId: blocks[0].id, wordOffset: 2 })
  })

  it('pousa no início da linha para capítulo e direção, sem contar palavras', () => {
    const text = '## Abertura\n\n[olhar câmera 2]'
    const blocks = blocksFromText(text)

    const noCapitulo = anchorFromCaret(blocks, text, 5)
    expect(noCapitulo).toEqual({ blockId: blocks[0].id, wordOffset: 0 })

    const naDirecao = anchorFromCaret(blocks, text, text.length - 3)
    expect(naDirecao).toEqual({ blockId: blocks[1].id, wordOffset: 0 })
  })

  it('cursor no respiro entre parágrafos pousa no início do seguinte', () => {
    const text = 'primeiro\n\nsegundo'
    const blocks = blocksFromText(text)
    const gap = text.indexOf('\n\n') + 1 // dentro da quebra dupla, antes do segundo parágrafo

    const anchor = anchorFromCaret(blocks, text, gap)
    expect(anchor).toEqual({ blockId: blocks[1].id, wordOffset: 0 })
  })

  it('mantém o id do bloco mesmo com digitação ainda não confirmada pelo main', () => {
    const before = blocksFromText('o apresentador fala com calma')
    // "muita" foi digitado agora mesmo; before ainda não sabe disso
    const draft = 'o apresentador fala com muita calma'
    const caret = draft.length

    const anchor = anchorFromCaret(before, draft, caret)
    expect(anchor?.blockId).toBe(before[0].id)
    expect(anchor?.wordOffset).toBe(words(draft).length)
  })

  it('texto vazio não tem para onde ir', () => {
    expect(anchorFromCaret([], '', 0)).toBeNull()
  })
})

describe('caretFromAnchor — o editor seguindo a leitura', () => {
  it('acha onde começa a palavra que está sendo lida', () => {
    const text = 'boa noite a todos\n\nsegundo parágrafo aqui'
    const blocks = blocksFromText(text)

    // terceira palavra do primeiro parágrafo ("a", offset 2)
    expect(caretFromAnchor(blocks, text, { blockId: blocks[0].id, wordOffset: 2 })).toBe(text.indexOf('a todos'))
    // primeira do segundo
    expect(caretFromAnchor(blocks, text, { blockId: blocks[1].id, wordOffset: 0 })).toBe(text.indexOf('segundo'))
  })

  it('é a volta exata do "Go To" — ida e volta cai na mesma palavra', () => {
    /*
     * O par tem de fechar, senão "seguir a leitura" mostra um lugar e o "Go To"
     * manda para outro, e as duas ferramentas passam a discordar na cara do
     * operador.
     */
    const text = '## Abertura\n\nboa noite a todos que nos acompanham\n\n[pausa]'
    const blocks = blocksFromText(text)

    for (const caret of [0, 14, 20, 31, text.length - 2]) {
      const anchor = anchorFromCaret(blocks, text, caret)
      const volta = caretFromAnchor(blocks, text, anchor!)
      // volta ao COMEÇO da palavra onde o cursor estava — não ao caractere
      // exato, que seria pedir mais precisão do que a âncora carrega
      expect(anchorFromCaret(blocks, text, volta!)).toEqual(anchor)
    }
  })

  it('não conta espaço de sobra: dois espaços não deslocam a marca', () => {
    // `words()` colapsa o espaço; somar comprimentos de palavra erraria aqui
    const text = 'um  dois   três'
    const blocks = blocksFromText(text)
    expect(caretFromAnchor(blocks, text, { blockId: blocks[0].id, wordOffset: 2 })).toBe(text.indexOf('três'))
  })

  it('quebra simples dentro do parágrafo continua contando certo', () => {
    const text = 'primeira linha\nsegunda linha'
    const blocks = blocksFromText(text)
    expect(caretFromAnchor(blocks, text, { blockId: blocks[0].id, wordOffset: 2 })).toBe(text.indexOf('segunda'))
  })

  it('capítulo e direção pousam no início da linha', () => {
    const text = '## Abertura\n\n[olhar câmera 2]'
    const blocks = blocksFromText(text)
    expect(caretFromAnchor(blocks, text, { blockId: blocks[1].id, wordOffset: 0 })).toBe(text.indexOf('[olhar'))
  })

  it('bloco que não existe mais no texto não move nada', () => {
    // o operador apagou o parágrafo que estava no ar; melhor não mexer do que
    // pousar a marca num parágrafo qualquer
    const text = 'só isto sobrou'
    expect(caretFromAnchor(blocksFromText(text), text, { blockId: 'sumiu', wordOffset: 0 })).toBeNull()
    expect(caretFromAnchor([], '', { blockId: 'x', wordOffset: 0 })).toBeNull()
  })

  it('palavra além do fim do parágrafo pousa no fim dele', () => {
    const text = 'duas palavras'
    const blocks = blocksFromText(text)
    expect(caretFromAnchor(blocks, text, { blockId: blocks[0].id, wordOffset: 9 })).toBe(text.length)
  })
})

describe('remover formatação', () => {
  it('tira as marcas e mantém as palavras', () => {
    // é "remover formatação", como em qualquer editor — e não "apagar trecho"
    const texto = '## Abertura\n\nBoa noite.\n\n[olhar câmera 2 · pausa]\n\n## Bloco 2\n\nFim.'
    expect(stripFormatting(texto)).toBe('Abertura\n\nBoa noite.\n\nolhar câmera 2 · pausa\n\nBloco 2\n\nFim.')
  })

  it('tudo vira fala, e por isso o roteiro passa a durar mais', () => {
    const antes = blocksFromText('## Abertura\n\n[pausa longa]\n\nBoa noite.')
    const depois = blocksFromText(stripFormatting('## Abertura\n\n[pausa longa]\n\nBoa noite.'))

    expect(antes.map((b) => b.kind)).toEqual(['chapter', 'direction', 'speech'])
    expect(depois.every((b) => b.kind === 'speech')).toBe(true)
    expect(totalWordCount(depois)).toBeGreaterThan(totalWordCount(antes))
  })

  it('a direção de várias linhas sai inteira', () => {
    // classificar é por PARÁGRAFO: olhar linha a linha deixaria o fecho do
    // colchete para trás e a direção viraria meia direção
    expect(stripFormatting('[olhar câmera 2\ne esperar o VT]')).toBe('olhar câmera 2\ne esperar o VT')
  })

  it('texto já simples não muda em nada', () => {
    // o botão só existe quando há o que tirar; sem isso ele seria um clique
    // que suja o histórico sem mexer no roteiro
    const simples = 'Boa noite.\n\nHoje a gente vai falar sobre uma mudança.'
    expect(stripFormatting(simples)).toBe(simples)
    expect(hasFormatting(blocksFromText(simples))).toBe(false)
    expect(hasFormatting(blocksFromText('## Abertura\n\nBoa noite.'))).toBe(true)
  })

  it('não confunde colchete no meio da frase com direção', () => {
    const meio = 'Ele disse [textualmente] que não vem.'
    expect(stripFormatting(meio)).toBe(meio)
  })
})

describe('as marcas atravessam a reconciliação', () => {
  /** "A ação começa." — a marca cerca "ação", de 2 a 6. */
  const comMarca = (texto: string): Block[] => [
    { id: 'b1', kind: 'speech', text: texto, marcas: [{ de: 2, ate: 6, cor: '#e5484d' }] }
  ]
  const cercado = (blocos: Block[], i = 0): string[] =>
    (blocos[i].marcas ?? []).map((m: Marca) => blocos[i].text.slice(m.de, m.ate))

  it('parágrafo intocado leva as marcas como estão', () => {
    const antes = comMarca('A ação começa.')
    const depois = reconcileBlocks(antes, 'A ação começa.')
    expect(depois[0].marcas).toEqual(antes[0].marcas)
  })

  it('digitar no MESMO parágrafo remapeia a marca, que continua na palavra', () => {
    // é o caso de toda tecla digitada: o bloco casa por similaridade e a
    // edição de dentro dele move a marca
    const depois = reconcileBlocks(comMarca('A ação começa.'), 'A ação começa hoje mesmo.')
    expect(cercado(depois)).toEqual(['ação'])
  })

  it('digitar ANTES da marca empurra ela junto', () => {
    const depois = reconcileBlocks(comMarca('A ação começa.'), 'Olha: A ação começa.')
    expect(cercado(depois)).toEqual(['ação'])
  })

  it('inserir um parágrafo ACIMA não mexe nas marcas do de baixo', () => {
    /*
     * O caso que o operador mais vai fazer: corrigir alguma coisa lá em cima. As
     * marcas são presas ao BLOCO, então o de baixo nem fica sabendo — é o mesmo
     * motivo de a âncora usar blockId em vez de posição no roteiro inteiro.
     */
    const depois = reconcileBlocks(comMarca('A ação começa.'), 'Boa noite.\n\nA ação começa.')
    expect(depois).toHaveLength(2)
    expect(cercado(depois, 1)).toEqual(['ação'])
  })

  it('apagar a palavra marcada leva a marca junto', () => {
    const depois = reconcileBlocks(comMarca('A ação começa.'), 'A  começa.')
    expect(depois[0].marcas).toBeUndefined()
  })

  it('parágrafo que nasceu agora não tem marca — não havia de onde herdar', () => {
    const depois = reconcileBlocks(comMarca('A ação começa.'), 'A ação começa.\n\nParágrafo novo.')
    expect(depois[1].marcas).toBeUndefined()
  })

  it('bloco sem marca nenhuma não carrega o campo, para o .valendo não engordar', () => {
    const depois = reconcileBlocks([{ id: 'b1', kind: 'speech', text: 'sem marca' }], 'sem marca nenhuma')
    expect('marcas' in depois[0]).toBe(false)
  })
})

describe('repartir um trecho do texto inteiro entre os blocos', () => {
  /*
   * "Primeiro bloco.\n\nSegundo bloco."
   *  0123456789...      ^ o segundo começa em 17
   */
  const blocos: Block[] = [
    { id: 'b1', kind: 'speech', text: 'Primeiro bloco.' },
    { id: 'b2', kind: 'speech', text: 'Segundo bloco.' }
  ]
  const inteiro = serializeBlocks(blocos)

  it('trecho dentro de um bloco só devolve uma fatia, rebaseada', () => {
    // "bloco" do primeiro: posições 9 a 14 do texto inteiro
    expect(inteiro.slice(9, 14)).toBe('bloco')
    expect(fatiasPorBloco(blocos, 9, 14)).toEqual([{ blockId: 'b1', de: 9, ate: 14 }])
  })

  it('trecho que atravessa dois blocos devolve duas fatias', () => {
    const fatias = fatiasPorBloco(blocos, 9, inteiro.length)
    expect(fatias).toHaveLength(2)
    expect(fatias[0]).toEqual({ blockId: 'b1', de: 9, ate: 15 })
    expect(fatias[1]).toEqual({ blockId: 'b2', de: 0, ate: 14 })
  })

  it('a linha em branco entre os blocos não pertence a ninguém', () => {
    // posições 15 e 16 são o separador; pedir só elas não devolve fatia nenhuma
    expect(inteiro.slice(15, 17)).toBe('\n\n')
    expect(fatiasPorBloco(blocos, 15, 17)).toEqual([])
  })

  it('trecho de tamanho zero não devolve nada', () => {
    expect(fatiasPorBloco(blocos, 9, 9)).toEqual([])
  })

  it('trecho maior que o texto é aparado, não estoura', () => {
    const fatias = fatiasPorBloco(blocos, 0, 9999)
    expect(fatias[1]).toEqual({ blockId: 'b2', de: 0, ate: 14 })
  })
})

describe('o caminho de volta: as marcas nas coordenadas do texto inteiro', () => {
  const blocos: Block[] = [
    { id: 'b1', kind: 'speech', text: 'Primeiro bloco.', marcas: [{ de: 9, ate: 14, cor: '#e5484d' }] },
    { id: 'b2', kind: 'speech', text: 'Segundo bloco.', marcas: [{ de: 0, ate: 7, negrito: true }] }
  ]
  const inteiro = serializeBlocks(blocos)

  it('devolve as marcas dos dois blocos cercando as palavras certas', () => {
    /*
     * A prova é contra o TEXTO, não contra números que eu escrevi: fatiar a
     * string com o que a função devolveu tem de dar a palavra que o operador
     * pintou. Índices decorados aqui já me enganaram duas vezes.
     */
    const marcas = marcasNoTexto(blocos)
    expect(marcas.map((m) => inteiro.slice(m.de, m.ate))).toEqual(['bloco', 'Segundo'])
  })

  it('preserva os atributos, e não só as posições', () => {
    const marcas = marcasNoTexto(blocos)
    expect(marcas[0].cor).toBe('#e5484d')
    expect(marcas[1].negrito).toBe(true)
  })

  it('é o inverso exato de fatiasPorBloco', () => {
    // as duas traduzem entre os mesmos dois sistemas, em direções opostas —
    // se um dia discordarem, o editor pinta num lugar e a transmissão noutro
    for (const marca of marcasNoTexto(blocos)) {
      const volta = fatiasPorBloco(blocos, marca.de, marca.ate)
      expect(volta).toHaveLength(1)
      const bloco = blocos.find((b) => b.id === volta[0].blockId)!
      expect(bloco.text.slice(volta[0].de, volta[0].ate)).toBe(inteiro.slice(marca.de, marca.ate))
    }
  })

  it('bloco sem marca nenhuma não contribui com nada', () => {
    expect(marcasNoTexto([{ id: 'b1', kind: 'speech', text: 'Nada aqui.' }])).toEqual([])
  })
})
