import { useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines } from '@shared/anchor'
import { CARD_DRAG_MIME, ESTILOS_DE_OVERLAY } from '@shared/cards'
import { formatBinding, parseBinding } from '@shared/commands'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import { CHAPTER_MARK } from '@shared/text'
import type {
  Cartao,
  CardOverlayStyle,
  PreferenciasDaMaquina,
  Tab,
  Transport
} from '@shared/types'
import { ajudaDe, type AjudaId } from '@shared/ajuda'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { ajuda, useAjudaApontada } from '../ui/ajuda'
import { CabecalhoDePainel, Ficha, SliderConsole } from '../ui/console'
import { passoDaMiniatura, THUMB_MAX, THUMB_MIN } from '@shared/defaults'
import { useNow } from '../ui/useNow'

/**
 * Quanto (em px) a linha no índice `i` desliza verticalmente para revelar o
 * slot que vai receber o cartão arrastado — mesma conta de `CardsDrawer.tsx`,
 * só que na vertical, e com a altura da linha MEDIDA no início do arrasto
 * (não um número fixo: aqui a altura varia com o tamanho da miniatura, que o
 * operador ajusta pelo slider do rodapé).
 */
function deslocamentoVertical(
  cards: Cartao[],
  arrasto: { cardId: string; sobre: number; alturaSlot: number } | null,
  i: number
): number {
  if (!arrasto) return 0
  const origem = cards.findIndex((c) => c.id === arrasto.cardId)
  if (origem === -1 || cards[i]?.id === arrasto.cardId) return 0
  const alvo = origem < arrasto.sobre ? arrasto.sobre - 1 : arrasto.sobre
  if (origem < alvo && i > origem && i <= alvo) return -arrasto.alturaSlot
  if (origem > alvo && i >= alvo && i < origem) return arrasto.alturaSlot
  return 0
}

interface Props {
  tab: Tab
  transport: Transport
  cards: Cartao[]
  /** o interruptor "OVERLAY" — força o texto por cima de qualquer cartão */
  cardOverlay: { enabled: boolean; style: CardOverlayStyle }
  /** régua medida da aba ativa — a mesma que governa a rolagem de verdade */
  rows: number[]
  /** largura da coluna em pixels, ajustada pelo operador na divisória direita */
  sidebarWidth: number
  /** conforto desta máquina: miniaturas e a caixa de ajuda */
  maquina: PreferenciasDaMaquina
  /** teclas de agora — a ajuda mostra o atalho REAL, não um decorado no texto */
  keymap: Map<string, string>
  dispatch: (action: Action) => void
}

/**
 * A tecla de um comando, do jeito que ela está AGORA — "" quando não tem.
 *
 * Mesma conta do `hint` da barra, mas sem o " · " de colar em rótulo: aqui a
 * tecla aparece sozinha, dentro de um `<kbd>`. Lê de `@shared/commands`
 * direto, e não do Toolbar, para a coluna não passar a depender da barra.
 */
/** A caixa da ajuda — a mesma medida com texto e sem, para nada saltar ao apontar. */
const CAIXA_DA_AJUDA = 'h-[124px] px-3 py-2.5'

function teclaDoComando(keymap: Map<string, string>, commandId: string): string {
  const binding = parseBinding(keymap.get(commandId) ?? '')
  if (!binding) return ''
  return formatBinding(binding, window.valendo.platform === 'darwin')
}

/**
 * O corpo da Ajuda rápida: o nome e a descrição do controle apontado.
 *
 * Altura FIXA, e MEDIDA. Fixa porque a caixa é vizinha do slider de miniatura
 * e do próprio botão de recolher: crescendo, ela empurraria para cima o
 * controle que o ponteiro está usando naquele instante.
 *
 * O número não é chute — saiu de medir os 134 textos com a fonte e o leading
 * reais, na coluna mais ESTREITA que ela pode ficar (180px, o
 * `SIDEBAR_WIDTH_MIN`): o mais longo ocupa 85px, cinco linhas. Com o título,
 * o respiro e a folga, dá os 124 daqui. Na largura padrão sobra espaço — sobra
 * é calma; falta era meia frase cortada.
 *
 * E o parágrafo rola em vez de recortar: a tradução alemã cresce ~35% sobre o
 * inglês, e um texto cortado no meio é pior que um que pede um gesto a mais.
 *
 * O atalho sai do keymap, nunca do texto: o dicionário guarda o id do comando,
 * e quem remapeou lê a própria tecla em vez da que estava escrita no dia em
 * que a frase foi redigida.
 */
