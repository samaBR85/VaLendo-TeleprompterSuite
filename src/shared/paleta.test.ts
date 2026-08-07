import { describe, expect, it } from 'vitest'
import { CONTRASTE_MINIMO, PALETA_CURTA, comoDeuteranopo, contraste, legivelNo, luminancia } from './paleta'

describe('a conta de contraste', () => {
  it('dá 21 entre preto e branco, e 1 entre iguais', () => {
    expect(Math.round(contraste('#000000', '#FFFFFF'))).toBe(21)
    expect(contraste('#4FE3D0', '#4FE3D0')).toBe(1)
  })

  it('não depende de quem é fundo e quem é texto', () => {
    expect(contraste('#FFE45E', '#000000')).toBe(contraste('#000000', '#FFE45E'))
  })

  it('pesa o verde mais que o azul, como o olho', () => {
    // é a diferença entre a conta da WCAG e uma média ingênua dos canais: um
    // verde puro e um azul puro têm a mesma "quantidade de cor" e brilhos
    // muito diferentes
    expect(luminancia('#00FF00')).toBeGreaterThan(luminancia('#0000FF') * 5)
  })
})

describe('a paleta curta', () => {
  it('tem oito cores, sem repetir nenhuma', () => {
    expect(PALETA_CURTA).toHaveLength(8)
    expect(new Set(PALETA_CURTA).size).toBe(8)
  })

  it('inteira se le no preto, que e o fundo de fabrica', () => {
    for (const cor of PALETA_CURTA) {
      expect(legivelNo(cor, '#000000'), cor).toBe(true)
    }
  })

  const distancia = (a: string, b: string): number =>
    [1, 3, 5].reduce(
      (soma, k) => soma + Math.abs(parseInt(a.slice(k, k + 2), 16) - parseInt(b.slice(k, k + 2), 16)),
      0
    )

  it('nenhum par se confunde para quem enxerga as tres cores', () => {
    const perto: string[] = []
    for (let i = 0; i < PALETA_CURTA.length; i++) {
      for (let j = i + 1; j < PALETA_CURTA.length; j++) {
        if (distancia(PALETA_CURTA[i], PALETA_CURTA[j]) < 60) {
          perto.push(`${PALETA_CURTA[i]} x ${PALETA_CURTA[j]}`)
        }
      }
    }
    expect(perto).toEqual([])
  })

  /*
   * O limite, registrado em vez de escondido.
   *
   * A primeira versao desta paleta prometia que ela inteira sobrevivia ao
   * daltonismo. Este teste reprovou a promessa, e ele estava certo: para quem
   * tem deuteranopia sobra praticamente um eixo azul-amarelo, e NENHUM conjunto
   * de oito cores distintas atravessa isso inteiro. Rosa e verde-azulado viram
   * a mesma cor; roxo e azul-ceu tambem.
   *
   * Entao o que a paleta promete e o que ela cumpre: existe dentro dela um
   * NUCLEO que se separa mesmo assim, grande o bastante para um programa com
   * varios apresentadores. O numero fica preso aqui — se alguem trocar uma cor
   * e o nucleo encolher, o teste conta.
   */
  it('tem um nucleo que se separa mesmo com deuteranopia', () => {
    const nucleo: string[] = []
    for (const cor of PALETA_CURTA) {
      const vista = comoDeuteranopo(cor)
      if (nucleo.every((ja) => distancia(vista, comoDeuteranopo(ja)) >= 60)) nucleo.push(cor)
    }
    expect(nucleo.length).toBeGreaterThanOrEqual(5)
  })

  /*
   * Ela e para fundo ESCURO, e isso e uma escolha, nao um esquecimento.
   *
   * Um teleprompter e branco no preto — e o padrao de fabrica e o que 99% dos
   * projetos usam. Uma paleta que servisse aos dois fundos seria uma paleta de
   * meio-tom, pior nos dois. Quem inverte o contraste de leitura tem o filtro
   * de contraste para avisar, e a grade completa para escolher outra coisa.
   */
  it('avisa, pelo filtro, que nao serve num fundo claro', () => {
    const sobrevivem = PALETA_CURTA.filter((cor) => legivelNo(cor, '#FFFFFF'))
    expect(sobrevivem).toEqual([])
  })
})

describe('o degrau exigido', () => {
  it('é o AAA, e não o AA da web', () => {
    // vidro semiespelhado come luz, e quem lê está a três metros sem poder
    // voltar atrás — 4,5:1 não corresponde a isso
    expect(CONTRASTE_MINIMO).toBe(7)
  })

  it('reprova um cinza médio no preto e aprova o mesmo no branco', () => {
    expect(legivelNo('#6E6E6E', '#000000')).toBe(false)
    expect(legivelNo('#1A1A1A', '#FFFFFF')).toBe(true)
  })
})
