import { describe, expect, it } from 'vitest'
import {
  CONFLITO_MINIMO,
  CONTRASTE_MINIMO,
  PALETA_CURTA,
  conflita,
  contraste,
  legivelNo,
  luminancia,
  separacao
} from './paleta'

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

  /*
   * A promessa que a paleta faz, medida na conta que importa.
   *
   * Nao e distancia crua entre valores de arquivo: `separacao` mede em Lab e
   * devolve o PIOR dos dois olhares (visao comum e deuteranopia), que e o
   * unico numero com o qual "mais separado" quer dizer alguma coisa.
   *
   * O piso de 25 nao foi escolhido para o teste passar. A primeira versao
   * desta paleta saiu da mao e tinha um par a 7,5 — quase o mesmo desenho para
   * quem nao separa vermelho de verde. Estas oito vieram de uma busca com uma
   * cor por familia nomeavel, e o pior par delas e 27,4. O piso guarda essa
   * conquista com uma folga pequena de propósito: quem trocar uma cor por
   * gosto vai descobrir aqui se estragou o conjunto.
   */
  it('as oito se separam entre si, pelo pior dos dois olhares', () => {
    let pior = Infinity
    let culpado = ''
    for (let i = 0; i < PALETA_CURTA.length; i++) {
      for (let j = i + 1; j < PALETA_CURTA.length; j++) {
        const d = separacao(PALETA_CURTA[i], PALETA_CURTA[j])
        if (d < pior) {
          pior = d
          culpado = `${PALETA_CURTA[i]} x ${PALETA_CURTA[j]}`
        }
      }
    }
    expect(pior, culpado).toBeGreaterThanOrEqual(25)
  })

  it('e nenhuma delas conflita com as outras sete', () => {
    // o aviso de conflito nunca deve disparar DENTRO da paleta: ela foi
    // construida para nao ter esse problema, e um aviso que acende sozinho
    // ensina o olho a ignorar o aviso
    for (const cor of PALETA_CURTA) {
      const outras = PALETA_CURTA.filter((c) => c !== cor)
      expect(conflita(cor, outras), cor).toBe(false)
    }
  })

  it('cobra menos para avisar do que a paleta garante', () => {
    // se o limiar do aviso encostasse no piso da paleta, qualquer arredondamento
    // faria as oito acenderem umas contra as outras
    expect(CONFLITO_MINIMO).toBeLessThan(25)
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