function CorpoDaAjuda({ keymap }: { keymap: Map<string, string> }): React.JSX.Element {
  const { t, lang } = useT()
  const apontado = useAjudaApontada()

  if (!apontado) {
    return (
      <div className={CAIXA_DA_AJUDA}>
        <div className="mb-1 text-[11px] font-semibold text-[var(--color-go)]">{t('sidebar.help.idleTitle')}</div>
        <p className="text-[10.5px] leading-relaxed text-[var(--color-fog-2)]">{t('sidebar.help.idle')}</p>
      </div>
    )
  }

  const texto = ajudaDe(lang, apontado)
  const tecla = texto.comando ? teclaDoComando(keymap, texto.comando) : ''
  return (
    <div data-ajuda-corpo={apontado} className={CAIXA_DA_AJUDA}>
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--color-go)]">
          {texto.nome}
        </span>
        {tecla ? (
          <kbd className="flex-none rounded border border-[var(--color-edge)] bg-[var(--color-ink-2)] px-1 font-mono text-[9px] text-[var(--color-fog-2)]">
            {tecla}
          </kbd>
        ) : null}
      </div>
      <p className="h-[85px] overflow-y-auto text-[10.5px] leading-relaxed text-[var(--color-fog-2)]">
        {texto.texto}
      </p>
    </div>
  )
}


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
 * Um dos cartõezinhos das pontas do slider de miniatura, que anda 10% do curso
 * por clique. O tamanho do próprio glifo diz para que lado ele anda — igual aos
 * "aA" do slider de fonte do editor.
 */
function DegrauDaMiniatura({
  label,
  size,
  disabled,
  ajudaId,
  onClick
}: {
  label: string
  size: number
  disabled?: boolean
  ajudaId: AjudaId
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      {...ajuda(ajudaId)}
      onClick={onClick}
      className="flex-none rounded px-0.5 leading-none text-[var(--color-fog-3)] hover:text-[var(--color-fog-0)] disabled:opacity-30 disabled:hover:text-[var(--color-fog-3)]"
    >
      <Icon name="card" size={size} />
    </button>
  )
}

/**
 * A coluna da esquerda: onde o programa está, em vez de onde o texto está.
 *
 * Os capítulos já existem no roteiro (cada `##` é um) e a duração de cada um
 * sai da MESMA régua que governa a rolagem — via `buildRundown`, o mesmo
 * cálculo que a Mesa usa. Não é uma conta paralela: se o número aqui e o
 * tempo real divergissem, a coluna viraria uma mentira cronometrada.
 *
 * Clicar num capítulo salta para ele pelo mesmo caminho de "próximo
 * capítulo" — uma lista que parece clicável precisa ser clicável.
 */
