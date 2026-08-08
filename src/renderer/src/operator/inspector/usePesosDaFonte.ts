import { useEffect, useState } from 'react'
import { PESOS, pesosQueDesenham } from '@shared/pesos'

/**
 * Os degraus de peso que ESTA fonte desenha, medidos no próprio navegador.
 *
 * A régua é `measureText`: se dois pesos produzem a mesma largura, produzem a
 * mesma face — quem agrupa é `pesosQueDesenham`, que é puro e tem teste. A
 * medição precisa acontecer aqui porque só a tela sabe quais faces a máquina
 * tem instaladas, e a resposta muda de computador para computador: o mesmo
 * projeto, no Mac do cliente, pode ter mais ou menos degraus que aqui.
 *
 * A fonte embutida é variável e devolve os seis sempre; as do sistema devolvem
 * o que a máquina tiver.
 */
export function usePesosDaFonte(fontFamily: string): number[] {
  const [degraus, setDegraus] = useState<number[]>(() => [...PESOS])

  useEffect(() => {
    let vivo = true

    const medir = (): void => {
      const contexto = document.createElement('canvas').getContext('2d')
      if (!contexto || !vivo) return
      // uma frase, e não uma letra: numa palavra só, duas faces diferentes
      // podem calhar de somar a mesma largura
      const amostra = 'Boa noite, e bem-vindos ao programa'
      setDegraus(
        pesosQueDesenham((peso) => {
          contexto.font = `${peso} 64px ${fontFamily}`
          return contexto.measureText(amostra).width
        })
      )
    }

    /*
     * Esperar a fonte chegar antes de medir.
     *
     * A embutida vem de um arquivo, e medir antes de ele carregar mede a
     * RESERVA do sistema. Foi o que aconteceu na primeira versão disto: o
     * controle nascia com cinco degraus — os do Segoe UI, que é a reserva —
     * numa fonte que tem seis. Pedir o carregamento peso a peso é o que
     * garante que a face medida é a que vai para a tela.
     */
    void Promise.all(PESOS.map((peso) => document.fonts.load(`${peso} 64px ${fontFamily}`)))
      .then(medir)
      .catch(medir)

    return () => {
      vivo = false
    }
  }, [fontFamily])

  return degraus
}
