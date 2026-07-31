import { createContext, useContext, useMemo } from 'react'
import { plural, rotuloDoComando, traduzir, type Chave, type Lang } from '@shared/i18n'

interface Traducao {
  lang: Lang
  /** texto traduzido, com `{nome}` trocado pelos valores */
  t: (chave: Chave, valores?: Record<string, string | number>) => string
  /** singular ou plural pela regra do idioma */
  tp: (raiz: string, n: number) => string
  /** rótulo de um comando pelo id */
  tc: (commandId: string) => string
}

/*
 * Português é o padrão do contexto, e não um "idioma vazio": se um componente
 * for montado fora do provedor (num teste, por exemplo), ele mostra texto de
 * verdade em vez de chaves cruas na tela.
 */
const Contexto = createContext<Traducao>({
  lang: 'pt-BR',
  t: (chave, valores) => traduzir('pt-BR', chave, valores),
  tp: (raiz, n) => plural('pt-BR', n, raiz),
  tc: (id) => rotuloDoComando('pt-BR', id)
})

export function ProvedorDeIdioma({
  lang,
  children
}: {
  lang: Lang
  children: React.ReactNode
}): React.JSX.Element {
  const valor = useMemo<Traducao>(
    () => ({
      lang,
      t: (chave, valores) => traduzir(lang, chave, valores),
      tp: (raiz, n) => plural(lang, n, raiz),
      tc: (id) => rotuloDoComando(lang, id)
    }),
    [lang]
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useT(): Traducao {
  return useContext(Contexto)
}
