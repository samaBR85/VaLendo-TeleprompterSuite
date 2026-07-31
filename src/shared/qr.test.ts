import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { qrMatrix, qrPath } from './qr'

const ENDERECO = 'http://192.168.15.6:7777'

/**
 * Pinta a matriz como imagem e lê de volta com um decodificador de verdade.
 *
 * As checagens de estrutura provam que o desenho tem a forma de um QR; só a
 * leitura prova que ele abre o endereço certo. É a diferença entre parecer um
 * QR e ser um.
 */
function decodificar(matrix: boolean[][], quiet = 4, escala = 4): string | null {
  const lado = (matrix.length + quiet * 2) * escala
  const pixels = new Uint8ClampedArray(lado * lado * 4).fill(255)

  matrix.forEach((linha, y) => {
    linha.forEach((escuro, x) => {
      if (!escuro) return
      for (let dy = 0; dy < escala; dy += 1) {
        for (let dx = 0; dx < escala; dx += 1) {
          const px = (x + quiet) * escala + dx
          const py = (y + quiet) * escala + dy
          const i = (py * lado + px) * 4
          pixels[i] = 0
          pixels[i + 1] = 0
          pixels[i + 2] = 0
        }
      }
    })
  })

  return jsQR(pixels, lado, lado)?.data ?? null
}

/** Os três quadrados dos cantos, que é por onde o leitor acha o código. */
function temMarcaDeCanto(matrix: boolean[][], linha0: number, coluna0: number): boolean {
  const esperado = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ]
  return esperado.every((linha, y) =>
    linha.every((celula, x) => matrix[linha0 + y][coluna0 + x] === (celula === 1))
  )
}

describe('o QR do endereço', () => {
  const matrix = qrMatrix(ENDERECO)

  it('é quadrado e do tamanho que a norma manda', () => {
    // todo QR tem lado 4·versão + 17
    expect(matrix.length).toBeGreaterThan(20)
    expect((matrix.length - 17) % 4).toBe(0)
    for (const linha of matrix) expect(linha).toHaveLength(matrix.length)
  })

  it('tem as três marcas de canto, que é como a câmera acha o código', () => {
    const fim = matrix.length - 7
    expect(temMarcaDeCanto(matrix, 0, 0), 'canto superior esquerdo').toBe(true)
    expect(temMarcaDeCanto(matrix, 0, fim), 'canto superior direito').toBe(true)
    expect(temMarcaDeCanto(matrix, fim, 0), 'canto inferior esquerdo').toBe(true)
  })

  it('o canto inferior direito fica livre, como manda o formato', () => {
    const fim = matrix.length - 7
    expect(temMarcaDeCanto(matrix, fim, fim)).toBe(false)
  })

  it('endereços diferentes dão códigos diferentes', () => {
    expect(qrPath(qrMatrix('http://192.168.1.27:7777'))).not.toBe(qrPath(matrix))
  })

  it('o mesmo endereço dá sempre o mesmo código', () => {
    expect(qrPath(qrMatrix(ENDERECO))).toBe(qrPath(matrix))
  })

  it('aguenta endereço comprido sem estourar', () => {
    expect(() => qrMatrix('http://192.168.100.200:7777/muito/longo/mesmo/para/testar')).not.toThrow()
  })
})

describe('o código abre o endereço certo', () => {
  it('lido de volta, dá o mesmo endereço', () => {
    expect(decodificar(qrMatrix(ENDERECO))).toBe(ENDERECO)
  })

  it('vale para os dois endereços de uma máquina em duas redes', () => {
    for (const endereco of ['http://192.168.15.6:7777', 'http://192.168.1.27:7777']) {
      expect(decodificar(qrMatrix(endereco)), endereco).toBe(endereco)
    }
  })

  it('e para um endereço bem mais comprido', () => {
    const longo = 'http://192.168.100.200:7777/algum/caminho/bem/comprido'
    expect(decodificar(qrMatrix(longo))).toBe(longo)
  })
})

describe('o caminho desenhado', () => {
  it('tem um quadradinho por módulo escuro, e nenhum a mais', () => {
    const matrix = qrMatrix(ENDERECO)
    const escuros = matrix.flat().filter(Boolean).length

    expect(qrPath(matrix).match(/M/g) ?? []).toHaveLength(escuros)
  })

  it('matriz vazia não desenha nada', () => {
    expect(qrPath([[false, false], [false, false]])).toBe('')
  })
})
