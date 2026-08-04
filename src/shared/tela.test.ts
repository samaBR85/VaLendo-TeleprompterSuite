import { describe, expect, it } from 'vitest'
import {
  alinhamentoDoRecado,
  ANGULO_PADRAO,
  animacaoDoFundo,
  ANIMACOES,
  apoioDoRecado,
  classeDoFundo,
  variaveisDoFundo,
  corpoDoRecado,
  CORPO_MAX,
  CORPO_MIN,
  FORCA_MIN,
  FREQ_MAX,
  fundoDaTela,
  telaNova
} from './tela'

describe('o fundo da tela', () => {
  it('uma cor só sai chapada, não como gradiente de uma parada', () => {
    // chapado é mais barato de compor, e é o que foi pedido ao escolher chapado
    expect(fundoDaTela({ de: '#16253f' })).toBe('#16253f')
  })

  it('a segunda cor é o que faz virar gradiente', () => {
    const css = fundoDaTela({ de: '#12456b', ate: '#8e3fd4' })
    expect(css).toContain('linear-gradient')
    expect(css).toContain('#12456b')
    expect(css).toContain('#8e3fd4')
  })

  it('sem ângulo escolhido usa o padrão', () => {
    expect(fundoDaTela({ de: '#000', ate: '#fff' })).toContain(`${ANGULO_PADRAO}deg`)
  })

  it('ângulo ZERO é um ângulo, não a falta de um', () => {
    /*
     * A armadilha é escrever `angulo ?? PADRAO` com um valor que pode ser 0:
     * o gradiente de baixo para cima viraria diagonal sozinho, e o operador
     * veria o ângulo "0" no controle com a tela mostrando outra coisa.
     */
    expect(fundoDaTela({ de: '#000', ate: '#fff', angulo: 0 })).toContain('0deg')
  })

  it('fundo faltando ou cor vazia não deixa a tela sem background', () => {
    // um `background: undefined` deixaria aparecer o que estiver atrás do
    // cartão — que é justamente o roteiro que ele deveria estar cobrindo
    for (const caso of [undefined, { de: '' }, { de: '   ' }]) {
      expect(fundoDaTela(caso)).toBe('#000000')
    }
  })
})

describe('o recado', () => {
  it('topo e pé se apoiam em pontas opostas, meio no centro', () => {
    expect(apoioDoRecado('topo')).toBe('flex-start')
    expect(apoioDoRecado('meio')).toBe('center')
    expect(apoioDoRecado('pe')).toBe('flex-end')
  })

  it('sem posição escolhida fica no meio', () => {
    expect(apoioDoRecado(undefined)).toBe('center')
  })

  it('o corpo acompanha a altura do quadro, e não o pixel', () => {
    /*
     * O mesmo cartão é desenhado num ladrilho de ~99px de altura e numa saída
     * de 1080. Guardar o corpo em pixel daria um recado que cobre o ladrilho
     * inteiro ou some na tela grande — a proporção é o que se mantém.
     */
    const naGaveta = corpoDoRecado(11, 99)
    const noAr = corpoDoRecado(11, 1080)
    expect(naGaveta / 99).toBeCloseTo(noAr / 1080, 10)
    expect(noAr).toBeCloseTo(118.8, 5)
  })

  it('o corpo é preso à escala em qualquer valor doido', () => {
    expect(corpoDoRecado(-40, 1000)).toBeCloseTo((1000 * CORPO_MIN) / 100, 6)
    expect(corpoDoRecado(9999, 1000)).toBeCloseTo((1000 * CORPO_MAX) / 100, 6)
    expect(corpoDoRecado(undefined, 1000)).toBeGreaterThan(0)
  })
})

