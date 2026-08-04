import { createTab } from './defaults'
import { serializeBlocks } from './text'
import type { Marker, Tab } from './types'

/**
 * Copiar uma aba inteira: texto, aparência, apresentadores e marcadores.
 *
 * A cópia é FEITA e não clonada — o texto sai da original, atravessa
 * `createTab` e volta como aba nova. Parece rodeio e não é: é o que garante,
 * de uma vez, as quatro coisas que uma cópia precisa e um `{...aba}` não dá.
 *
 * 1. **Ids novos**, de aba e de bloco. Os de bloco vêm de graça porque
 *    `createTab` compõe os blocos a partir do texto reconciliando contra uma
 *    lista VAZIA, e aí todo parágrafo cai no gerador. Ids repetidos entre abas
 *    fariam um marcador de uma resolver dentro da outra.
 * 2. **Aparência copiada em dois níveis**, para as duas não passarem a dividir
 *    o mesmo objeto de relógios — mexer numa mexeria na outra.
 * 3. **Sem `exportPath`.** É o ponto perigoso desta função inteira: herdado, o
 *    primeiro Ctrl+S na cópia regravaria o arquivo da ORIGINAL, com outro
 *    texto e sem perguntar nada — que é exatamente o que aquele campo existe
 *    para fazer. `createTab` nunca o escreve, e é por isso que a cópia passa
 *    por ele.
 * 4. **Posição de leitura no começo**, e não a da original: os ids mudaram, e
 *    a original pode estar no ar neste instante.
 *
 * O histórico de desfazer também não vem junto, mas isso é do reducer: ele é
 * um arquivo por aba, e viria com estados que pertencem ao passado da outra.
 */
export function duplicarAba(origem: Tab, existentes: Tab[], cor: string): Tab {
  const nova = createTab(nomeDaCopia(origem.title, existentes), serializeBlocks(origem.blocks), cor, origem.appearance)
  nova.apresentadores = origem.apresentadores.map((a) => ({ ...a }))
  nova.markers = marcadoresRemapeados(origem, nova)
  return nova
}

/**
 * "ROTEIRO PGM" vira "ROTEIRO PGM (2)", e sobe enquanto o nome existir.
 *
 * Número e não a palavra "cópia": o uso real disto é versão — o operador tem
 * "VERSÃO PRÉ" e "VERSÃO PÓS" —, e um número não muda de sentido conforme o
 * idioma da interface. Duplicar a cópia dá (3), não "(2) (2)".
 */
export function nomeDaCopia(titulo: string, existentes: Tab[]): string {
  const usados = new Set(existentes.map((t) => t.title))
  const raiz = titulo.replace(/\s*\(\d+\)$/, '')
  for (let n = 2; n < 100; n += 1) {
    const tentativa = `${raiz} (${n})`
    if (!usados.has(tentativa)) return tentativa
  }
  return raiz
}

/**
 * Os marcadores da original, apontando para os blocos da cópia.
 *
 * O casamento é POSICIONAL: o texto atravessa parágrafo a parágrafo, então o
 * bloco `i` de uma é o bloco `i` da outra. Isso é uma suposição sobre a ida e
 * volta `serializeBlocks` ⇄ `blocksFromText`, não uma garantia da linguagem —
 * e por isso a contagem é conferida antes.
 *
 * Não batendo, os marcadores são DESCARTADOS em vez de colocados no palpite
 * mais próximo. Marcador na linha errada é pior que marcador nenhum: ele não
 * parece defeito, parece o roteiro, e o operador só descobre saltando para o
 * lugar errado no meio do programa.
 */
export function marcadoresRemapeados(origem: Tab, nova: Tab): Marker[] {
  if (origem.blocks.length !== nova.blocks.length) return []
  const dePara = new Map(origem.blocks.map((b, i) => [b.id, nova.blocks[i].id]))
  return origem.markers.flatMap((m) => {
    const blockId = dePara.get(m.blockId)
    // um marcador órfão já na origem não ganha destino inventado aqui
    return blockId ? [{ ...m, id: `${m.id}c`, blockId }] : []
  })
}
