import { useEffect, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { MAX_CARTOES, novoCartaoId } from '@shared/cards'
import { CARDS_HEIGHT_MAX, CARDS_HEIGHT_MIN } from '@shared/defaults'
import type { Cartao, VideoClock } from '@shared/types'
import { posicaoDoVideo, tempoDeVideo } from '@shared/video'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

type CartaoVideo = Extract<Cartao, { kind: 'video' }>

interface Props {
  cards: Cartao[]
  /** id do que está na tela do apresentador */
  noAr: string | null
  /** a tela preta cobre o cartão; vale avisar em vez de deixar parecer defeito */
  blackout: boolean
  /** o relógio do vídeo no ar — o controle daqui manda nele */
  clock: VideoClock
  altura: number
  dispatch: (action: Action) => void
  onClose: () => void
}

/**
 * A gaveta de cartões, no rodapé e em largura total.
 *
 * Era um modal, e modal é a forma errada para isto: cartão se aciona no meio
 * do programa, com a prévia à vista, e uma janela por cima justamente da
 * prévia obrigava a fechar e reabrir a cada conferida. Aqui as artes ficam
 * lado a lado — que é como se varre um conjunto de standby sob pressão, de
 * relance — e nada some da tela para isso.
 *
 * Dentro, dois lados com trabalhos diferentes: as miniaturas para disparar, e
 * a coluna da direita para tratar do arquivo com calma. O transporte do vídeo
 * fica numa faixa fixa embaixo, sempre no mesmo lugar, porque procurar botão
 * de play no meio de um programa é o tipo de coisa que não pode acontecer.
 */
export function CardsDrawer({
  cards,
  noAr,
  blackout,
  clock,
  altura,
  dispatch,
  onClose
}: Props): React.JSX.Element {
  const { t } = useT()
  const [ocupado, setOcupado] = useState(false)
  /** por que o último arquivo escolhido não serviu — some na próxima escolha */
  const [recusa, setRecusa] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const cheio = cards.length >= MAX_CARTOES

  // a seleção segue quem existe: apagar o cartão aberto não pode deixar a
  // coluna da direita mostrando um fantasma
  const alvo = cards.find((c) => c.id === selecionado) ?? null
  const videoNoAr = cards.find((c) => c.id === noAr && c.kind === 'video') as CartaoVideo | undefined

  /**
   * Arrasta a divisória do topo para dar mais ou menos altura à gaveta.
   *
   * O mesmo gesto que já redimensiona edição × transmissão no Split e a
   * prévia na Mesa — e, como lá, medindo contra a janela em vez de acumular
   * deltas, que erra quando o ponteiro sai da alça.
   */
  const comecarArrasto = (): void => {
    const mover = (event: MouseEvent): void => {
      const daBaixo = window.innerHeight - event.clientY
      dispatch({ type: 'layout/cardsHeight', height: Math.min(CARDS_HEIGHT_MAX, Math.max(CARDS_HEIGHT_MIN, daBaixo)) })
    }
    const soltar = (): void => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const adicionarImagem = async (): Promise<void> => {
    if (cheio || ocupado) return
    setOcupado(true)
    setRecusa(null)
    try {
      const id = novoCartaoId(Date.now(), cards.length)
      const escolhido = await window.valendo.pickCardImage(id)
      if (!escolhido) return
      dispatch({
        type: 'card/add',
        card: { id, kind: 'image', nome: escolhido.sugestao || t('cards.addImage'), arquivo: escolhido.arquivo }
      })
      setSelecionado(id)
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Sobe um vídeo — sem copiar nada.
   *
   * O arquivo fica onde está e o cartão guarda onde é esse lugar. Escolher
   * aqui é também o que autoriza o app a servir aquele arquivo: é a única
   * porta por onde um caminho entra na lista de autorizados.
   */
  const adicionarVideo = async (): Promise<void> => {
    if (cheio || ocupado) return
    setOcupado(true)
    setRecusa(null)
    try {
      const escolhido = await window.valendo.pickCardVideo()
      if (!escolhido) return
      if (escolhido.erro) {
        setRecusa(`${escolhido.arquivoNome} — ${escolhido.erro}`)
        return
      }
      const id = novoCartaoId(Date.now(), cards.length)
      dispatch({
        type: 'card/add',
        card: {
          id,
          kind: 'video',
          nome: escolhido.sugestao || t('cards.addVideo'),
          caminho: escolhido.caminho,
          arquivoNome: escolhido.arquivoNome,
          vinculado: true
        }
      })
      setSelecionado(id)
    } finally {
      setOcupado(false)
    }
  }

  const adicionarRecado = (): void => {
    if (cheio) return
    const id = novoCartaoId(Date.now(), cards.length)
    dispatch({ type: 'card/add', card: { id, kind: 'text', nome: '', texto: '' } })
    // já aberto na coluna da direita: um recado nasce vazio e só existe
    // depois de escrito
    setSelecionado(id)
  }

  return (
    <section
      data-cards-drawer
      style={{ height: altura }}
      className="relative flex flex-none flex-col border-t border-[var(--color-line)] bg-[var(--color-ink-1)]"
    >
      <div
        data-cards-resizer
        onMouseDown={comecarArrasto}
        className="absolute inset-x-0 -top-0.5 z-10 h-1.5 cursor-row-resize hover:bg-[var(--color-fog-2)]"
      />

      <header className="flex flex-none items-center gap-2 px-4 py-1.5">
        <Icon name="card" size={14} />
        <h2 className="text-[12px] text-[var(--color-fog-0)]">{t('cards.title')}</h2>

        <div className="ml-3 flex items-center gap-1.5">
          <BotaoAdicionar
            atributo="image"
            icone="card"
            rotulo={t('cards.addImage')}
            desligado={cheio || ocupado}
            onClick={() => void adicionarImagem()}
          />
          <BotaoAdicionar
            atributo="video"
            icone="play"
            rotulo={t('cards.addVideo')}
            desligado={cheio || ocupado}
            onClick={() => void adicionarVideo()}
          />
          <BotaoAdicionar
            atributo="text"
            icone="direction"
            rotulo={t('cards.addText')}
            desligado={cheio}
            onClick={adicionarRecado}
          />
        </div>

        {recusa ? (
          <span className="ml-3 min-w-0 truncate text-[11px] text-[var(--color-live)]">{recusa}</span>
        ) : blackout && noAr ? (
          <span className="ml-3 text-[11px] text-[var(--color-warn)]">{t('cards.blackoutWins')}</span>
        ) : cheio ? (
          <span className="ml-3 text-[11px] text-[var(--color-fog-2)]">{t('cards.max')}</span>
        ) : null}

        <button
          type="button"
          aria-label={t('app.close')}
          onClick={onClose}
          className="ml-auto rounded p-1 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
        >
          <Icon name="close" size={12} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 border-t border-[var(--color-line)]">
        {cards.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-[var(--color-fog-2)]">
            {t('cards.empty')}
          </p>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-2.5 overflow-x-auto px-4 py-2.5">
            {cards.map((card, index) => (
              <Miniatura
                key={card.id}
                card={card}
                atalho={index + 1}
                noAr={noAr === card.id}
                aberto={selecionado === card.id}
                onAbrir={() => setSelecionado(card.id)}
                dispatch={dispatch}
              />
            ))}
          </div>
        )}

        {alvo ? (
          <Detalhes
            key={alvo.id}
            card={alvo}
            noAr={noAr === alvo.id}
            dispatch={dispatch}
            onFechar={() => setSelecionado(null)}
          />
        ) : null}
      </div>

      {videoNoAr ? <Transporte card={videoNoAr} clock={clock} dispatch={dispatch} /> : null}
    </section>
  )
}

function BotaoAdicionar({
  atributo,
  icone,
  rotulo,
  desligado,
  onClick
}: {
  atributo: string
  icone: 'card' | 'play' | 'direction'
  rotulo: string
  desligado: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      {...{ [`data-card-add-${atributo}`]: true }}
      disabled={desligado}
      onClick={onClick}
      className="flex items-center gap-1 rounded border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] disabled:opacity-30"
    >
      <Icon name={icone} size={11} />
      {rotulo}
    </button>
  )
}

/**
 * O cartão como se vê de relance: a arte, o nome e a tecla.
 *
 * Clicar na miniatura põe no ar e tira, que é o gesto do meio do programa.
 * Abrir para editar é o botão pequeno — o contrário deixaria um clique
 * distraído mandando uma arte para a tela do apresentador.
 */
function Miniatura({
  card,
  atalho,
  noAr,
  aberto,
  onAbrir,
  dispatch
}: {
  card: Cartao
  atalho: number
  noAr: boolean
  aberto: boolean
  onAbrir: () => void
  dispatch: (action: Action) => void
}): React.JSX.Element {
  const { t } = useT()
  const desvinculado = card.kind === 'video' && card.vinculado === false

  return (
    <div
      data-card-tile={card.id}
      data-on-air={noAr ? 'sim' : 'nao'}
      className={`flex w-[128px] flex-none flex-col gap-1 rounded-lg border p-1.5 ${
        noAr
          ? 'border-[var(--color-go)]/60 bg-[var(--color-go)]/[0.09]'
          : aberto
            ? 'border-[var(--color-fog-2)]'
            : 'border-[var(--color-line)]'
      }`}
    >
      {card.kind === 'video' ? <PreparaVideo card={card} dispatch={dispatch} /> : null}

      <button
        type="button"
        data-card-show={card.id}
        disabled={desvinculado}
        title={noAr ? t('cards.hide') : t('cards.show')}
        onClick={() => dispatch({ type: 'card/show', cardId: card.id })}
        className="relative flex h-[64px] items-center justify-center overflow-hidden rounded border border-[var(--color-line)] bg-black disabled:cursor-not-allowed"
      >
        {card.kind === 'image' ? (
          <img
            src={`valendo://cartao/${encodeURIComponent(card.arquivo)}`}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : card.kind === 'video' ? (
          card.poster ? (
            <img src={card.poster} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <Icon name="play" size={16} />
          )
        ) : (
          <span className="line-clamp-3 px-1 text-center text-[9px] leading-tight whitespace-pre-wrap text-[var(--color-fog-1)]">
            {card.texto || '—'}
          </span>
        )}

        {card.kind === 'video' ? (
          <span className="absolute bottom-0.5 left-0.5 rounded-sm bg-black/70 px-1 text-[9px] text-[var(--color-fog-1)]">
            <Icon name="play" size={8} />
          </span>
        ) : null}

        {desvinculado ? (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-warn)]/85 py-0.5 text-[9px] text-black">
            {t('cards.videoMissing')}
          </span>
        ) : null}
      </button>

      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--color-fog-1)]" title={card.nome}>
          {card.nome || (card.kind === 'text' ? card.texto : '') || '—'}
        </span>
        <kbd className="flex-none rounded border border-[var(--color-line)] px-1 font-mono text-[9px] text-[var(--color-fog-2)]">
          {atalho}
        </kbd>
        <button
          type="button"
          data-card-open={card.id}
          aria-label={t('cards.edit')}
          title={t('cards.edit')}
          onClick={onAbrir}
          className="flex-none rounded p-0.5 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
        >
          <Icon name="sliders" size={11} />
        </button>
      </div>
    </div>
  )
}

