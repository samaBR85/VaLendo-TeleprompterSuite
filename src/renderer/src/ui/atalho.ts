import { formatBinding, parseBinding } from '@shared/commands'

/**
 * A tecla de um comando, pronta para colar no fim de um `title`.
 *
 * Sai do keymap EM VIGOR, e não escrita à mão no texto: quem trocou a tecla no
 * Ctrl+, veria o padrão de fábrica no balão para sempre, e um balão que mente
 * sobre o atalho é pior que um balão sem atalho nenhum.
 *
 * Devolve string vazia quando o comando não tem tecla — assim o chamador
 * concatena sem perguntar, e o balão fica só com o nome do botão.
 *
 * Mora aqui, e não no `Toolbar`, porque as abas também precisam dele e o
 * Toolbar é quem desenha as abas: importar de lá fechava um ciclo.
 */
export function hint(keymap: Map<string, string>, commandId: string): string {
  const binding = parseBinding(keymap.get(commandId) ?? '')
  if (!binding) return ''
  return ` · ${formatBinding(binding, window.valendo.platform === 'darwin')}`
}
