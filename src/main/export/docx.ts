import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { chapterTitle } from '@shared/text'
import type { Block } from '@shared/types'

/** Azul das direções na tela, para o arquivo sair com a mesma leitura visual. */
const DIRECTION_BLUE = '2F6FBF'

/**
 * Um parágrafo do Word por bloco, com a marcação do roteiro virando formato.
 *
 * As quebras de linha dentro do bloco viram quebras de verdade, e não
 * parágrafos novos: é a diagramação que o operador escolheu, e no Word ela
 * precisa continuar sendo uma coisa só para não ganhar espaçamento entre as
 * linhas de uma mesma fala.
 */
function paragraphFor(block: Block): Paragraph {
  if (block.kind === 'chapter') {
    return new Paragraph({
      text: chapterTitle(block),
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 160 }
    })
  }

  const linhas = block.text.split('\n')
  const runs = linhas.map(
    (linha, index) =>
      new TextRun({
        text: linha,
        break: index === 0 ? undefined : 1,
        italics: block.kind === 'direction',
        color: block.kind === 'direction' ? DIRECTION_BLUE : undefined
      })
  )

  return new Paragraph({ children: runs, spacing: { after: 200 }, alignment: AlignmentType.LEFT })
}

export async function buildDocx(blocks: Block[], title: string): Promise<Buffer> {
  const doc = new Document({
    creator: 'Valendo',
    title,
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 320 } }),
          ...blocks.map(paragraphFor)
        ]
      }
    ]
  })

  return Packer.toBuffer(doc)
}
