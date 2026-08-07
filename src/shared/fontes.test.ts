import { describe, expect, it } from 'vitest'
import {
  EDITOR_FONTE_PADRAO,
  FONTES_DO_EDITOR,
  FONT_OPTIONS,
  FONTE_EMBUTIDA,
  fonteDoEditorValida
} from './defaults'

/**
 * As duas listas de fonte, e a peneira entre elas.
 *
 * As listas eram uma só. Separá-las criou um caso que não existia: uma escolha
 * de editor gravada por uma versão anterior pode apontar para uma família que
 * agora só existe na saída. Este arquivo prende as regras que impedem essa
 * escolha de virar um menu mentindo sobre o que está na tela.
 */
describe('a lista da saída não se mexe', () => {
  it('continua com as sete de sempre', () => {
    expect(FONT_OPTIONS).toHaveLength(7)
  })

  it('e a Inter continua sendo a primeira', () => {
    // é a única variável da saída, e por isso a única em que o controle de peso
    // desenha os seis degraus — ver `pesosQueDesenham`
    expect(FONT_OPTIONS[0].value).toBe(FONTE_EMBUTIDA)
  })
})

describe('a lista do editor', () => {
  it('abre pela fonte que o app usa por padrão', () => {
    // quem nunca mexeu no menu tem de encontrar a própria fonte no topo, e não
    // caçá-la no meio de dez
    expect(FONTES_DO_EDITOR[0].value).toBe(EDITOR_FONTE_PADRAO)
  })

  it('não repete família nenhuma', () => {
    const valores = FONTES_DO_EDITOR.map((f) => f.value)
    expect(new Set(valores).size).toBe(valores.length)
  })

  it('nomeia cada fonte em vez de descrever categorias', () => {
    // a diferença que justifica as duas listas: a saída aceita o que a máquina
    // tiver instalado e por isso fala em "Com serifa"; aqui as dez viajam
    // dentro do app, então cada uma tem nome próprio e pode ser chamada por ele
    const categorias = ['font.system', 'font.sans', 'font.serif', 'font.mono', 'font.condensed', 'font.legible']
    for (const chave of FONTES_DO_EDITOR.map((f) => f.chave)) {
      expect(categorias).not.toContain(chave)
    }
  })

  it('sempre tem uma reserva do sistema depois da embutida', () => {
    // se um build sair sem o arquivo da fonte, o editor cai numa família
    // conhecida em vez da fonte padrão do navegador no meio de um roteiro
    for (const fonte of FONTES_DO_EDITOR) {
      expect(fonte.value.split(',').length).toBeGreaterThan(1)
    }
  })
})

describe('fonteDoEditorValida', () => {
  it('devolve intacta uma família que está na lista', () => {
    for (const fonte of FONTES_DO_EDITOR) {
      expect(fonteDoEditorValida(fonte.value)).toBe(fonte.value)
    }
  })

  it('devolve a padrão para quem tinha escolhido "Com serifa" no editor', () => {
    // o caso real da migração: essa pilha existia na lista compartilhada e
    // continua existindo na SAÍDA, mas saiu do menu da Edição
    const serifaDaSaida = FONT_OPTIONS.find((f) => f.chave === 'font.serif')!.value
    expect(fonteDoEditorValida(serifaDaSaida)).toBe(EDITOR_FONTE_PADRAO)
  })

  it('devolve a padrão para ausente, vazio e lixo', () => {
    expect(fonteDoEditorValida(undefined)).toBe(EDITOR_FONTE_PADRAO)
    expect(fonteDoEditorValida('')).toBe(EDITOR_FONTE_PADRAO)
    expect(fonteDoEditorValida('Comic Sans MS')).toBe(EDITOR_FONTE_PADRAO)
  })

  it('não aceita uma família parecida com uma da lista', () => {
    // a comparação é pela pilha inteira, e tem de ser: meia pilha resolve
    // para outra fonte na máquina de quem abrir
    expect(fonteDoEditorValida('Literata')).toBe(EDITOR_FONTE_PADRAO)
    expect(fonteDoEditorValida('Literata, Georgia, serif')).toBe('Literata, Georgia, serif')
  })
})
