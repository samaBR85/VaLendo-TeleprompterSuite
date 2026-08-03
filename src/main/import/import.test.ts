import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blocksFromText } from '@shared/text'
import { importFile } from './index'

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url))

describe('importFile — texto', () => {
  it('lê arquivo em Windows-1252 sem estragar os acentos', async () => {
    const { text } = await importFile(fixture('roteiro-cp1252.txt'))
    expect(text).toContain('coração')
    expect(text).toContain('já está')
    expect(text).not.toContain('�')
  })

  it('remonta a palavra hifenizada e descarta o número de página', async () => {
    const { text } = await importFile(fixture('roteiro-cp1252.txt'))
    expect(text).toContain('mudança importante')
    expect(text).not.toMatch(/^\s*12\s*$/m)
  })

  it('usa o nome do arquivo como título da aba', async () => {
    const { title } = await importFile(fixture('roteiro-cp1252.txt'))
    expect(title).toBe('roteiro-cp1252')
  })
})

describe('importFile — markdown', () => {
  it('converte títulos em capítulos e limpa a marcação', async () => {
    const { text } = await importFile(fixture('roteiro.md'))
    const blocks = blocksFromText(text)

    expect(blocks.filter((b) => b.kind === 'chapter').map((b) => b.text)).toEqual([
      '## Abertura',
      '## Bloco 2'
    ])
    expect(text).toContain('uma mudança')
    expect(text).not.toContain('**')
    expect(text).toContain('relatório completo')
    expect(text).not.toContain('https://exemplo.com')
  })
})

describe('importFile — docx', () => {
  it('preserva os títulos do Word como capítulos', async () => {
    const { text, warnings } = await importFile(fixture('roteiro.docx'))
    const blocks = blocksFromText(text)

    expect(warnings).toEqual([])
    expect(blocks.map((b) => b.kind)).toEqual(['chapter', 'speech', 'chapter', 'speech'])
    expect(blocks[1].text).toBe('Boa noite. Hoje a gente vai falar sobre uma mudança.')
  })
})

/*
 * Um minuto de prazo, e não os 5 s padrão do vitest.
 *
 * O primeiro destes três paga o carregamento do pdf.js, que é caro: 17 s numa
 * máquina de CI ocupada, contra 25 ms nos dois seguintes, já com a biblioteca
 * quente. O limite padrão derrubava o build por lentidão da máquina, não por
 * defeito do código — e um teste que acusa o que não é falha ensina a equipe a
 * ignorar teste vermelho.
 *
 * O prazo é generoso de propósito: quando tudo está saudável ele não custa
 * nada, porque o teste termina em milissegundos. Ele só entra em cena quando a
 * máquina está sufocada, que é justamente quando NÃO se quer um alarme falso.
 */
const PRAZO_PDF = 60_000

describe('importFile — pdf', () => {
  it(
    'extrai o texto, tira cabeçalho repetido e número de página',
    async () => {
      const { text } = await importFile(fixture('roteiro.pdf'))

      expect(text).not.toContain('JORNAL DA NOITE')
      expect(text).not.toMatch(/^\s*[123]\s*$/m)
      expect(text).toContain('Boa noite')
    },
    PRAZO_PDF
  )

  it(
    'costura a frase que atravessa a virada de página',
    async () => {
      const { text } = await importFile(fixture('roteiro.pdf'))
      expect(text).toContain('atravessa a virada de pagina')
    },
    PRAZO_PDF
  )

  it(
    'não avisa de OCR quando existe camada de texto',
    async () => {
      const { warnings } = await importFile(fixture('roteiro.pdf'))
      expect(warnings).toEqual([])
    },
    PRAZO_PDF
  )
})
