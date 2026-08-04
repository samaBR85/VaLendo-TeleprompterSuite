import type { Lang } from '../i18n/types'
import { ajudaEn, type Ajuda } from './en'

export type { Ajuda } from './en'

/** O identificador de um controle da mesa — a mesma chave para tooltip e quadro. */
export type AjudaId = keyof typeof ajudaEn

/**
 * Dicionário PRÓPRIO, fora dos seis idiomas da interface — e é isso que
 * permite traduzir depois.
 *
 * Os seis dicionários de `shared/i18n` são obrigados a ter exatamente as
 * mesmas chaves: pelo tipo (`Record<Chave, string>`) e por um teste. Escrever
 * só em inglês lá dentro não compilaria. Aqui a regra é outra: o inglês é o
 * conjunto completo, e cada idioma novo entra em `POR_IDIOMA` com o que já
 * tiver traduzido — o que faltar cai no inglês em vez de sumir da tela.
 *
 * Quando os seis estiverem escritos, este mapa fica cheio e a reserva deixa de
 * ser usada; até lá ela é o que mantém o recurso inteiro funcionando em
 * qualquer idioma.
 */
const POR_IDIOMA: Partial<Record<Lang, Partial<Record<AjudaId, Ajuda>>>> = {}

/** O texto de um controle, no idioma pedido, com reserva no inglês. */
export function ajudaDe(lang: Lang, id: AjudaId): Ajuda {
  return POR_IDIOMA[lang]?.[id] ?? ajudaEn[id]
}

/** Existe entrada para este id? Serve aos testes e à varredura de cobertura. */
export function temAjuda(id: string): id is AjudaId {
  return id in ajudaEn
}

export { ajudaEn }
