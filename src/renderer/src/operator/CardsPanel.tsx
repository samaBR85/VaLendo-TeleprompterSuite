import { useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { MAX_CARTOES, novoCartaoId } from '@shared/cards'
import type { Cartao } from '@shared/types'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

interface Props {
  cards: Cartao[]
  /** id do que está na tela do apresentador */
  noAr: string | null
  /** a tela preta cobre o cartão; vale avisar em vez de deixar parecer defeito */
  blackout: boolean
  dispatch: (action: Action) => void
  onClose: () => void
}

/**
 * Os cartões do programa.
 *
 * Preparados antes — standby, logo, "voltamos já" — e acionados no meio do ar
 * por clique ou por Ctrl+Shift+1 a 6. Os recados são escritos aqui mesmo:
 * quando é preciso dizer alguma coisa ao apresentador, digitar é mais rápido
 * que preparar uma arte.
 */
export function CardsPanel({ cards, noAr, blackout, dispatch, onClose }: Props): React.JSX.Element {
  const { t } = useT()
  const [ocupado, setOcupado] = useState(false)
  const cheio = cards.length >= MAX_CARTOES

  /*
   * O painel arrasta pelo cabeçalho porque ele tapa justamente a prévia: com o
   * cartão no ar, o operador quer ver o que foi para a tela do apresentador
   * enquanto escreve o próximo recado. Fechar e reabrir a cada conferida seria
   * pior que arrastar uma vez.
   */
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null)
  const arrasto = useRef<{ dx: number; dy: number } | null>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  /**
   * Um arrasto acabou de terminar fora do painel.
   *
   * O clique nasce no ancestral comum entre onde o botão desceu e onde subiu:
   * começando no cabeçalho e soltando sobre o fundo, ele nasce no FUNDO — que
   * é o que fecha o painel. Sem esta trava, todo arrasto um pouco largo
   * fechava os cartões no fim do gesto.
   */
  const arrastouAgora = useRef(false)

  const comecarArrasto = (event: React.MouseEvent): void => {
    const box = caixaRef.current?.getBoundingClientRect()
    if (!box) return
    arrasto.current = { dx: event.clientX - box.left, dy: event.clientY - box.top }

    const mover = (e: MouseEvent): void => {
      const a = arrasto.current
      const caixa = caixaRef.current
      if (!a || !caixa) return
      arrastouAgora.current = true
      // prende na janela: arrastar para fora deixaria o painel inalcançável,
      // e o cabeçalho é a única alça de volta
      const largura = caixa.offsetWidth
      const altura = caixa.offsetHeight
      setPosicao({
        x: Math.min(Math.max(0, e.clientX - a.dx), window.innerWidth - largura),
        y: Math.min(Math.max(0, e.clientY - a.dy), window.innerHeight - altura)
      })
    }
    const soltar = (): void => {
      arrasto.current = null
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const fecharPeloFundo = (): void => {
    if (arrastouAgora.current) {
      arrastouAgora.current = false
      return
    }
    onClose()
  }

  const adicionarImagem = async (): Promise<void> => {
    if (cheio || ocupado) return
    setOcupado(true)
    try {
      const id = novoCartaoId(Date.now(), cards.length)
      const escolhido = await window.valendo.pickCardImage(id)
      if (!escolhido) return
      dispatch({
        type: 'card/add',
        card: { id, kind: 'image', nome: escolhido.sugestao || t('cards.addImage'), arquivo: escolhido.arquivo }
      })
    } finally {
      setOcupado(false)
    }
  }

  const adicionarRecado = (): void => {
    if (cheio) return
    const id = novoCartaoId(Date.now(), cards.length)
    dispatch({ type: 'card/add', card: { id, kind: 'text', nome: t('cards.message'), texto: '' } })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={fecharPeloFundo}
      role="presentation"
    >
      <div
        ref={caixaRef}
        data-cards-panel
        onClick={(event) => event.stopPropagation()}
        style={posicao ? { position: 'fixed', left: posicao.x, top: posicao.y, margin: 0 } : undefined}
        className="flex max-h-[80vh] w-[480px] flex-col rounded-xl border border-[var(--color-line)] bg-[var(--color-ink-1)]"
      >
        <div
          data-cards-drag
          onMouseDown={comecarArrasto}
          className="flex flex-none cursor-grab items-center gap-2 border-b border-[var(--color-line)] px-5 py-3.5 active:cursor-grabbing"
        >
          <Icon name="card" size={18} />
          <h2 className="text-[15px] text-[var(--color-fog-0)]">{t('cards.title')}</h2>
          <button
            type="button"
            aria-label={t('app.close')}
            onClick={onClose}
            className="ml-auto text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-[12px] leading-relaxed text-[var(--color-fog-1)]">{t('cards.hint')}</p>

          {blackout && noAr ? (
            <p className="mb-3 rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2 text-[11px] text-[var(--color-warn)]">
              {t('cards.blackoutWins')}
            </p>
          ) : null}

          {cards.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--color-line)] px-3 py-6 text-center text-[12px] text-[var(--color-fog-2)]">
              {t('cards.empty')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {cards.map((card, index) => (
                <Linha
                  key={card.id}
                  card={card}
                  atalho={index + 1}
                  noAr={noAr === card.id}
                  dispatch={dispatch}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-none items-center gap-2 border-t border-[var(--color-line)] px-5 py-3">
          <button
            type="button"
            data-card-add-image
            disabled={cheio || ocupado}
            onClick={() => void adicionarImagem()}
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] disabled:opacity-30"
          >
            <Icon name="card" size={13} />
            {t('cards.addImage')}
          </button>
          <button
            type="button"
            data-card-add-text
            disabled={cheio}
            onClick={adicionarRecado}
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] disabled:opacity-30"
          >
            <Icon name="direction" size={13} />
            {t('cards.addText')}
          </button>
          {cheio ? <span className="ml-auto text-[11px] text-[var(--color-fog-2)]">{t('cards.max')}</span> : null}
        </div>
      </div>
    </div>
  )
}

function Linha({
  card,
  atalho,
  noAr,
  dispatch
}: {
  card: Cartao
  atalho: number
  noAr: boolean
  dispatch: (action: Action) => void
}): React.JSX.Element {
  const { t } = useT()

  return (
    <div
      data-card-row={card.id}
      data-on-air={noAr ? 'sim' : 'nao'}
      className={`flex items-start gap-3 rounded-lg border p-2.5 ${
        noAr ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/[0.07]' : 'border-[var(--color-line)]'
      }`}
    >
      {/* a miniatura é a mesma imagem que vai ao ar: reconhecer o cartão pelo
          desenho é mais rápido que ler o nome no meio de um programa */}
      <div className="flex h-[52px] w-[92px] flex-none items-center justify-center overflow-hidden rounded border border-[var(--color-line)] bg-black">
        {card.kind === 'image' ? (
          <img
            src={`valendo://cartao/${encodeURIComponent(card.arquivo)}`}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="line-clamp-3 px-1 text-center text-[9px] leading-tight whitespace-pre-wrap text-[var(--color-fog-1)]">
            {card.texto || '—'}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            value={card.nome}
            aria-label={t('cards.name')}
            onChange={(event) => dispatch({ type: 'card/rename', cardId: card.id, nome: event.target.value })}
            className="min-w-0 flex-1 rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1 text-[12px] outline-none"
          />
          <kbd className="flex-none rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fog-2)]">
            Ctrl+Shift+{atalho}
          </kbd>
        </div>

        {card.kind === 'text' ? (
          <textarea
            value={card.texto}
            aria-label={t('cards.message')}
            placeholder={t('cards.messagePlaceholder')}
            rows={1}
            onChange={(event) => dispatch({ type: 'card/text', cardId: card.id, texto: event.target.value })}
            // cresce com o texto em vez de rolar dentro de uma caixa de uma
            // linha: o recado vai para a tela como foi escrito, e onde o
            // operador apertou Enter é onde ele quebra lá também
            ref={(el) => {
              if (!el) return
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
            className="resize-none overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1 text-[12px] leading-snug outline-none"
          />
        ) : null}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-card-show={card.id}
            onClick={() => dispatch({ type: 'card/show', cardId: card.id })}
            className={`rounded-md border px-2.5 py-1 text-[11px] ${
              noAr
                ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/14 text-[var(--color-go)]'
                : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
            }`}
          >
            {noAr ? t('cards.hide') : t('cards.show')}
          </button>
          {noAr ? <span className="text-[10px] text-[var(--color-go)]">{t('cards.onAir')}</span> : null}
          <button
            type="button"
            data-card-remove={card.id}
            aria-label={t('cards.remove')}
            title={t('cards.remove')}
            onClick={() => dispatch({ type: 'card/remove', cardId: card.id })}
            className="ml-auto rounded p-1 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-live)]"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
