import { useMemo } from 'react'
import { qrMatrix, qrPath } from '@shared/qr'

interface Props {
  text: string
  size?: number
}

/** Margem clara exigida pela norma do QR: sem ela, a câmera não acha o código. */
const QUIET = 2

/**
 * Fundo branco e módulos pretos, mesmo no app escuro.
 *
 * Não é descuido com o tema: leitor de QR procura contraste claro-escuro nessa
 * ordem, e um código invertido no escuro falha em boa parte dos celulares. Vale
 * mais a mancha branca do que um código bonito que não abre.
 */
export function QrCode({ text, size = 112 }: Props): React.JSX.Element {
  const { path, lado } = useMemo(() => {
    const matrix = qrMatrix(text)
    return { path: qrPath(matrix), lado: matrix.length }
  }, [text])

  const total = lado + QUIET * 2

  return (
    <svg
      data-qr
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={`QR code para ${text}`}
      style={{ display: 'block', borderRadius: 6, background: '#fff', flex: 'none' }}
      shapeRendering="crispEdges"
    >
      <g transform={`translate(${QUIET} ${QUIET})`}>
        <path d={path} fill="#000" />
      </g>
    </svg>
  )
}
