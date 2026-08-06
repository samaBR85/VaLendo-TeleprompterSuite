import { describe, expect, it } from 'vitest'
import { achadosParaPintar, acharTodas, dobrar, faixasDepoisDeTrocar, indiceDaProxima , type Ocorrencia } from './busca'

describe('a dobra de caixa e acento', () => {
  it('não muda o tamanho da string — é disto que dependem todos os índices', () => {
    /*
     * O teste que sustenta a função inteira. `'ação'.normalize('NFD')` tem SEIS
     * caracteres; se a dobra fosse feita na string toda, todo índice depois do
     * primeiro acento apontaria para o lugar errado, e o `setSelectionRange`
     * selecionaria a palavra vizinha.
     */
    for (const texto of [
      'ação',
      'ÀÉÎÕÜ çñ',
      'Straße',
      'İstanbul',
      'HARI\nROBSON',
      'sem nada de especial'
    ]) {
      expect(dobrar(texto)).toHaveLength(texto.length)
    }
  })

  it('tira a caixa e o acento', () => {
    expect(dobrar('Ação')).toBe('acao')
    expect(dobrar('CORAÇÃO')).toBe('coracao')
    expect(dobrar('Ünïcô')).toBe('unico')
  })

  it('o I turco cabe, porque o ponto sai como acento', () => {
    // escrevi este teste esperando que ele NÃO coubesse, e ele coube: 'İ'
    // decompõe em 'I' + ponto combinante, o ponto é removido como qualquer
    // acento, e sobra 'i' com um caractere. O guarda de tamanho continua no
    // lugar para o que não couber; este simplesmente não é um desses casos
    expect(dobrar('İ')).toBe('i')
    expect(dobrar('İ')).toHaveLength(1)
  })

  it('o tamanho aguenta um varredão de gente estranha', () => {
    const bichos =
      'ÁÀÂÃÄÅĀĂĄÇĆĈĊČÐĎÈÉÊËĒĔĖĘĚĜĞĠĢĤĦÌÍÎÏĨĪĬĮİĲĴĶĹĻĽĿŁÑŃŅŇŊÒÓÔÕÖØŌŎŐŒŔŖŘŚŜŞŠŢŤŦÙÚÛÜŨŪŬŮŰŲŴÝŶŸŹŻŽßẞǄǅǆ'
    for (const ch of bichos) expect(dobrar(ch)).toHaveLength(ch.length)
    expect(dobrar(bichos)).toHaveLength(bichos.length)
  })
})

describe('achar as ocorrências', () => {
  const roteiro = 'Boa noite. Hoje a ação começa cedo.\nA AÇÃO principal é às oito.'

  it('acha ignorando caixa e acento, com os índices certos', () => {
    const achadas = acharTodas(roteiro, 'acao')
    expect(achadas).toHaveLength(2)
    // e os índices recortam a palavra ORIGINAL, com acento e tudo
    expect(achadas.map((o) => roteiro.slice(o.inicio, o.fim))).toEqual(['ação', 'AÇÃO'])
  })

  it('procurar com acento acha o sem acento também', () => {
    expect(acharTodas('a acao e a ação', 'ação')).toHaveLength(2)
  })

  it('agulha vazia não acha nada — senão a busca marcaria o texto inteiro', () => {
    expect(acharTodas(roteiro, '')).toEqual([])
  })

  it('não se sobrepõe: "aa" em "aaaa" são duas, não três', () => {
    // é o que todo editor faz; quem aperta "próxima" quer atravessar o texto,
    // não andar um caractere
    expect(acharTodas('aaaa', 'aa')).toEqual([
      { inicio: 0, fim: 2 },
      { inicio: 2, fim: 4 }
    ])
  })

  it('acha através da quebra de linha, porque o roteiro é um texto só', () => {
    expect(acharTodas('primeiro\nsegundo', 'o\ns')).toHaveLength(1)
  })

  it('nada a achar devolve lista vazia, não erro', () => {
    expect(acharTodas(roteiro, 'zebra')).toEqual([])
  })
})

