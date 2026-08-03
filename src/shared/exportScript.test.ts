import { describe, expect, it } from 'vitest'
import { cleanupPlainText } from './cleanup'
import { defaultFileName, formatOf, toMarkdown, toPlainText } from './exportScript'
import { blocksFromText, serializeBlocks } from './text'

const ROTEIRO = [
  '## Abertura',
  'Boa noite.\nHoje a gente fala de uma mudança.',
  '[olhar câmera 2 · pausa]',
  'E o mais importante: ninguém precisa parar a gravação.'
].join('\n\n')

describe('salvar como texto', () => {
  it('sai igual ao que está no editor', () => {
    const blocks = blocksFromText(ROTEIRO)

    expect(toPlainText(blocks)).toBe(`${ROTEIRO}\n`)
  })

  it('vai e volta pela importação de verdade, sem perder nada', () => {
    // salvar e reabrir tem que devolver o mesmo roteiro, com as mesmas
    // marcações e a mesma diagramação — inclusive a quebra de linha dentro da
    // fala. O caminho é o mesmo que o app usa ao importar um .txt
    const blocks = blocksFromText(ROTEIRO)
    const devolta = blocksFromText(cleanupPlainText(toPlainText(blocks)))

    expect(serializeBlocks(devolta)).toBe(serializeBlocks(blocks))
    expect(devolta.map((b) => b.kind)).toEqual(['chapter', 'speech', 'direction', 'speech'])
  })

  it('preserva as linhas em branco da diagramação', () => {
    const comEspacos = 'Primeira fala.\n\n\n\nSegunda fala, bem depois.'
    const devolta = toPlainText(blocksFromText(comEspacos))

    expect(devolta).toContain('Primeira fala.')
    expect(devolta).toContain('Segunda fala, bem depois.')
    expect(blocksFromText(devolta)).toHaveLength(2)
  })

  it('mantém a quebra de linha dentro de uma fala', () => {
    const blocks = blocksFromText('Boa noite.\nHoje a gente fala.')

    expect(toPlainText(blocks)).toBe('Boa noite.\nHoje a gente fala.\n')
  })
})

describe('salvar como markdown', () => {
  const md = toMarkdown(blocksFromText(ROTEIRO), 'Jornal das Dez')

  it('põe o título do roteiro no topo', () => {
    expect(md.startsWith('# Jornal das Dez')).toBe(true)
  })

  // desde que a marca do roteiro virou `##`, ela COINCIDE com o cabeçalho de
  // nível 2 do Markdown — o que antes era conversão virou identidade. O risco
  // que sobra é o oposto do antigo: marcar duas vezes, gerando `#### Abertura`.
  it('capítulo vira cabeçalho de nível 2, sem marca dobrada', () => {
    expect(md).toContain('## Abertura')
    expect(md).not.toMatch(/^#{3,}/m)
  })

  it('direção fica em itálico, mas continua entre colchetes', () => {
    expect(md).toContain('_[olhar câmera 2 · pausa]_')
  })

  it('a quebra de linha dentro da fala sobrevive', () => {
    // no Markdown, quebra simples é ignorada; sem os dois espaços a
    // diagramação do operador viraria um parágrafo corrido
    expect(md).toContain('Boa noite.  \nHoje a gente fala de uma mudança.')
  })
})

describe('nome sugerido no diálogo', () => {
  it('usa o título da aba', () => {
    expect(defaultFileName('Jornal das Dez')).toBe('Jornal das Dez.txt')
  })

  it('troca o que o Windows não aceita em nome de arquivo', () => {
    expect(defaultFileName('Bloco 2: entrevista <ao vivo>')).toBe('Bloco 2- entrevista -ao vivo-.txt')
  })

  it('aba sem título ainda vira um nome válido', () => {
    expect(defaultFileName('   ')).toBe('roteiro.txt')
    expect(defaultFileName('///')).toBe('roteiro.txt')
  })
})

describe('formato pela extensão', () => {
  it('reconhece cada um, sem ligar para maiúscula', () => {
    expect(formatOf('C:\\roteiros\\jornal.docx')).toBe('docx')
    expect(formatOf('/home/a/jornal.PDF')).toBe('pdf')
    expect(formatOf('jornal.md')).toBe('md')
    expect(formatOf('jornal.txt')).toBe('txt')
  })

  it('extensão desconhecida vira texto, em vez de falhar', () => {
    expect(formatOf('jornal.roteiro')).toBe('txt')
    expect(formatOf('jornal')).toBe('txt')
  })
})
