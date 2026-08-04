import { temVersaoMaisNova } from '@shared/versao'

/**
 * Uma pergunta ao GitHub, na abertura: existe versão mais nova?
 *
 * SÓ NA ABERTURA, e isso não é economia — é o que dispensa uma guarda. Uma
 * checagem no meio do expediente precisaria saber se há transmissão no ar, se
 * a rede está publicando, se o operador está gravando; na abertura nada disso
 * existe ainda, por construção. Regra que não pode ser violada é melhor que
 * regra que alguém tem de lembrar de checar.
 *
 * E nunca baixa nada. O que sai daqui é um número de versão; quem decide
 * atualizar é a pessoa, na página da release.
 */

const RELEASE = 'https://api.github.com/repos/samaBR85/Valendo-TeleprompterSuite/releases/latest'
export const PAGINA_DE_RELEASES = 'https://github.com/samaBR85/Valendo-TeleprompterSuite/releases/latest'

/**
 * Cinco segundos, e com `abort`.
 *
 * Portal cativo de hotel e de estúdio não RECUSA a conexão — ele aceita e não
 * responde, ou devolve a própria página de login com status 200. Sem prazo, a
 * promessa fica pendurada para sempre; sem `abort`, o socket também.
 */
const PRAZO_MS = 5_000

/** A versão anunciada, ou `null` sempre que a resposta não for confiável. */
export async function versaoMaisNova(versaoLocal: string): Promise<string | null> {
  const desistir = new AbortController()
  const relogio = setTimeout(() => desistir.abort(), PRAZO_MS)
  try {
    const resposta = await fetch(RELEASE, {
      signal: desistir.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        // o GitHub pede identificação; sem isso a resposta pode vir recusada
        'User-Agent': 'Valendo'
      }
    })
    if (!resposta.ok) return null

    // portal cativo devolve HTML com 200, e é aqui que ele cai
    const dados = (await resposta.json()) as { tag_name?: string; draft?: boolean; prerelease?: boolean }
    if (dados.draft || dados.prerelease) return null

    const tag = dados.tag_name
    if (!tag || !temVersaoMaisNova(versaoLocal, tag)) return null
    return tag.replace(/^v/i, '')
  } catch {
    /*
     * Silêncio, e é requisito.
     *
     * Sem internet, atrás de firewall, com o GitHub fora do ar ou com o limite
     * de chamadas por IP estourado — o operador não fez nada errado e não tem o
     * que resolver. Um aviso de erro aqui seria ruído puro no meio de uma
     * gravação, sobre uma coisa que ele nem pediu.
     */
    return null
  } finally {
    clearTimeout(relogio)
  }
}
