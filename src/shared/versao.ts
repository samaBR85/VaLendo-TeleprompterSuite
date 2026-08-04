/**
 * Comparar versões, que é a única parte disto com risco de errar.
 *
 * Comparação de TEXTO diria que `1.1.9` é maior que `1.1.10`, porque `9 > 1`
 * caractere a caractere. Por isso a quebra em números.
 *
 * Fica em `shared` e sem nenhum acesso a rede de propósito: assim dá para
 * cobrir com teste os casos que importam, sem subir servidor nenhum.
 */

/** `v1.1.2`, `1.1.2` ou `1.1` viram `[1, 1, 2]`. Qualquer outra coisa vira null. */
export function partesDaVersao(texto: string): [number, number, number] | null {
  const limpo = texto.trim().replace(/^v/i, '')
  // sufixos como `1.2.0-beta.1` não entram: uma pré-versão não é "mais nova"
  // para quem roda a estável, e tratá-la como se fosse anunciaria atualização
  // que o operador não deveria instalar no meio de uma temporada
  if (!/^\d+(\.\d+){0,2}$/.test(limpo)) return null
  const n = limpo.split('.').map(Number)
  if (n.some((x) => !Number.isFinite(x))) return null
  return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0]
}

/**
 * A `remota` é mais nova que a `local`?
 *
 * Responde `false` em tudo que não for uma resposta segura — igual, mais
 * velha, ilegível, vazia. O silêncio é o padrão: anunciar atualização que não
 * existe é pior que não anunciar a que existe.
 */
export function temVersaoMaisNova(local: string, remota: string): boolean {
  const a = partesDaVersao(local)
  const b = partesDaVersao(remota)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true
    if (b[i] < a[i]) return false
  }
  return false
}
