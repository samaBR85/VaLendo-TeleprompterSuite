import type { Lang } from '../i18n/types'
import { ajudaEn, type Ajuda } from './en'
import { ajudaPt } from './pt'
import { ajudaEs } from './es'
import { ajudaDe as ajudaDeDicionario } from './de'
import { ajudaFr } from './fr'
import { ajudaIt } from './it'

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
 * Os seis já estão escritos, então a reserva não é mais usada na prática —
 * mas continua sendo o que mantém o recurso inteiro de pé se uma chave nova
 * nascer em `en.ts` sem passar ainda pelos outros cinco.
 */
const POR_IDIOMA: Partial<Record<Lang, Partial<Record<AjudaId, Ajuda>>>> = {
  'pt-BR': ajudaPt,
  es: ajudaEs,
  de: ajudaDeDicionario,
  fr: ajudaFr,
  it: ajudaIt
}

/** O texto de um controle, no idioma pedido, com reserva no inglês. */
export function ajudaDe(lang: Lang, id: AjudaId): Ajuda {
  return POR_IDIOMA[lang]?.[id] ?? ajudaEn[id]
}

/** Existe entrada para este id? Serve aos testes e à varredura de cobertura. */
export function temAjuda(id: string): id is AjudaId {
  return id in ajudaEn
}

export { ajudaEn }
