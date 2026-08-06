/**
 * Quais pesos uma fonte DESENHA de verdade.
 *
 * O controle de peso oferecia seis degraus — 300 a 800 — para qualquer fonte,
 * e mentia na maioria delas. As famílias do menu são do sistema, e o sistema
 * instala duas ou três faces por família: pedir 500 numa fonte que só tem
 * Regular e Bold não interpola nada, o navegador entrega a face mais próxima.
 * Medido no app: em Segoe UI, 500 e 600 saíam idênticos; em Georgia, Arial
 * Narrow e Verdana, três degraus davam um desenho e três davam outro; em
 * Cascadia Mono os seis davam o mesmo. O operador arrastava o controle, o
 * número mudava e a tela não.
 *
 * Este módulo não sabe medir — quem mede é a tela, que tem `canvas`. Ele
 * recebe a régua pronta e agrupa: pesos que produzem a MESMA largura produzem
 * o mesmo desenho, e do grupo fica só um.
 */

/** Os degraus que o controle oferece quando a fonte dá conta de todos. */
export const PESOS = [300, 400, 500, 600, 700, 800] as const

/**
 * De `PESOS`, os que dão desenhos distintos segundo `largura`.
 *
 * Fica o MENOR de cada grupo: quando 300, 400 e 500 desenham igual, o degrau
 * honesto é o 300 — é onde aquele desenho começa. Escolher o maior faria o
 * controle dizer 500 para uma fonte que não tem 500.
 *
 * Devolver um só peso é resposta legítima, e diz que a fonte tem uma face só:
 * quem chama usa isso para APAGAR o controle em vez de oferecer um que não faz
 * nada.
 */
export function pesosQueDesenham(largura: (peso: number) => number, pesos: readonly number[] = PESOS): number[] {
  const vistas: number[] = []
  const distintos: number[] = []

  for (const peso of pesos) {
    const medida = largura(peso)
    // comparação com folga: a medida vem em ponto flutuante, e larguras que
    // diferem por um centésimo de pixel são a mesma face, não duas
    if (vistas.some((v) => Math.abs(v - medida) < 0.5)) continue
    vistas.push(medida)
    distintos.push(peso)
  }

  return distintos
}

/**
 * O degrau em que o controle se posiciona para um valor já gravado.
 *
 * O peso do roteiro NÃO é reescrito por causa disto — um projeto de 2024 com
 * `fontWeight: 500` continua com 500 no arquivo. Isto é só onde a bolinha
 * pousa: no degrau que desenha o que já está na tela, para arrastar um passo
 * mudar de verdade em vez de recair no mesmo desenho.
 *
 * A regra é o MAIOR degrau que não passa do valor, e não o numericamente mais
 * próximo. A diferença apareceu medindo no app: em Georgia os degraus são 300
 * e 600, e um 500 gravado está a 100 do 600 e a 200 do 300 — mas quem 500
 * desenha ali é o Regular, que é o grupo do 300. Cada degrau é o começo de um
 * grupo; o valor pertence ao grupo que ele já entrou, não ao mais perto.
 */
export function degrauDoValor(valor: number, degraus: number[]): number {
  if (degraus.length === 0) return valor
  const dentro = degraus.filter((d) => d <= valor)
  // abaixo do primeiro degrau (um projeto com peso 200, digamos) só existe o
  // primeiro: é o desenho mais leve que a fonte tem
  return dentro.length > 0 ? dentro[dentro.length - 1] : degraus[0]
}
