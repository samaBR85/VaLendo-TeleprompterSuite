import { pt, type Chave } from './pt'
import { en } from './en'
import { es } from './es'
import { de } from './de'
import { fr } from './fr'
import { it } from './it'
import type { Lang } from './types'

export type { Chave } from './pt'
export type { Lang } from './types'
export { LANGS, LANGS_LARGOS, larguraDoPainel, idiomaDoSistema } from './types'

export type Dicionario = Record<Chave, string>

const DICIONARIOS: Record<Lang, Dicionario> = {
  'pt-BR': pt,
  en,
  es,
  de,
  fr,
  it
}

export function dicionario(lang: Lang): Dicionario {
  return DICIONARIOS[lang] ?? pt
}

/**
 * Texto traduzido, com `{nome}` trocado pelos valores passados.
 *
 * Sem chave faltando por construção: os outros dicionários são
 * `Record<Chave, string>` sobre o português, então o compilador reclama antes
 * de o app rodar. O `?? pt[chave]` aqui é só rede para o caso de um idioma
 * gravado no workspace deixar de existir numa versão futura.
 */
export function traduzir(lang: Lang, chave: Chave, valores?: Record<string, string | number>): string {
  const texto = dicionario(lang)[chave] ?? pt[chave]
  if (!valores) return texto
  return texto.replace(/\{(\w+)\}/g, (inteiro, nome: string) =>
    nome in valores ? String(valores[nome]) : inteiro
  )
}

/**
 * Singular ou plural, pela regra do idioma.
 *
 * Francês trata o zero como singular ("0 marqueur"); os outros cinco tratam
 * como plural. Nenhum dos seis precisa de mais formas que isso — se um dia
 * entrar russo ou polonês, esta função é o lugar de crescer.
 */
export function plural(
  lang: Lang,
  n: number,
  raiz: string,
  valores?: Record<string, string | number>
): string {
  const singular = lang === 'fr' ? Math.abs(n) <= 1 : Math.abs(n) === 1
  const chave = `${raiz}_${singular ? '1' : 'n'}` as Chave
  return traduzir(lang, chave, { n, ...valores })
}

/**
 * Rótulo de um comando. Os que terminam em número (abas e marcadores) são
 * gerados, então caem numa chave só com `{n}`.
 */
export function rotuloDoComando(lang: Lang, id: string): string {
  const aba = /^tab\.switch\.(\d+)$/.exec(id)
  if (aba) return traduzir(lang, 'cmd.tab.switch', { n: aba[1] })

  const marcador = /^marker\.goto\.(\d+)$/.exec(id)
  if (marcador) return traduzir(lang, 'cmd.marker.goto', { n: marcador[1] })

  return traduzir(lang, `cmd.${id}` as Chave)
}
