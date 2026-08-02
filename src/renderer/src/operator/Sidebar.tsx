import { useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines } from '@shared/anchor'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import type { Cartao, CardOverlayStyle, Tab, Transport } from '@shared/types'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { CabecalhoDePainel, Ficha, SliderConsole } from '../ui/console'
import { useNow } from '../ui/useNow'

const THUMB_MIN = 40
const THUMB_MAX = 96
const THUMB_DEFAULT = 40

interface Props {
  tab: Tab
  transport: Transport
  cards: Cartao[]
  /** o interruptor "OVERLAY" — força o texto por cima de qualquer cartão */
  cardOverlay: { enabled: boolean; style: CardOverlayStyle }
  /** régua medida da aba ativa — a mesma que governa a rolagem de verdade */
  rows: number[]
  dispatch: (action: Action) => void
}

const ESTILOS_DE_OVERLAY: { style: CardOverlayStyle; letra: string; rotulo: 'cards.overlayStyle.faixa' | 'cards.overlayStyle.sombra' | 'cards.overlayStyle.nenhum' }[] = [
  { style: 'faixa', letra: 'F', rotulo: 'cards.overlayStyle.faixa' },
  { style: 'sombra', letra: 'S', rotulo: 'cards.overlayStyle.sombra' },
  { style: 'nenhum', letra: 'N', rotulo: 'cards.overlayStyle.nenhum' }
]

/**
 * A arte do cartão, em 5:3 no tamanho que o slider do rodapé pedir: imagem
 * pelo mesmo protocolo da gaveta, vídeo pelo poster que já viaja no projeto,
 * recado pelo glifo — nunca um <video>, que aqui seria um decodificador
 * rodando para pintar um selo.
 */