/** A coluna da direita: tratar do cartão com calma, longe do gesto de disparar. */
function Detalhes({
  card,
  noAr,
  dispatch,
  onFechar
}: {
  card: Cartao
  noAr: boolean
  dispatch: (action: Action) => void
  onFechar: () => void
}): React.JSX.Element {
  const { t } = useT()

  const relinkar = async (): Promise<void> => {
    const escolhido = await window.valendo.pickCardVideo()
    if (!escolhido || escolhido.erro) return
    dispatch({
      type: 'card/videoLink',
      cardId: card.id,
      caminho: escolhido.caminho,
      arquivoNome: escolhido.arquivoNome,
      vinculado: true
    })
  }

  return (
    <aside
      data-card-details={card.id}
      className="flex w-[300px] flex-none flex-col gap-2 overflow-y-auto border-l border-[var(--color-line)] px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <input
          value={card.nome}
          aria-label={t('cards.name')}
          placeholder={
            card.kind === 'image'
              ? t('cards.namePlaceholderImage')
              : card.kind === 'video'
                ? t('cards.namePlaceholderVideo')
                : t('cards.namePlaceholderText')
          }
          onChange={(event) => dispatch({ type: 'card/rename', cardId: card.id, nome: event.target.value })}
          className="min-w-0 flex-1 rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1 text-[12px] outline-none placeholder:text-[var(--color-fog-2)]/70"
        />
        {/* fecha a coluna, não apaga o cartão: um X no alto de um painel lê
            como "fechar" em qualquer app, e apagar uma arte por engano no meio
            de um programa é caro demais para caber num ícone ambíguo */}
        <button
          type="button"
          data-card-details-close
          aria-label={t('app.close')}
          title={t('app.close')}
          onClick={onFechar}
          className="flex-none rounded p-1 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
        >
          <Icon name="close" size={12} />
        </button>
      </div>

      {card.kind === 'text' ? (
        <textarea
          value={card.texto}
          aria-label={t('cards.message')}
          placeholder={t('cards.messagePlaceholder')}
          rows={2}
          autoFocus={card.texto === ''}
          onChange={(event) => dispatch({ type: 'card/text', cardId: card.id, texto: event.target.value })}
          // cresce com o texto em vez de rolar dentro de uma caixa de uma
          // linha: o recado vai para a tela como foi escrito, e onde o
          // operador apertou Enter é onde ele quebra lá também
          ref={(el) => {
            if (!el) return
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }}
          className="resize-none overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1 text-[12px] leading-snug outline-none placeholder:text-[var(--color-fog-2)]/70"
        />
      ) : null}

      {card.kind === 'video' ? (
        <>
          {card.vinculado === false ? (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--color-warn)]" title={card.caminho}>
                {t('cards.videoMissing')}
              </span>
              <button
                type="button"
                data-card-relink={card.id}
                onClick={() => void relinkar()}
                className="flex-none rounded border border-[var(--color-warn)]/50 px-2 py-0.5 text-[11px] text-[var(--color-warn)] hover:bg-[var(--color-warn)]/15"
              >
                {t('cards.videoRelink')}
              </button>
            </div>
          ) : null}

          <p className="text-[10px] break-all text-[var(--color-fog-2)]" title={card.caminho}>
            {card.arquivoNome}
            {card.duracao ? ` · ${tempoDeVideo(card.duracao)}` : ''}
          </p>

          <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-fog-1)]">
            <input
              type="checkbox"
              data-card-loop={card.id}
              checked={card.loop ?? false}
              onChange={(event) => dispatch({ type: 'card/videoLoop', cardId: card.id, loop: event.target.checked })}
            />
            {t('cards.videoLoop')}
          </label>
        </>
      ) : null}

      {noAr ? <span className="text-[10px] text-[var(--color-go)]">{t('cards.onAir')}</span> : null}

      {/* escrito por extenso e no fim, longe do que se clica com pressa */}
      <button
        type="button"
        data-card-remove={card.id}
        onClick={() => {
          dispatch({ type: 'card/remove', cardId: card.id })
          onFechar()
        }}
        className="mt-auto self-start rounded px-1.5 py-0.5 text-[11px] text-[var(--color-fog-2)] hover:bg-[var(--color-live)]/12 hover:text-[var(--color-live)]"
      >
        {t('cards.remove')}
      </button>
    </aside>
  )
}

