import { useEffect, useRef, useState } from 'react'
import type { AjudaId } from '@shared/ajuda'
import type { Chave } from '@shared/i18n'
import { Icon } from './Icon'
import { ajuda } from './ajuda'

/**
 * O menu de fontes — o mesmo nos dois painéis.
 *
 * Ele nasceu no rodapé da Edição e a saída ficou com um `<select>` do sistema.
 * A diferença não era estética: o Chromium **ignora** `font-family` dentro de
 * um `<option>`, então o menu da saída saía inteiro na mesma letra. Num menu de
 * fontes o nome é o rótulo E a amostra ao mesmo tempo — "Com serifa" escrita
 * numa grotesca não ajuda ninguém a escolher. Trocar o controle nativo por
 * este é o que torna isso possível dos dois lados.
 *
 * O gatilho é, ele mesmo, a amostra da fonte escolhida: mostra o nome desenhado
 * nela, e clicar abre a lista. Não são dois elementos.
 *
 * `aoPassar` existe para a tira de amostra da aba Texto: percorrer a lista com
 * o mouse redesenha a tira sem gravar nada, e sair devolve a tira à escolhida.
 * Comparar dez fontes deixa de custar dez mudanças de estado — e dez passos de
 * desfazer.
 */
export function SeletorDeFonte({
  opcoes,
  valor,
  padrao,
  rotulo,
  ajudaId,
  direcao,
  marca,
  classeCaixa = 'relative flex-none',
  classeGatilho,
  estiloDoNome,
  nomeDa,
  onEscolher,
  aoPassar
}: {
  opcoes: { chave: Chave; value: string }[]
  valor: string
  /** para onde cair se o valor guardado não estiver na lista */
  padrao: string
  rotulo: string
  ajudaId: AjudaId
  /** o da Edição mora no rodapé e precisa abrir para cima */
  direcao: 'cima' | 'baixo'
  /** `data-*` do gatilho, para os scripts de conferência acharem cada um */
  marca: string
  /** no rodapé ele é um botão apertado; nos Ajustes ocupa a fileira inteira */
  classeCaixa?: string
  classeGatilho: string
  /** peso, caixa e espaçamento da saída, para o nome sair como ela sai */
  estiloDoNome?: React.CSSProperties
  nomeDa: (chave: Chave) => string
  onEscolher: (value: string) => void
  aoPassar?: (value: string | null) => void
}): React.JSX.Element {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent): void => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const escapar = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('mousedown', fechar, true)
    window.addEventListener('keydown', escapar)
    return () => {
      window.removeEventListener('mousedown', fechar, true)
      window.removeEventListener('keydown', escapar)
    }
  }, [aberto])

  /* fechar o menu tem de devolver a amostra à fonte escolhida, mesmo quando o
     mouse saiu por cima de um item em vez de sair pela borda */
  useEffect(() => {
    if (!aberto) aoPassar?.(null)
  }, [aberto, aoPassar])

  const atual = opcoes.find((f) => f.value === valor) ?? opcoes.find((f) => f.value === padrao) ?? opcoes[0]

  return (
    <div ref={caixa} className={classeCaixa}>
      <button
        type="button"
        {...{ [marca]: '' }}
        {...ajuda(ajudaId)}
        title={rotulo}
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={classeGatilho}
      >
        <span
          className="min-w-0 flex-1 truncate text-left"
          style={{ fontFamily: atual.value, ...estiloDoNome }}
        >
          {nomeDa(atual.chave)}
        </span>
        <Icon name="down" size={8} className="flex-none opacity-70" />
      </button>
      {aberto ? (
        <div
          onMouseLeave={() => aoPassar?.(null)}
          className={`absolute left-0 z-50 min-w-max rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] py-1 shadow-[0_8px_24px_rgba(0,0,0,.6)] ${
            direcao === 'cima' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {opcoes.map((fonte) => (
            <button
              key={fonte.chave}
              type="button"
              data-fonte-item={fonte.chave}
              /* a mesma ajuda do gatilho: o `check-ajuda` cobra explicação de
                 todo elemento clicável, e estes são irmãos do botão, não
                 filhos — não herdariam a dele */
              {...ajuda(ajudaId)}
              onMouseEnter={() => aoPassar?.(fonte.value)}
              onClick={() => {
                setAberto(false)
                onEscolher(fonte.value)
              }}
              className={`block w-full px-3 py-1.5 text-left text-[11px] whitespace-nowrap hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] ${
                fonte.value === atual.value
                  ? 'bg-[var(--color-ink-3)] text-[var(--color-fog-0)]'
                  : 'text-[var(--color-fog-1)]'
              }`}
              style={{ fontFamily: fonte.value, ...estiloDoNome }}
            >
              {nomeDa(fonte.chave)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