describe('qual é a próxima', () => {
  const tres = [
    { inicio: 10, fim: 14 },
    { inicio: 30, fim: 34 },
    { inicio: 50, fim: 54 }
  ]

  it('para a frente, pega a primeira daí em diante', () => {
    expect(indiceDaProxima(tres, 0)).toBe(0)
    expect(indiceDaProxima(tres, 11)).toBe(1)
    expect(indiceDaProxima(tres, 31)).toBe(2)
  })

  it('para a frente, uma que começa NO cursor conta como próxima', () => {
    // é ela que acabou de ser selecionada ao abrir a busca em cima da palavra
    expect(indiceDaProxima(tres, 30)).toBe(1)
  })

  it('dá a volta no fim, em vez de dizer "não achei mais"', () => {
    // o beco sem saída seria pior: o que falta pode estar acima do cursor
    expect(indiceDaProxima(tres, 60)).toBe(0)
  })

  it('para trás, pega a última antes do cursor', () => {
    expect(indiceDaProxima(tres, 40, true)).toBe(1)
    expect(indiceDaProxima(tres, 31, true)).toBe(1)
  })

  it('para trás, uma que começa NO cursor não conta — senão ficaria parado nela', () => {
    expect(indiceDaProxima(tres, 30, true)).toBe(0)
  })

  it('para trás, dá a volta no começo', () => {
    expect(indiceDaProxima(tres, 0, true)).toBe(2)
  })

  it('sem ocorrência nenhuma, devolve -1', () => {
    expect(indiceDaProxima([], 0)).toBe(-1)
    expect(indiceDaProxima([], 0, true)).toBe(-1)
  })
})

describe('quais achados um "pintar todas" deve pular', () => {
  /*
   *   linha 0  HARI            (dono: vermelho)
   *   linha 1  fala do Hari    (dono: vermelho)
   *   linha 2  (vazia)
   *   linha 3  narração        (sem dono)
   */
  const TEXTO = 'HARI\nfala do Hari\n\nnarração sem dono'
  const DONOS = ['#e5484d', '#e5484d', null, null]
  const achados = acharTodas(TEXTO, 'a')

  it('por padrão, pula os que caem numa fala de apresentador', () => {
    const pintar = achadosParaPintar(achados, TEXTO, DONOS, false)
    expect(pintar.length).toBeGreaterThan(0)
    expect(pintar.length).toBeLessThan(achados.length)
    // todos os que sobraram estão na última linha, a sem dono
    for (const a of pintar) expect(a.inicio).toBeGreaterThan(TEXTO.indexOf('narração'))
  })

  it('com SOBRESCREVER ligado, pinta todos', () => {
    expect(achadosParaPintar(achados, TEXTO, DONOS, true)).toEqual(achados)
  })

  it('sem apresentador nenhum, o interruptor não muda nada', () => {
    const sem = [null, null, null, null]
    expect(achadosParaPintar(achados, TEXTO, sem, false)).toEqual(achados)
  })

  it('lista vazia continua vazia', () => {
    expect(achadosParaPintar([], TEXTO, DONOS, false)).toEqual([])
  })
})

describe('onde cada troca cai no texto novo', () => {
  /*
   * A prova é sempre contra o TEXTO: troca de verdade, e depois fatia o
   * resultado com o que a função devolveu. Se as duas contas discordarem, a
   * cor cairia ao lado da palavra — que é o estrago que isto existe para
   * impedir.
   */
  const trocarTudo = (texto: string, achados: Ocorrencia[], novo: string): string => {
    let fora = texto
    for (let i = achados.length - 1; i >= 0; i--) {
      fora = fora.slice(0, achados[i].inicio) + novo + fora.slice(achados[i].fim)
    }
    return fora
  }

  it('palavra mais LONGA: as seguintes andam para a frente', () => {
    const texto = 'o gato e o gato e o gato'
    const achados = acharTodas(texto, 'gato')
    const depois = trocarTudo(texto, achados, 'cachorro')
    const faixas = faixasDepoisDeTrocar(achados, 'cachorro'.length)
    expect(faixas.map((f) => depois.slice(f.inicio, f.fim))).toEqual([
      'cachorro',
      'cachorro',
      'cachorro'
    ])
  })

  it('palavra mais CURTA: as seguintes andam para trás', () => {
    const texto = 'o cachorro e o cachorro'
    const achados = acharTodas(texto, 'cachorro')
    const depois = trocarTudo(texto, achados, 'boi')
    const faixas = faixasDepoisDeTrocar(achados, 'boi'.length)
    expect(faixas.map((f) => depois.slice(f.inicio, f.fim))).toEqual(['boi', 'boi'])
  })

  it('mesmo tamanho: nada anda', () => {
    const texto = 'o gato e o gato'
    const achados = acharTodas(texto, 'gato')
    expect(faixasDepoisDeTrocar(achados, 4)).toEqual(achados)
  })

  it('trocar por NADA devolve faixas vazias', () => {
    // não há o que pintar quando a palavra foi apagada
    const achados = acharTodas('o gato e o gato', 'gato')
    for (const f of faixasDepoisDeTrocar(achados, 0)) expect(f.fim).toBe(f.inicio)
  })

  it('um achado só sai onde já estava', () => {
    const texto = 'só um gato aqui'
    const achados = acharTodas(texto, 'gato')
    const depois = trocarTudo(texto, achados, 'peixe')
    const [f] = faixasDepoisDeTrocar(achados, 5)
    expect(depois.slice(f.inicio, f.fim)).toBe('peixe')
  })
})
