import { useEffect, useSyncExternalStore } from 'react'
import type { AjudaId } from '@shared/ajuda'

/**
 * Qual controle a Ajuda rápida está descrevendo agora.
 *
 * Fica FORA do `AppState` de propósito. Isto muda dezenas de vezes por segundo
 * quando o mouse atravessa uma barra: passando pelo estado, cada travessia
 * viraria uma ida ao processo main, um broadcast para as duas janelas e uma
 * linha a mais no `workspace.json` — para uma informação que morre no próximo
 * movimento do braço.
 *
 * Store externo em vez de contexto de React pelo mesmo motivo de custo: só o
 * quadro da coluna assina, então só ele redesenha. Com um `useState` no App, o
 * app inteiro (prévia, editor, gaveta) se redesenharia a cada passada do mouse,
 * inclusive com programa no ar.
 */

let atual: AjudaId | null = null
const inscritos = new Set<() => void>()

/**
 * O respiro antes de trocar.
 *
 * Atravessar o teclado de transporte passa o ponteiro por cinco teclas em meio
 * segundo. Sem esta espera o quadro pisca cinco textos no canto do olho de
 * quem está operando — e nenhum deles chega a ser lido.
 */
const RESPIRO_MS = 150
let agendado: ReturnType<typeof setTimeout> | null = null

function avisar(): void {
  for (const notificar of inscritos) notificar()
}

/**
 * Aponta a ajuda para um controle.
 *
 * Não existe "desapontar": ao sair de uma tecla, o texto FICA. Apagar no
 * `mouseout` faria o quadro esvaziar em todo vão entre dois botões, e a pessoa
 * lê a descrição depois de já ter chegado no controle — não durante o
 * trajeto até ele.
 */
export function apontarAjuda(id: AjudaId): void {
  if (id === atual) {
    // já é este: cancela uma troca que estivesse a caminho, senão o ponteiro
    // voltando para onde estava ainda dispararia a mudança agendada
    if (agendado) {
      clearTimeout(agendado)
      agendado = null
    }
    return
  }
  if (agendado) clearTimeout(agendado)
  agendado = setTimeout(() => {
    agendado = null
    atual = id
    avisar()
  }, RESPIRO_MS)
}

function inscrever(notificar: () => void): () => void {
  inscritos.add(notificar)
  return () => {
    inscritos.delete(notificar)
  }
}

/** O controle apontado agora — `null` só até o primeiro hover da sessão. */
export function useAjudaApontada(): AjudaId | null {
  return useSyncExternalStore(inscrever, () => atual)
}

/**
 * Instala o ouvinte único que descobre o que o ponteiro está apontando.
 *
 * Delegação, e não um `onMouseEnter` por controle: `mouseover` sobe pela
 * árvore, então um ouvinte no documento enxerga os 97 controles. Marcar um
 * botão passa a ser só pendurar `data-ajuda` nele — nenhum componente precisa
 * saber que esta ajuda existe.
 *
 * `focusin` junto porque quem navega por Tab tem o mesmo direito ao texto.
 */
export function useEscutarAjuda(): void {
  useEffect(() => {
    const olhar = (evento: Event): void => {
      const alvo = evento.target
      if (!(alvo instanceof Element)) return
      const dono = alvo.closest<HTMLElement>('[data-ajuda]')
      const id = dono?.dataset.ajuda
      if (id) apontarAjuda(id as AjudaId)
    }
    document.addEventListener('mouseover', olhar)
    document.addEventListener('focusin', olhar)
    return () => {
      document.removeEventListener('mouseover', olhar)
      document.removeEventListener('focusin', olhar)
      if (agendado) {
        clearTimeout(agendado)
        agendado = null
      }
    }
  }, [])
}

/**
 * Marca um controle, para espalhar no JSX: `<Tecla {...ajuda('ar.freeze')}>`.
 *
 * O tipo é o contrato: um id que não existe no dicionário não compila. É isto
 * que impede a tooltip e o quadro de divergirem — os dois nascem da MESMA
 * chave, e uma chave inventada nunca chega a rodar.
 */
export function ajuda(id: AjudaId): { 'data-ajuda': AjudaId } {
  return { 'data-ajuda': id }
}
