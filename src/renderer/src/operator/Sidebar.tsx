import { useMemo } from 'react'
import type { Action } from '@shared/actions'
import { composeLines } from '@shared/anchor'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import type { Cartao, Tab, Transport } from '@shared/types'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { useNow } from '../ui/useNow'

interface Props {
  tab: Tab
  transport: Transport
  cards: Cartao[]
  /** régua medida da aba ativa — a mesma que governa a rolagem de verdade */
  rows: number[]
  dispatch: (action: Action) => void
}

/** Título de seção da coluna, com a barrinha colorida da maquete. */
function Secao({ label, cor }: { label: string; cor: string }): React.JSX.Element {
  return (
    <div className="flex flex-none items-center gap-2 px-3 py-2">
      <span className="h-3 w-[3px] flex-none rounded-sm" style={{ background: cor }} />
      <span className="text-[11px] font-medium text-[var(--color-fog-1)]">{label}</span>
    </div>
  )
}

/**
 * A coluna da esquerda: onde o programa está, em vez de onde o texto está.
 *
 * Os capítulos já existem no roteiro (cada `§` é um) e a duração de cada um
 * sai da MESMA régua que governa a rolagem — via `buildRundown`, o mesmo
 * cálculo que a Mesa usa. Não é uma conta paralela: se o número aqui e o
 * tempo real divergissem, a coluna viraria uma mentira cronometrada.
 *
 * Clicar num capítulo salta para ele pelo mesmo caminho de "próximo
 * capítulo" — uma lista que parece clicável precisa ser clicável.
 */
export function Sidebar({ tab, transport, cards, rows, dispatch }: Props): React.JSX.Element {
  const { t } = useT()
  const now = useNow()

  const lines = useMemo(
    () => composeLines(tab.blocks, tab.appearance, rows),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const segments = useMemo(() => buildRundown(tab.blocks, lines, tab.markers), [tab.blocks, lines, tab.markers])
  const atual = segmentIndexAt(segments, wordIndexAt(transport, now))

  return (
    <aside
      data-sidebar
      className="flex w-[230px] flex-none flex-col border-r border-[var(--color-line)] bg-[var(--color-ink-1)]"
    >
      <Secao label={t('sidebar.chapters')} cor="var(--color-warn)" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {segments.length === 0 ? (
          <p className="px-3 py-1 text-[11px] leading-relaxed text-[var(--color-fog-3)]">
            {t('sidebar.noChapters')}
          </p>
        ) : (
          segments.map((segment, index) => (
            <button
              key={segment.blockId}
              type="button"
              data-chapter={segment.blockId}
              aria-current={index === atual}
              onClick={() =>
                dispatch({ type: 'transport/seekAnchor', anchor: { blockId: segment.blockId, wordOffset: 0 } })
              }
              className={`flex flex-none items-baseline gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                index === atual
                  ? 'bg-[var(--color-warn)]/12 text-[var(--color-warn)]'
                  : 'text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                {segment.title ? `§ ${segment.title}` : t('deck.noChapter')}
              </span>
              <span className="flex-none font-mono text-[10px] text-[var(--color-fog-3)]">
                {formatClock(secondsForWords(segment.rulerSpan, transport.ppm))}
              </span>
            </button>
          ))
        )}

        <Secao label={t('sidebar.cards')} cor="var(--color-accent-2)" />

        {cards.length === 0 ? (
          <p className="px-3 py-1 text-[11px] leading-relaxed text-[var(--color-fog-3)]">{t('sidebar.noCards')}</p>
        ) : (
          cards.map((card) => (
            <button
              key={card.id}
              type="button"
              data-sidebar-card={card.id}
              onClick={() => dispatch({ type: 'card/show', cardId: card.id })}
              className={`flex flex-none items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors ${
                transport.card === card.id
                  ? 'bg-[var(--color-go)]/12 text-[var(--color-go)]'
                  : 'text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
              }`}
            >
              <Icon
                name={card.kind === 'image' ? 'card' : card.kind === 'video' ? 'play' : 'direction'}
                size={12}
                className="flex-none"
              />
              <span className="min-w-0 flex-1 truncate">
                {card.nome || (card.kind === 'text' ? card.texto : '') || t('cards.title')}
              </span>
            </button>
          ))
        )}
      </div>

      {/* a ajuda fica ancorada no rodapé da coluna, e não no meio do fluxo:
          é o único bloco aqui que não é o programa — some do caminho do olho
          quando o operador está procurando um capítulo */}
      <div className="flex-none border-t border-[var(--color-line)] px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-[var(--color-fog-3)] uppercase">
          <Icon name="info" size={11} />
          {t('sidebar.help')}
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">{t('sidebar.help.scroll')}</p>
      </div>
    </aside>
  )
}
