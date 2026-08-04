import { describe, expect, it } from 'vitest'
import { mascaraDeFoco } from './focoDaLeitura'

/** As seis paradas do gradiente, em porcentagem, na ordem em que aparecem. */
function paradas(mascara: string): number[] {
  return [...mascara.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]))
}

describe('a janela segue a marca de leitura', () => {
  it('fica centrada na marca, e não no meio da tela', () => {
    // com a marca em 70% a janela limpa tem de estar EM VOLTA de 70%. Antes as
    // paradas eram fixas em 30%–52%, então a marca caía na zona apagada e o
    // texto sob ela ficava mais escuro que o texto acima
    const [, , limpoAcima, limpoAbaixo] = paradas(mascaraDeFoco(0.7, 60))
    expect(limpoAcima).toBeLessThan(70)
    expect(limpoAbaixo).toBeGreaterThan(70)
  })

  it('cobre a tela inteira, seja onde for a marca', () => {
    for (const linha of [0, 0.15, 0.38, 0.5, 0.85, 1]) {
      const p = paradas(mascaraDeFoco(linha, 60))
      expect(p[0], `topo com a marca em ${linha}`).toBeCloseTo(0, 1)
      expect(p[5], `base com a marca em ${linha}`).toBeCloseTo(100, 1)
    }
  })

  it('as paradas nunca saem de ordem', () => {
    // um gradiente com paradas fora de ordem não dá erro: o navegador as
    // reordena em silêncio, e o esmaecimento sai errado sem nada avisar
    for (const linha of [0, 0.2, 0.38, 0.6, 1]) {
      for (const foco of [0, 25, 60, 100]) {
        const p = paradas(mascaraDeFoco(linha, foco))
        for (let i = 1; i < p.length; i += 1) {
          expect(p[i], `marca ${linha}, foco ${foco}, parada ${i}`).toBeGreaterThanOrEqual(p[i - 1])
        }
      }
    }
  })
})

describe('o controle vai ao contrário: mais alto é mais apagado', () => {
  it('no mínimo a janela é larga; no máximo, uma fresta', () => {
    const larguraDaJanela = (foco: number): number => {
      const p = paradas(mascaraDeFoco(0.38, foco))
      return p[3] - p[2]
    }
    expect(larguraDaJanela(0)).toBeGreaterThan(larguraDaJanela(50))
    expect(larguraDaJanela(50)).toBeGreaterThan(larguraDaJanela(100))
  })

  it('aguenta valor fora da escala sem quebrar o gradiente', () => {
    for (const foco of [-40, 0, 100, 999]) {
      const p = paradas(mascaraDeFoco(0.38, foco))
      expect(p).toHaveLength(6)
      expect(Math.min(...p)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...p)).toBeLessThanOrEqual(100)
    }
  })
})

describe('o padrão devolve a tela de antes', () => {
  it('reproduz as paradas escritas à mão, com meio ponto de folga', () => {
    /*
     * A máscara antiga, fixa no código, com a marca no padrão de 38%:
     *
     *   transparent 0% · 12% · 30% ── 52% · 78% · transparent 100%
     *
     * Quem não tocar no controle novo não pode ver diferença nenhuma — é a
     * condição para isto entrar sem avisar ninguém. Se algum dia a calibragem
     * for mexida, é este caso que avisa que a tela de todo mundo mudou junto.
     *
     * A folga é de UM ponto percentual, e não de meio, porque as paradas
     * antigas não eram proporcionais: medidas contra o espaço de cada lado,
     * elas gastavam 0,684 acima e 0,645 abaixo. Assimetria de acerto manual,
     * não de projeto — os dois lados agora gastam a MESMA proporção do que
     * têm, que é justamente o que faz a janela seguir a marca sem entortar.
     * O preço é ~0,9pp no ponto médio de um esmaecimento, onde a diferença
     * entre 12% e 12,9% de opacidade não é vista por ninguém.
     */
    const p = paradas(mascaraDeFoco(0.38, 60))
    const antigas = [0, 12, 30, 52, 78, 100]
    for (let i = 0; i < 6; i += 1) {
      expect(Math.abs(p[i] - antigas[i]), `parada ${i}: ${p[i]}% contra ${antigas[i]}%`).toBeLessThanOrEqual(1)
    }
  })
})

describe('o extremo continua legível', () => {
  it('no máximo a faixa nítida ainda cabe uma linha', () => {
    /*
     * Uma linha no corpo padrão (64px, entrelinha 1.35) ocupa ~8% de uma tela
     * de 1080. Se a faixa nítida fechar abaixo disso, a linha SOB A MARCA sai
     * meio apagada no topo e no pé — o oposto do que o esmaecimento existe
     * para fazer. "Estreito" é uma linha; menos que isso é defeito.
     */
    const p = paradas(mascaraDeFoco(0.38, 100))
    expect(p[3] - p[2]).toBeGreaterThanOrEqual(7)
  })
})
