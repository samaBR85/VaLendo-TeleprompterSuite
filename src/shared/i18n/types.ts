export type Lang = 'pt-BR' | 'en' | 'es' | 'de' | 'fr' | 'it'

/** Cada idioma no próprio idioma: quem não lê português precisa se achar na lista. */
export const LANGS: { id: Lang; nome: string; sigla: string }[] = [
  // BR e não PT: o dicionário é brasileiro, e para quem fala português a
  // diferença entre os dois é justamente a que importa
  { id: 'pt-BR', nome: 'Português (Brasil)', sigla: 'BR' },
  { id: 'en', nome: 'English', sigla: 'EN' },
  { id: 'es', nome: 'Español', sigla: 'ES' },
  { id: 'de', nome: 'Deutsch', sigla: 'DE' },
  { id: 'fr', nome: 'Français', sigla: 'FR' },
  { id: 'it', nome: 'Italiano', sigla: 'IT' }
]

/**
 * Idiomas em que o texto cresce a ponto de não caber no painel de 214px.
 *
 * Medido: oito rótulos dos ajustes cortam quando o texto cresce ~35%, que é o
 * que alemão e francês fazem sobre o português. Em vez de encurtar a tradução
 * até virar telegrama, o painel alarga só nesses dois.
 */
export const LANGS_LARGOS: Lang[] = ['de', 'fr']

export const LARGURA_AJUSTES = 214
export const LARGURA_AJUSTES_LARGA = 250

export function larguraDoPainel(lang: Lang): number {
  return LANGS_LARGOS.includes(lang) ? LARGURA_AJUSTES_LARGA : LARGURA_AJUSTES
}

/**
 * Idioma do sistema operacional traduzido para um dos seis que o app fala.
 *
 * Só serve para o primeiro uso: depois disso vale o que o operador escolheu, e
 * trocar o idioma do Windows não pode mexer no app que já estava configurado.
 *
 * A reserva é o INGLÊS, e não o português: quem tem o Windows em japonês, russo
 * ou polonês não fala nenhum dos dois, mas tem muito mais chance de se virar em
 * inglês. Para o brasileiro nada muda — `pt` é reconhecido logo na primeira
 * linha, e a reserva nem chega a ser consultada.
 */
export function idiomaDoSistema(locale: string): Lang {
  const base = locale.toLowerCase()
  if (base.startsWith('pt')) return 'pt-BR'
  if (base.startsWith('es')) return 'es'
  if (base.startsWith('de')) return 'de'
  if (base.startsWith('fr')) return 'fr'
  if (base.startsWith('it')) return 'it'
  if (base.startsWith('en')) return 'en'
  return 'en'
}
