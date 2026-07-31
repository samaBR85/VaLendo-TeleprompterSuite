import qrcode from 'qrcode-generator'

/**
 * O QR do endereço da rede local.
 *
 * Existe porque ninguém digita `http://192.168.15.6:7777` num celular no meio
 * de uma gravação. Aponta a câmera e abre.
 *
 * Correção de erro média: o código sobrevive a um dedo na tela ou a um reflexo
 * sem ficar denso demais para a câmera de longe.
 */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()

  const lado = qr.getModuleCount()
  return Array.from({ length: lado }, (_, linha) =>
    Array.from({ length: lado }, (_, coluna) => qr.isDark(linha, coluna))
  )
}

/**
 * Um caminho SVG só para a matriz inteira.
 *
 * Um retângulo por módulo daria centenas de elementos para o navegador
 * gerenciar; como caminho, é um nó só.
 */
export function qrPath(matrix: boolean[][]): string {
  const partes: string[] = []
  matrix.forEach((linha, y) => {
    linha.forEach((escuro, x) => {
      if (escuro) partes.push(`M${x} ${y}h1v1h-1z`)
    })
  })
  return partes.join('')
}