/**
 * Play, barra e volume do vídeo no ar — sempre na mesma faixa, embaixo.
 *
 * Não vive junto do cartão selecionado de propósito: o operador pode estar
 * com outro cartão aberto para editar enquanto o vídeo corre, e o botão de
 * pausa não pode mudar de lugar conforme o que está selecionado.
 *
 * O painel não tem tocador nenhum: manda comando para o relógio compartilhado
 * e quem desenha são as superfícies. É o que faz a prévia e a transmissão
 * nunca discordarem sobre onde o vídeo está.
 */
function Transporte({
  card,
  clock,
  dispatch
}: {
  card: CartaoVideo
  clock: VideoClock
  dispatch: (action: Action) => void
}): React.JSX.Element {
  const { t } = useT()
  const [agora, setAgora] = useState(() => Date.now())
  const [arrastando, setArrastando] = useState<number | null>(null)

  // a barra precisa andar sozinha enquanto toca; dez vezes por segundo é
  // suave o bastante para o olho e barato o bastante para não disputar
  // quadro com o vídeo em si
  useEffect(() => {
    if (!clock.tocando) return
    const id = setInterval(() => setAgora(Date.now()), 100)
    return () => clearInterval(id)
  }, [clock.tocando])

  const duracao = card.duracao ?? 0
  const posicao = arrastando ?? posicaoDoVideo(clock, agora, card.duracao, card.loop ?? false)

  const soltar = (): void => {
    if (arrastando === null) return
    // o pulo só chega à tela do apresentador agora, no soltar: acompanhar o
    // arrasto ao vivo mandaria um borrão para o ar
    dispatch({ type: 'card/videoSeek', segundo: arrastando, arrastando: false })
    setArrastando(null)
  }

  return (
    <div
      data-card-transport={card.id}
      className="flex flex-none items-center gap-2.5 border-t border-[var(--color-line)] px-4 py-1.5"
    >
      <button
        type="button"
        data-card-video-play={card.id}
        aria-label={clock.tocando ? t('cards.videoPause') : t('cards.videoPlay')}
        onClick={() => dispatch({ type: 'card/videoPlay', tocando: !clock.tocando })}
        className="flex-none rounded border border-[var(--color-line)] p-1 text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]"
      >
        <Icon name={clock.tocando ? 'pause' : 'play'} size={12} />
      </button>

      <span className="max-w-[160px] flex-none truncate text-[11px] text-[var(--color-fog-2)]">{card.nome}</span>

      <input
        type="range"
        data-card-video-seek={card.id}
        min={0}
        max={duracao || 1}
        step={0.05}
        value={Math.min(posicao, duracao || 1)}
        disabled={!duracao}
        aria-label={t('cards.videoSeek')}
        onChange={(event) => {
          const segundo = Number(event.target.value)
          setArrastando(segundo)
          dispatch({ type: 'card/videoSeek', segundo, arrastando: true })
        }}
        onPointerUp={soltar}
        onKeyUp={soltar}
        onBlur={soltar}
        className="min-w-0 flex-1 accent-[var(--color-go)]"
      />

      <span className="flex-none font-mono text-[10px] text-[var(--color-fog-2)]">
        {tempoDeVideo(posicao)} / {tempoDeVideo(duracao)}
      </span>

      <Icon name="volume" size={11} />
      <input
        type="range"
        data-card-video-volume={card.id}
        min={0}
        max={1}
        step={0.05}
        value={clock.volume}
        aria-label={t('cards.videoVolume')}
        onChange={(event) => dispatch({ type: 'card/videoVolume', volume: Number(event.target.value) })}
        className="w-16 flex-none accent-[var(--color-fog-1)]"
      />
    </div>
  )
}

