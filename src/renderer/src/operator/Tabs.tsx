import { useEffect, useState } from 'react'
import type { Action } from '@shared/actions'
import type { AppState } from '@shared/types'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'
import { Icon } from '../ui/Icon'
import { Tecla } from '../ui/console'

interface Props {
  state: AppState
  dispatch: (action: Action) => void
}

/**
 * As fichas dos roteiros: pontinho colorido, nome, ×.
 *
 * A ativa é a única em relevo — fundo mais claro com fio de luz —, as outras
 * são superfícies chatas: numa fila de dez, o olho precisa achar "qual está
 * valendo" sem ler nada. Cada ficha estica para dividir a linha (como na
 * maquete), com um teto de largura para duas abas não virarem dois tapetes.
 *
 * O × existe em qualquer aba, ativa ou não: fechar uma aba de fundo era um
 * clique a mais (ativar, depois fechar) por nenhum motivo — a única regra é
 * nunca fechar a última, para o programa não ficar sem roteiro nenhum.
 */
export function Tabs({ state, dispatch }: Props): React.JSX.Element {
  const { t } = useT()
  const [editing, setEditing] = useState<string | null>(null)
  /* qual aba abriu o menu, e onde na tela — a posição é do PONTEIRO e não da
     ficha, para o menu nascer onde a mão já está */
  const [menu, setMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)
  const [esperandoCopia, setEsperandoCopia] = useState<string | null>(null)

  useEffect(() => {
    if (esperandoCopia === null || state.activeTabId === esperandoCopia) return
    setEditing(state.activeTabId)
    setEsperandoCopia(null)
  }, [esperandoCopia, state.activeTabId])

  const noMenu = menu ? state.tabs.find((tab) => tab.id === menu.tabId) : undefined

  return (
    <div className="flex min-w-0 flex-1 items-center gap-[3px] overflow-x-auto">
      {state.tabs.map((tab, index) => {
        const active = tab.id === state.activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => dispatch({ type: 'tab/activate', tabId: tab.id })}
            onDoubleClick={() => setEditing(tab.id)}
            /* o direito aponta QUAL aba: com um botão fixo na barra, duplicar
               valeria sempre para a ativa, e obrigaria a trocar de aba antes */
            onContextMenu={(event) => {
              event.preventDefault()
              setMenu({ tabId: tab.id, x: event.clientX, y: event.clientY })
            }}
            {...ajuda('tabs.tab')}
            title={`${tab.title} · Ctrl+${index === 9 ? 0 : index + 1}`}
            className={`flex min-w-0 flex-1 cursor-pointer items-center gap-[7px] rounded-md px-2.5 py-[6px] text-[11px] ${
              active
                ? 'max-w-[210px] border border-[var(--color-edge)] bg-[#2e2e33] font-semibold text-[var(--color-fog-0)] shadow-[inset_0_1px_0_rgba(255,255,255,.07)]'
                : 'max-w-[190px] bg-[#212124] font-medium text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)]'
            }`}
          >
            <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: tab.color }} />
            {editing === tab.id ? (
              <input
                autoFocus
                defaultValue={tab.title}
                onBlur={(event) => {
                  dispatch({ type: 'tab/rename', tabId: tab.id, title: event.target.value })
                  setEditing(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') setEditing(null)
                }}
                className="w-full min-w-0 bg-transparent outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate">{tab.title}</span>
            )}
            {state.tabs.length > 1 ? (
              <button
                type="button"
                {...ajuda('tabs.close')}
                aria-label={t('tabs.close', { title: tab.title })}
                onClick={(event) => {
                  event.stopPropagation()
                  dispatch({ type: 'tab/close', tabId: tab.id })
                }}
                className="flex-none text-[var(--color-fog-3)] hover:text-[var(--color-fog-0)]"
              >
                <Icon name="close" size={12} />
              </button>
            ) : null}
          </div>
        )
      })}

      {state.tabs.length < 10 ? (
        <Tecla
          {...ajuda('tabs.new')}
          aria-label={t('tabs.new')}
          title={t('tabs.new.hint')}
          className="h-[26px] w-7 flex-none"
          onClick={() => dispatch({ type: 'tab/add' })}
        >
          <Icon name="plus" size={14} />
        </Tecla>
      ) : (
        <span className="flex-none px-1 text-[11px] text-[var(--color-fog-3)]">{t('tabs.max')}</span>
      )}

      {/* O menu junta o que estava espalhado: renomear era duplo clique e
          fechar era o ×, sem nada que dissesse que existiam. Fica em `fixed`
          porque a fileira de abas rola na horizontal — ancorado nela, o menu
          sairia junto ao primeiro arrasto. */}
      {noMenu ? (
        <>
          <div data-sem-roda className="fixed inset-0 z-50" onMouseDown={() => setMenu(null)} />
          <div
            data-tab-menu={noMenu.id}
            style={{ left: menu!.x, top: menu!.y }}
            className="fixed z-50 min-w-max rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] py-1 shadow-lg"
          >
            <ItemDoMenu
              marca="duplicar"
              rotulo={t('tabs.duplicate')}
              /* no teto de 10 o item some em vez de ficar clicável e não
                 fazer nada — a fileira já diz que chegou ao limite */
              some={state.tabs.length >= 10}
              onClick={() => {
                dispatch({ type: 'tab/duplicate', tabId: noMenu.id })
                setMenu(null)
                /* A cópia nasce com o nome em edição: nomear é o passo
                   seguinte a duplicar, sempre — "VERSÃO PÓS" não se escreve
                   sozinha.
                   O id da nova é cunhado no main, então aqui só se guarda
                   QUAL era a aba ativa. Quando a ativa mudar, a que chegou é
                   a cópia. Marcar "renomear a próxima" sem essa referência
                   poria a ORIGINAL em edição, porque o efeito rodaria antes
                   de a resposta do main voltar. */
                setEsperandoCopia(state.activeTabId)
              }}
            />
            <ItemDoMenu
              marca="renomear"
              rotulo={t('tabs.rename')}
              onClick={() => {
                setMenu(null)
                setEditing(noMenu.id)
              }}
            />
            <ItemDoMenu
              marca="fechar"
              rotulo={t('tabs.closeItem')}
              some={state.tabs.length <= 1}
              onClick={() => {
                setMenu(null)
                dispatch({ type: 'tab/close', tabId: noMenu.id })
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

function ItemDoMenu({
  marca,
  rotulo,
  some = false,
  onClick
}: {
  marca: string
  rotulo: string
  /** o item nem aparece — não há o que fazer com ele neste estado */
  some?: boolean
  onClick: () => void
}): React.JSX.Element | null {
  if (some) return null
  return (
    <button
      type="button"
      data-tab-menu-item={marca}
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-[11px] whitespace-nowrap text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
    >
      {rotulo}
    </button>
  )
}
