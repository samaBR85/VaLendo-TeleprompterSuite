/**
 * Pedido de faixa de bytes — o que faz um vídeo poder ser arrastado.
 *
 * Um servidor que só sabe entregar o arquivo inteiro, do começo, serve para
 * foto e não serve para vídeo: quando o operador arrasta a barra, o tocador
 * pede o trecho do meio, recebe o começo de novo, conclui que ali não dá para
 * pular e devolve a barra ao zero. Foi exatamente o que aconteceu aqui antes
 * disto existir — o trecho navegável vinha vazio.
 *
 * Responder "toma só o pedaço que você pediu, de tantos a tantos de um total
 * de tanto" é o que destrava o arrasto. É o mecanismo padrão da web, e mora
 * aqui em lógica pura porque dois servidores precisam do mesmo: o protocolo
 * `valendo://` das janelas e o servidor da rede local.
 */

export interface Faixa {
  /** primeiro byte, inclusivo */
  inicio: number
  /** último byte, inclusivo — é assim que o cabeçalho conta */
  fim: number
}

/**
 * Lê o cabeçalho `Range`.
 *
 * Devolve `null` quando não há pedido de faixa (e aí se entrega o arquivo
 * inteiro, como antes) e `'invalida'` quando o pedido existe mas não cabe no
 * arquivo — caso que tem resposta própria, 416, e não pode ser confundido com
 * "não pediu nada".
 */
export function faixaPedida(header: string | null | undefined, tamanho: number): Faixa | null | 'invalida' {
  if (!header) return null

  const casou = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!casou) return null

  const [, cru0, cru1] = casou
  // um arquivo vazio não tem faixa possível; e sem os dois lados o pedido não
  // diz nada ("bytes=-")
  if (tamanho <= 0 || (cru0 === '' && cru1 === '')) return 'invalida'

  // `bytes=-500` é "os últimos 500 bytes", não "do zero ao 500": é assim que o
  // tocador busca o índice que costuma morar no fim do arquivo
  if (cru0 === '') {
    const quantos = Number(cru1)
    if (quantos <= 0) return 'invalida'
    return { inicio: Math.max(0, tamanho - quantos), fim: tamanho - 1 }
  }

  const inicio = Number(cru0)
  if (inicio >= tamanho) return 'invalida'

  // `bytes=100-` é "do 100 até o fim", que é o pedido mais comum de todos:
  // o tocador abre o arquivo e vai lendo
  const fim = cru1 === '' ? tamanho - 1 : Math.min(Number(cru1), tamanho - 1)
  if (fim < inicio) return 'invalida'

  return { inicio, fim }
}

/** `Content-Range` como o cabeçalho pede: o trecho e o tamanho total. */
export function conteudoDaFaixa(faixa: Faixa, tamanho: number): string {
  return `bytes ${faixa.inicio}-${faixa.fim}/${tamanho}`
}

export function tamanhoDaFaixa(faixa: Faixa): number {
  return faixa.fim - faixa.inicio + 1
}
