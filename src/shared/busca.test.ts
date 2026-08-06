import { describe, expect, it } from 'vitest'
import { achadosParaPintar, acharTodas, dobrar, indiceDaProxima } from './busca'

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