describe('os fundos animados', () => {
  it('cada efeito vira a classe do seu nome', () => {
    for (const nome of ANIMACOES) {
      expect(classeDoFundo({ de: '#000', animacao: nome })).toBe(`tela-fundo tela-${nome}`)
    }
  })

  it('fundo parado não ganha classe nenhuma', () => {
    expect(classeDoFundo({ de: '#000' })).toBeUndefined()
    expect(classeDoFundo({ de: '#000', ate: '#fff' })).toBeUndefined()
  })

  it('nome desconhecido é fundo parado, não uma classe que não existe', () => {
    /*
     * Um `.tela-fulano` sem regra nenhuma NÃO dá erro: ele só deixa o cartão
     * sem fundo. E cartão sem fundo no ar é o roteiro aparecendo por baixo do
     * que deveria estar cobrindo ele — na tela do apresentador, ao vivo.
     */
    expect(animacaoDoFundo({ de: '#000', animacao: 'plasma' as never })).toBeNull()
    expect(classeDoFundo({ de: '#000', animacao: 'plasma' as never })).toBeUndefined()
  })

  it('as duas cores viram variáveis para o CSS', () => {
    const v = variaveisDoFundo({ de: '#123456', ate: '#abcdef' })
    expect(v['--tela-de']).toBe('#123456')
    expect(v['--tela-ate']).toBe('#abcdef')
  })

  it('sem segunda cor, ela repete a primeira em vez de sumir', () => {
    // um efeito que precisa de duas cores e recebe uma só desaparece da tela;
    // monocromático é feio, invisível é defeito
    expect(variaveisDoFundo({ de: '#123456' })['--tela-ate']).toBe('#123456')
  })

  it('frequência e intensidade saem como números puros, para caber em calc()', () => {
    /*
     * Com unidade, `calc(22s / var(--tela-freq))` não computa e a animação
     * inteira some — sem erro no console, porque uma propriedade inválida é
     * simplesmente descartada. Daí a divisão por 100 acontecer aqui.
     */
    const v = variaveisDoFundo({ de: '#000', frequencia: 200, intensidade: 50 })
    expect(v['--tela-freq']).toBe('2')
    expect(v['--tela-forca']).toBe('0.5')
    expect(v['--tela-freq']).not.toMatch(/[a-z%]/)
  })

  it('sem os campos, os dois valem 1 — que é o de sempre', () => {
    const v = variaveisDoFundo({ de: '#000' })
    expect(v['--tela-freq']).toBe('1')
    expect(v['--tela-forca']).toBe('1')
  })

  it('valores fora da escala são presos, não passam adiante', () => {
    const doido = variaveisDoFundo({ de: '#000', frequencia: 9999, intensidade: -50 })
    expect(Number(doido['--tela-freq'])).toBeLessThanOrEqual(FREQ_MAX / 100)
    expect(Number(doido['--tela-forca'])).toBeGreaterThanOrEqual(FORCA_MIN / 100)
    // frequência ZERO dividiria a duração por zero: a animação viraria infinita
    expect(Number(variaveisDoFundo({ de: '#000', frequencia: 0 })['--tela-freq'])).toBeGreaterThan(0)
  })

  it('são seis, e sem nome repetido', () => {
    expect(ANIMACOES).toHaveLength(6)
    expect(new Set(ANIMACOES).size).toBe(6)
  })
})

describe('a distância da transição no gradiente', () => {
  it('sem o campo, reproduz o gradiente de borda a borda', () => {
    const css = fundoDaTela({ de: '#000', ate: '#fff' })
    expect(css).toContain('#000 0%')
    expect(css).toContain('#fff 100%')
  })

  it('as duas paradas andam do centro para fora, simetricamente', () => {
    const css = fundoDaTela({ de: '#000', ate: '#fff', fade: 50 })
    expect(css).toContain('25%')
    expect(css).toContain('75%')
  })

  it('em zero as paradas se encontram: duas metades chapadas', () => {
    const css = fundoDaTela({ de: '#000', ate: '#fff', fade: 0 })
    expect(css).toContain('#000 50%')
    expect(css).toContain('#fff 50%')
  })

  it('as paradas nunca saem de ordem', () => {
    for (const fade of [-30, 0, 37, 100, 480]) {
      const paradas = [...fundoDaTela({ de: '#000', ate: '#fff', fade }).matchAll(/([\d.]+)%/g)].map((m) =>
        Number(m[1])
      )
      expect(paradas[0], `fade ${fade}`).toBeLessThanOrEqual(paradas[1])
      expect(paradas[0]).toBeGreaterThanOrEqual(0)
      expect(paradas[1]).toBeLessThanOrEqual(100)
    }
  })
})

describe('o alinhamento do parágrafo', () => {
  it('passa os três valores adiante', () => {
    expect(alinhamentoDoRecado('left')).toBe('left')
    expect(alinhamentoDoRecado('center')).toBe('center')
    expect(alinhamentoDoRecado('right')).toBe('right')
  })

  it('sem campo nenhum cai no centro, e não no que o CSS herdar', () => {
    /*
     * As telas feitas ANTES deste controle existir não têm o campo, e foram
     * escritas centralizadas. Deixar o `text-align` sem valor faria o CSS
     * herdar o início da linha — e o recado que o operador deixou no meio
     * amanheceria encostado na esquerda, na tela do apresentador, sem que
     * ninguém tivesse mexido em nada.
     */
    expect(alinhamentoDoRecado(undefined)).toBe('center')
  })

  it('valor estranho também cai no centro', () => {
    expect(alinhamentoDoRecado('meio' as never)).toBe('center')
  })
})

describe('a tela que nasce do botão', () => {
  it('vem chapada e sem recado — quem quiser gradiente escolhe', () => {
    const { fundo, recado } = telaNova()
    expect(fundo.ate).toBeUndefined()
    expect(fundoDaTela(fundo)).toBe(fundo.de)
    expect(recado.texto).toBe('')
  })

  it('o corpo padrão está dentro da escala do controle', () => {
    const { recado } = telaNova()
    expect(recado.corpoPct).toBeGreaterThanOrEqual(CORPO_MIN)
    expect(recado.corpoPct).toBeLessThanOrEqual(CORPO_MAX)
  })
})
