import { createContext, useContext } from 'react'

/**
 * As duas chaves do seletor de cor, e o fundo contra o qual ele mede.
 *
 * Vem por contexto, e não por props, porque o seletor aparece em seis lugares
 * espalhados por quatro arquivos — cor do texto, do fundo, dos dois relógios,
 * de cada apresentador, o conta-gotas e o editor de tela. Passar três valores
 * por essa cadeia inteira encheria de plumbing componentes que não têm nada a
 * ver com paleta.
 *
 * O padrão aqui é o que vale numa janela que não tem provedor — o editor de
 * tela abre em janela própria, com raiz de React própria, e precisa continuar
 * funcionando sozinho.
 */
export interface OpcoesDeCor {
  /** mostrando as oito escolhidas em vez da grade completa */
  curta: boolean
  /** apagar o que não se lê no fundo de agora */
  contraste: boolean
  /** contra o que medir: o fundo da saída, ou o do cartão de tela */
  fundo: string
  onCurta: (v: boolean) => void
  onContraste: (v: boolean) => void
}

const PADRAO: OpcoesDeCor = {
  curta: false,
  contraste: true,
  fundo: '#000000',
  onCurta: () => {},
  onContraste: () => {}
}

const Contexto = createContext<OpcoesDeCor>(PADRAO)

export const ProvedorDeOpcoesDeCor = Contexto.Provider

export function useOpcoesDeCor(): OpcoesDeCor {
  return useContext(Contexto)
}