/**
 * Tira um quadro do vídeo para servir de miniatura, e mede quanto ele dura.
 *
 * Roda uma vez por cartão, escondido. A miniatura é o que viaja no projeto —
 * o vídeo não vai junto, e sem um quadro guardado um cartão desvinculado
 * viraria um retângulo preto que ninguém reconhece na fileira.
 */
function PreparaVideo({
  card,
  dispatch
}: {
  card: CartaoVideo
  dispatch: (action: Action) => void
}): React.JSX.Element | null {
  const ref = useRef<HTMLVideoElement>(null)
  const feito = useRef(false)
  const falta = card.vinculado !== false && (!card.poster || !card.duracao)

  useEffect(() => {
    if (!falta || feito.current) return
    const video = ref.current
    if (!video) return

    const medir = (): void => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return
      dispatch({ type: 'card/videoDuration', cardId: card.id, duracao: video.duration })
      // um pouco adiante do zero: muitos vídeos abrem em preto, e uma
      // miniatura preta não distingue um cartão do outro
      video.currentTime = Math.min(1, video.duration / 2)
    }

    const desenhar = (): void => {
      if (feito.current) return
      feito.current = true
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 192
        canvas.height = Math.max(1, Math.round((192 * video.videoHeight) / (video.videoWidth || 1)))
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        dispatch({ type: 'card/videoPoster', cardId: card.id, poster: canvas.toDataURL('image/jpeg', 0.6) })
      } catch {
        // sem miniatura o cartão continua funcionando: cai no ícone de play,
        // e não vale travar a subida de um vídeo por causa disso
      }
    }

    video.addEventListener('loadedmetadata', medir)
    video.addEventListener('seeked', desenhar)
    return () => {
      video.removeEventListener('loadedmetadata', medir)
      video.removeEventListener('seeked', desenhar)
    }
  }, [falta, card.id, dispatch])

  if (!falta) return null

  return (
    <video
      ref={ref}
      src={`valendo://video/${encodeURIComponent(card.id)}`}
      // sem isto o desenho no canvas conta como de outra origem e ler os
      // pixels de volta vira erro de segurança — não haveria miniatura
      crossOrigin="anonymous"
      muted
      preload="metadata"
      style={{ display: 'none' }}
    />
  )
}