export function Sidebar({
  tab,
  transport,
  cards,
  cardOverlay,
  rows,
  sidebarWidth,
  maquina,
  keymap,
  dispatch
}: Props): React.JSX.Element {
  const { t } = useT()
  const now = useNow()
  // conforto desta máquina, e não dado do projeto: sobrevive a fechar o app
  // (vai no workspace) mas nunca entra no .valendo — ver `semMaquina`
  const { thumbSize, ajudaAberta } = maquina
  const mudarMiniatura = (thumbSize: number): void => dispatch({ type: 'maquina/patch', patch: { thumbSize } })
  const [arrasto, setArrasto] = useState<{ cardId: string; sobre: number; alturaSlot: number } | null>(null)

  const lines = useMemo(
    () => composeLines(tab.blocks, tab.appearance, rows),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const segments = useMemo(() => buildRundown(tab.blocks, lines, tab.markers), [tab.blocks, lines, tab.markers])
  const atual = segmentIndexAt(segments, wordIndexAt(transport, now))

  /** Arrasta a borda direita: mesmo molde da divisória da gaveta de cards. */
  const comecarArrasto = (): void => {
    const mover = (event: MouseEvent): void => {
      dispatch({ type: 'layout/sidebarWidth', width: event.clientX })
    }
    const soltar = (): void => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <aside
      data-sidebar
      style={{ width: sidebarWidth }}
      className="relative flex flex-none flex-col border-r border-[var(--color-edge)] bg-[#17171a]"
    >
      <div
        data-sidebar-resizer
        onMouseDown={comecarArrasto}
        className="absolute inset-y-0 -right-0.5 z-10 w-1.5 cursor-col-resize hover:bg-[var(--color-fog-2)]"
      />
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
                {...ajuda('sidebar.chapter')}
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
                  {segment.title ? `${CHAPTER_MARK} ${segment.title}` : t('deck.noChapter')}
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
              {/* as fichas vêm ANTES do botão: assim o "OVERLAY" fica sempre
                  na mesma ponta da direita, ligado ou desligado, e ligá-lo
                  não empurra o próprio botão para o lado — antes ele saltava
                  de lugar no instante do clique, e o segundo clique (para
                  desligar) caía no vazio */}
              {cardOverlay.enabled ? (
                <span className="flex flex-none gap-[2px]">
                  {ESTILOS_DE_OVERLAY.map((opcao) => (
                    <Ficha
                      key={opcao.style}
                      ativa={cardOverlay.style === opcao.style}
                      {...ajuda(opcao.ajudaId)}
                      title={t(opcao.rotulo)}
                      onClick={() => dispatch({ type: 'cardOverlay/style', style: opcao.style })}
                      className="h-4 w-4 rounded-[3px] p-0 text-[8px] leading-none"
                    >
                      {opcao.letra}
                    </Ficha>
                  ))}
                </span>
              ) : null}
              {/* "OVERLAY" ligado FORÇA o texto por cima de qualquer cartão,
                  mesmo com o toggle dele desligado — a garantia do operador.
                  Desligado, cada cartão decide sozinho pelo próprio toggle. */}
              <button
                type="button"
                data-overlay-global
                {...ajuda('sidebar.overlayGlobal')}
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
            </>
          }
        />

        {cards.length === 0 ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-[var(--color-fog-3)]">{t('sidebar.noCards')}</p>
        ) : (
          <div className="flex flex-col gap-1.5 p-2">
            {cards.map((card, index) => (
              <div
                key={card.id}
                draggable
                data-card-drag={card.id}
                onDragStart={(event) => {
                  // só o campo de texto e o toggle de OVERLAY recusam o
                  // arrasto — o botão de mostrar o cartão (`data-sidebar-card`)
                  // cobre quase a linha inteira, e excluir "button" em bloco
                  // deixava a linha sem nenhuma área que ainda iniciasse o
                  // arrasto
                  if (
                    event.target instanceof HTMLElement &&
                    event.target.closest('input, textarea, [data-no-card-drag]')
                  ) {
                    event.preventDefault()
                    return
                  }
                  event.dataTransfer.setData(CARD_DRAG_MIME, card.id)
                  event.dataTransfer.effectAllowed = 'move'
                  // gap-1.5 = 6px: a altura da linha muda com o tamanho da
                  // miniatura, então mede aqui em vez de supor um número fixo
                  const alturaSlot = event.currentTarget.getBoundingClientRect().height + 6
                  setArrasto({ cardId: card.id, sobre: index, alturaSlot })
                }}
                onDragEnd={() => setArrasto(null)}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(CARD_DRAG_MIME)) return
                  event.preventDefault()
                  // sem isto o cursor mostra bloqueado o arrasto inteiro,
                  // mesmo aceitando o drop de verdade
                  event.dataTransfer.dropEffect = 'move'
                  const rect = event.currentTarget.getBoundingClientRect()
                  const antes = event.clientY < rect.top + rect.height / 2
                  setArrasto((a) => (a ? { ...a, sobre: antes ? index : index + 1 } : a))
                }}
                onDrop={(event) => {
                  const draggedId = event.dataTransfer.getData(CARD_DRAG_MIME)
                  if (!draggedId) return
                  event.preventDefault()
                  const rect = event.currentTarget.getBoundingClientRect()
                  const antes = event.clientY < rect.top + rect.height / 2
                  dispatch({ type: 'card/reorder', cardId: draggedId, toIndex: antes ? index : index + 1 })
                  setArrasto(null)
                }}
                className="flex flex-none"
              >
                {/* o deslize é só visual, num filho À PARTE de quem escuta o
                    arrasto: transformar o próprio elemento draggable faz o
                    navegador reavaliar o alvo do dragover a cada quadro
                    contra a posição nova, e como a linha se afasta debaixo
                    do ponteiro, o hit-test troca de alvo o tempo todo — trava
                    o arrasto inteiro. Aqui embaixo, o slot fica parado no
                    lugar de sempre; só o conteúdo desliza para revelar o vão */}
                <div
                  style={
                    deslocamentoVertical(cards, arrasto, index)
                      ? { transform: `translateY(${deslocamentoVertical(cards, arrasto, index)}px)` }
                      : undefined
                  }
                  className={`flex w-full flex-none items-center gap-2 rounded-md border p-[5px] text-left text-[10px] transition-all duration-150 ease-out ${
                    transport.card === card.id
                      ? 'border-[var(--color-go)]/60 bg-[var(--color-go)]/10 text-[var(--color-go)]'
                      : 'border-[var(--color-edge)] bg-[#1e1e22] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
                  }`}
                >
                  <button
                    type="button"
                    data-sidebar-card={card.id}
                    {...ajuda('sidebar.card')}
                    onClick={() => dispatch({ type: 'card/show', cardId: card.id })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <MiniaturaDoCartao card={card} size={thumbSize} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {card.nome || (card.kind === 'text' ? card.texto : '') || t('cards.title')}
                    </span>
                  </button>
                  {/* toggle por cartão: com o global desligado, decide sozinho.
                      Ligado o global, força para TODOS — o botão mostra o
                      forçado e trava, para não sugerir um controle que não
                      manda mais nada enquanto o global está no comando */}
                  <button
                    type="button"
                    data-sidebar-card-overlay={card.id}
                    data-no-card-drag
                    {...ajuda('sidebar.cardOverlay')}
                    title={cardOverlay.enabled ? t('cards.overlayForced') : t('cards.overlay')}
                    aria-pressed={cardOverlay.enabled || (card.overlay ?? false)}
                    disabled={cardOverlay.enabled}
                    onClick={(event) => {
                      event.stopPropagation()
                      dispatch({ type: 'card/overlay', cardId: card.id, overlay: !(card.overlay ?? false) })
                    }}
                    className={`flex-none rounded-[4px] px-1 py-0.5 text-[8px] font-bold tracking-[0.04em] transition-colors ${
                      cardOverlay.enabled
                        ? 'cursor-not-allowed bg-[var(--color-accent-2)] text-[#1c1020]'
                        : card.overlay
                          ? 'bg-[var(--color-accent-2)] text-[#1c1020]'
                          : 'border border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
                    }`}
                  >
                    {t('cards.overlayShort')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* tamanho da miniatura dos cartões: cresce para a direita, empurrando
          o rótulo, que continua truncando dentro da largura fixa da coluna —
          o mesmo material do slider de fonte do editor */}
      <div className="flex flex-none items-center gap-2 border-t border-[var(--color-edge)] bg-[#131316] px-3 py-1.5">
        {/* os cartõezinhos das pontas são botões: um clique anda 10% do curso.
            Mesmo raciocínio dos "aA" do slider de fonte — arrastar atravessa a
            faixa num gesto, mas parar num tamanho redondo é sorte */}
        <DegrauDaMiniatura
          ajudaId="sidebar.thumbSmaller"
          label={t('sidebar.thumbSmaller')}
          size={10}
          disabled={thumbSize <= THUMB_MIN}
          onClick={() => mudarMiniatura(passoDaMiniatura(thumbSize, -1))}
        />
        <SliderConsole
          value={thumbSize}
          min={THUMB_MIN}
          max={THUMB_MAX}
          cor="var(--color-accent-2)"
          aria-label={t('sidebar.thumbSize')}
          {...ajuda('sidebar.thumbSize')}
          onValue={mudarMiniatura}
          className="w-full"
        />
        <DegrauDaMiniatura
          ajudaId="sidebar.thumbBigger"
          label={t('sidebar.thumbBigger')}
          size={16}
          disabled={thumbSize >= THUMB_MAX}
          onClick={() => mudarMiniatura(passoDaMiniatura(thumbSize, 1))}
        />
      </div>

      {/* a ajuda fica ancorada no rodapé da coluna, e não no meio do fluxo:
          é o único bloco aqui que não é o programa — some do caminho do olho
          quando o operador está procurando um capítulo. Colapsável, mas
          nasce aberta: é conforto de leitura de agora, não escolha que
          precise sobreviver a fechar o app */}
      <div className="flex-none border-t border-[var(--color-edge)] bg-[#131316]">
        <button
          type="button"
          data-sidebar-help-toggle
          {...ajuda('sidebar.helpToggle')}
          aria-expanded={ajudaAberta}
          onClick={() => dispatch({ type: 'maquina/patch', patch: { ajudaAberta: !ajudaAberta } })}
          className="flex h-[26px] w-full items-center gap-1.5 border-b border-[var(--color-edge)] px-2.5 text-left"
        >
          <span className="grid h-3.5 w-3.5 flex-none place-items-center rounded-full border border-[#5b6470] text-[9px] font-bold text-[#8b95a3]">
            ?
          </span>
          <span className="text-[10px] font-semibold text-[#9aa3b0]">{t('sidebar.help')}</span>
          <Icon
            name="down"
            size={11}
            className={`ml-auto flex-none text-[#8b95a3] transition-transform ${ajudaAberta ? '' : '-rotate-90'}`}
          />
        </button>
        {ajudaAberta ? <CorpoDaAjuda keymap={keymap} /> : null}
      </div>
    </aside>
  )
}
