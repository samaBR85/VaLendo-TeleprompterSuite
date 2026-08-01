import { useEffect, useState } from 'react'

/**
 * Relógio local de quem precisa piscar.
 *
 * Vive dentro do componente que mostra o tempo, e nunca no App: se o App
 * remarcasse a cada meio segundo, a prévia inteira remontaria junto — e ela
 * desenha o roteiro todo. Só quem mostra número precisa acordar.
 */
export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