function MiniaturaDoCartao({ card, size }: { card: Cartao; size: number }): React.JSX.Element {
  return (
    <span
      className="flex flex-none items-center justify-center overflow-hidden rounded-[3px] border border-[var(--color-edge)] bg-[var(--color-ink-3)]"
      style={{ width: size, height: Math.round(size * 0.6) }}
    >
      {card.kind === 'image' ? (
        <img
          // reimportar pode gerar o MESMO nome de arquivo de antes (mesmo id,
          // mesma extensão) — sem `rev` na URL, o navegador reaproveita a
          // resposta antiga (ou um erro já resolvido) porque a `src` não mudou
          key={`${card.id}:${card.rev ?? 0}`}
          src={`valendo://cartao/${encodeURIComponent(card.arquivo)}?v=${card.rev ?? 0}`}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : card.kind === 'video' && card.poster ? (
        <img src={card.poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon name={card.kind === 'video' ? 'play' : 'direction'} size={10} className="text-[var(--color-fog-3)]" />
      )}
    </span>
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
export function Sidebar({ tab, transport, cards, cardOverlay, rows, dispatch }: Props): React.JSX.Element {
  const { t } = useT()
  const now = useNow()
  // conforto de visualização da coluna, como o tamanho de fonte do editor —
  // não é dado do projeto, não persiste entre sessões
  const [thumbSize, setThumbSize] = useState(THUMB_DEFAULT)

  const lines = useMemo(
    () => composeLines(tab.blocks, tab.appearance, rows),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const segments = useMemo(() => buildRundown(tab.blocks, lines, tab.markers), [tab.blocks, lines, tab.markers])
  const atual = segmentIndexAt(segments, wordIndexAt(transport, now))

  return (
    <aside
      data-sidebar
      className="flex w-[206px] flex-none flex-col border-r border-[var(--color-edge)] bg-[#17171a]"
    >
      <CabecalhoDePainel tique cor="var(--color-warn)" titulo={t('sidebar.chapters')} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {segments.length === 0 ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-[var(--color-fog-3)]">
            {t('sidebar.noChapters')}
          </p>
        ) : (
          <div className="flex flex-col gap-[3px] p-2">
            {segments.map((segment, index) => (
              <button
                key={segment.blockId}
                type="button"
                data-chapter={segment.blockId}
                aria-current={index === atual}
                onClick={() =>
                  dispatch({ type: 'transport/seekAnchor', anchor: { blockId: segment.blockId, wordOffset: 0 } })
                }
                className="flex flex-none items-baseline gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11px] transition-colors"
                style={
                  index === atual
                    ? {
                        background: 'color-mix(in srgb, var(--color-warn) 14%, transparent)',
                        borderLeft: '3px solid var(--color-warn)'
                      }
                    : { borderLeft: '3px solid color-mix(in srgb, var(--color-warn) 35%, transparent)' }
                }
              >
                <span
                  className={`min-w-0 flex-1 truncate ${
                    index === atual ? 'font-semibold' : 'font-medium text-[#a0a0a8]'
                  }`}
                  style={index === atual ? { color: '#f6d38a' } : undefined}
                >
                  {segment.title ? `§ ${segment.title}` : t('deck.noChapter')}
                </span>
                <span
                  className="flex-none font-mono text-[10px]"
                  style={{ color: index === atual ? '#8a7648' : '#6a6a72' }}
                >
                  {formatClock(secondsForWords(segment.rulerSpan, transport.ppm))}
                </span>
              </button>
            ))}
          </div>
        )}

        <CabecalhoDePainel
          tique
          cor="var(--color-accent-2)"
          titulo={t('sidebar.cards')}
          className="border-t border-t-[var(--color-edge)]"
          acao={
            <>
              {/* "OVERLAY" ligado FORÇA o texto por cima de qualquer cartão,
                  mesmo com o toggle dele desligado — a garantia do operador.
                  Desligado, cada cartão decide sozinho pelo próprio toggle. */}
              <button
                type="button"
                title={t('cards.overlayHint')}
                aria-pressed={cardOverlay.enabled}
                onClick={() => dispatch({ type: 'cardOverlay/set', enabled: !cardOverlay.enabled })}
                className={`flex-none rounded-[4px] px-1 py-0.5 text-[8px] font-bold tracking-[0.04em] transition-colors ${
                  cardOverlay.enabled
                    ? 'bg-[var(--color-accent-2)] text-[#1c1020]'
                    : 'border border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
                }`}
              >
                {t('cards.overlay')}
              </button>
              {cardOverlay.enabled ? (
                <span className="flex flex-none gap-[2px]">
                  {ESTILOS_DE_OVERLAY.map((opcao) => (
                    <Ficha
                      key={opcao.style}
                      ativa={cardOverlay.style === opcao.style}
                      title={t(opcao.rotulo)}
                      onClick={() => dispatch({ type: 'cardOverlay/style', style: opcao.style })}
                      className="h-4 w-4 rounded-[3px] p-0 text-[8px] leading-none"
                    >
                      {opcao.letra}
                    </Ficha>
                  ))}
                </span>
              ) : null}
            </>
          }
        />

        {cards.length === 0 ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-[var(--color-fog-3)]">{t('sidebar.noCards')}</p>
        ) : (
          <div className="flex flex-col gap-1.5 p-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`flex flex-none items-center gap-2 rounded-md border p-[5px] text-left text-[10px] transition-colors ${
                  transport.card === card.id
                    ? 'border-[var(--color-go)]/60 bg-[var(--color-go)]/10 text-[var(--color-go)]'
                    : 'border-[var(--color-edge)] bg-[#1e1e22] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
                }`}
              >
                <button
                  type="button"
                  data-sidebar-card={card.id}
                  onClick={() => dispatch({ type: 'card/show', cardId: card.id })}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <MiniaturaDoCartao card={card} size={thumbSize} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {card.nome || (card.kind === 'text' ? card.texto : '') || t('cards.title')}
                  </span>
                </button>
                {/* toggle por cartão: independente do switch global, que
                    quando ligado vale para todos sem precisar mexer aqui */}
                <button
                  type="button"
                  data-sidebar-card-overlay={card.id}
                  title={t('cards.overlayHint')}
                  aria-pressed={card.overlay ?? false}
                  onClick={(event) => {
                    event.stopPropagation()
                    dispatch({ type: 'card/overlay', cardId: card.id, overlay: !(card.overlay ?? false) })
                  }}
                  className={`flex-none rounded-[4px] px-1 py-0.5 text-[8px] font-bold tracking-[0.04em] transition-colors ${
                    card.overlay
                      ? 'bg-[var(--color-accent-2)] text-[#1c1020]'
                      : 'border border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
                  }`}
                >
                  {t('cards.overlay')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* tamanho da miniatura dos cartões: cresce para a direita, empurrando
          o rótulo, que continua truncando dentro da largura fixa da coluna —
          o mesmo material do slider de fonte do editor */}
      <div className="flex flex-none items-center gap-2 border-t border-[var(--color-edge)] bg-[#131316] px-3 py-1.5">
        <Icon name="card" size={10} className="flex-none text-[var(--color-fog-3)]" />
        <SliderConsole
          value={thumbSize}
          min={THUMB_MIN}
          max={THUMB_MAX}
          cor="var(--color-accent-2)"
          aria-label={t('sidebar.thumbSize')}
          onValue={setThumbSize}
          className="w-full"
        />
        <Icon name="card" size={16} className="flex-none text-[var(--color-fog-3)]" />
      </div>

      {/* a ajuda fica ancorada no rodapé da coluna, e não no meio do fluxo:
          é o único bloco aqui que não é o programa — some do caminho do olho
          quando o operador está procurando um capítulo */}
      <div className="flex-none border-t border-[var(--color-edge)] bg-[#131316]">
        <div className="flex h-[26px] items-center gap-1.5 border-b border-[var(--color-edge)] px-2.5">
          <span className="grid h-3.5 w-3.5 flex-none place-items-center rounded-full border border-[#5b6470] text-[9px] font-bold text-[#8b95a3]">
            ?
          </span>
          <span className="text-[10px] font-semibold text-[#9aa3b0]">{t('sidebar.help')}</span>
        </div>
        <div className="px-3 py-2.5">
          <div className="mb-1 text-[11px] font-semibold text-[var(--color-go)]">{t('sidebar.help.scrollTitle')}</div>
          <p className="text-[10.5px] leading-relaxed text-[var(--color-fog-2)]">{t('sidebar.help.scroll')}</p>
        </div>
      </div>
    </aside>
  )
}
