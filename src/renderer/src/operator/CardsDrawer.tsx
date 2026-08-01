import { useEffect, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { CARTOES_COM_ATALHO, novoCartaoId } from '@shared/cards'
import { CARDS_HEIGHT_MAX, CARDS_HEIGHT_MIN } from '@shared/defaults'
import type { CardConvertProgress } from '@shared/api'
import { perfilPorId, type PerfilDeRede } from '@shared/proxy'
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
  /** o relógio do vídeo no ar — o player do cartão manda nele */
  clock: VideoClock
  /** peso escolhido para a rede, para o cartão dizer o que está sendo servido */
  videoPerfil: PerfilDeRede
  altura: number
  dispatch: (action: Action) => void
  onClose: () => void
}

/**
 * A gaveta de cartões, no rodapé e em largura total.
 *
 * Cada cartão é inteiro em si: a arte, o nome, o recado, o player. Antes havia
 * uma coluna de edição à direita e um botão para abri-la — o que obrigava a
 * mirar num alvo pequeno para mexer numa coisa que estava logo ali. Todos têm
 * a mesma largura de propósito: a arte que estava em terceiro continua em
 * terceiro quando o vídeo entra no ar, e memória muscular no meio de um
 * programa vale mais que o espaço economizado.
 *
 * A altura vem da gaveta: puxar a divisória para cima dá mais espaço ao recado
 * e ao player, sem mexer no tamanho das miniaturas.
 */
export function CardsDrawer({
  cards,
  noAr,
  blackout,
  clock,
  videoPerfil,
  altura,
  dispatch,
  onClose
}: Props): React.JSX.Element {
  const { t } = useT()
  const [ocupado, setOcupado] = useState(false)
  /** por que o último arquivo escolhido não serviu — some na próxima escolha */
  const [recusa, setRecusa] = useState<string | null>(null)
  /**
   * Um vídeo está sendo convertido.
   *
   * Trocar a embalagem de um `.mov` leva segundos; recodificar um ProRes leva
   * perto do tempo do próprio vídeo. Sem dizer qual das duas está
   * acontecendo, a segunda parece o app travado.
   */
  const [convertendo, setConvertendo] = useState<CardConvertProgress | null>(null)
  useEffect(() => window.valendo.onCardConvert(setConvertendo), [])

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
    if (ocupado) return
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
    if (ocupado) return
    setOcupado(true)
    setRecusa(null)
    try {
      // o id nasce antes da escolha porque a conversão é nomeada por ele: o
      // arquivo gerado pertence a este cartão e some junto com ele
      const id = novoCartaoId(Date.now(), cards.length)
      const escolhido = await window.valendo.pickCardVideo(id)
      if (!escolhido) return
      if (escolhido.erro) {
        setRecusa(`${escolhido.arquivoNome} — ${escolhido.erro}`)
        return
      }
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
    } finally {
      setOcupado(false)
    }
  }

  const adicionarRecado = (): void => {
    dispatch({
      type: 'card/add',
      card: { id: novoCartaoId(Date.now(), cards.length), kind: 'text', nome: '', texto: '' }
    })
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
            desligado={ocupado}
            onClick={() => void adicionarImagem()}
          />
          <BotaoAdicionar
            atributo="video"
            icone="play"
            rotulo={t('cards.addVideo')}
            desligado={ocupado}
            onClick={() => void adicionarVideo()}
          />
          <BotaoAdicionar atributo="text" icone="direction" rotulo={t('cards.addText')} onClick={adicionarRecado} />
        </div>

        {convertendo ? (
          <span className="ml-3 flex min-w-0 items-center gap-2 text-[11px] text-[var(--color-fog-1)]">
            <span className="truncate">
              {convertendo.recodificando ? t('cards.videoReencoding') : t('cards.videoConverting')} ·{' '}
              {convertendo.arquivoNome}
            </span>
            <span className="h-1 w-24 flex-none overflow-hidden rounded bg-[var(--color-ink-3)]">
              <span
                className="block h-full bg-[var(--color-go)] transition-[width]"
                style={{ width: `${Math.round((convertendo.fracao ?? 0) * 100)}%` }}
              />
            </span>
          </span>
        ) : recusa ? (
          <span className="ml-3 min-w-0 truncate text-[11px] text-[var(--color-live)]">{recusa}</span>
        ) : blackout && noAr ? (
          <span className="ml-3 text-[11px] text-[var(--color-warn)]">{t('cards.blackoutWins')}</span>
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
          <div className="flex min-w-0 flex-1 items-stretch gap-2.5 overflow-x-auto px-4 py-2.5">
            {cards.map((card, index) => (
              <CartaoNaGaveta
                key={card.id}
                card={card}
                atalho={index < CARTOES_COM_ATALHO ? index + 1 : null}
                noAr={noAr === card.id}
                clock={clock}
                videoPerfil={videoPerfil}
                dispatch={dispatch}
                onFalha={setRecusa}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function BotaoAdicionar({
  atributo,
  icone,
  rotulo,
  desligado = false,
  onClick
}: {
  atributo: string
  icone: 'card' | 'play' | 'direction'
  rotulo: string
  desligado?: boolean
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
 * Um cartão inteiro: a arte, o nome e o que aquele tipo precisa.
 *
 * Clicar na arte põe no ar e tira — é o gesto do meio do programa, e por isso
 * é o alvo maior. O resto (nome, recado, player, remover) fica abaixo, onde a
 * mão só vai quando há tempo.
 */
function CartaoNaGaveta({
  card,
  atalho,
  noAr,
  clock,
  videoPerfil,
  dispatch,
  onFalha
}: {
  card: Cartao
  atalho: number | null
  noAr: boolean
  clock: VideoClock
  videoPerfil: PerfilDeRede
  dispatch: (action: Action) => void
  onFalha: (mensagem: string) => void
}): React.JSX.Element {
  const { t } = useT()
  const desvinculado = card.kind === 'video' && card.vinculado === false

  return (
    <div
      data-card-tile={card.id}
      data-on-air={noAr ? 'sim' : 'nao'}
      className={`flex w-[180px] flex-none flex-col gap-1.5 rounded-lg border p-2 ${
        noAr ? 'border-[var(--color-go)]/60 bg-[var(--color-go)]/[0.09]' : 'border-[var(--color-line)]'
      }`}
    >
      {card.kind === 'video' ? <PreparaVideo card={card} dispatch={dispatch} onFalha={onFalha} /> : null}

      <button
        type="button"
        data-card-show={card.id}
        disabled={desvinculado}
        title={noAr ? t('cards.hide') : t('cards.show')}
        onClick={() => dispatch({ type: 'card/show', cardId: card.id })}
        className="relative flex h-[72px] flex-none items-center justify-center overflow-hidden rounded border border-[var(--color-line)] bg-black disabled:cursor-not-allowed"
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
            <Icon name="play" size={18} />
          )
        ) : (
          <span className="line-clamp-4 px-1.5 text-center text-[10px] leading-tight whitespace-pre-wrap text-[var(--color-fog-1)]">
            {card.texto || '—'}
          </span>
        )}

        {desvinculado ? (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-warn)]/85 py-0.5 text-[9px] text-black">
            {t('cards.videoMissing')}
          </span>
        ) : null}
      </button>

      <div className="flex flex-none items-center gap-1">
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
          className="min-w-0 flex-1 rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-1.5 py-0.5 text-[11px] outline-none placeholder:text-[var(--color-fog-2)]/70"
        />
        {atalho ? (
          <kbd
            title={`Ctrl+Shift+${atalho}`}
            className="flex-none rounded border border-[var(--color-line)] px-1 font-mono text-[9px] text-[var(--color-fog-2)]"
          >
            {atalho}
          </kbd>
        ) : null}
      </div>

      {/* o miolo cresce com a gaveta: puxar a divisória dá mais linha ao
          recado e mais respiro ao player, sem inchar as miniaturas */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        {card.kind === 'text' ? (
          <textarea
            value={card.texto}
            aria-label={t('cards.message')}
            placeholder={t('cards.messagePlaceholder')}
            autoFocus={card.texto === ''}
            onChange={(event) => dispatch({ type: 'card/text', cardId: card.id, texto: event.target.value })}
            className="min-h-0 flex-1 resize-none rounded border border-[var(--color-line)] bg-[var(--color-ink-2)] px-1.5 py-1 text-[11px] leading-snug outline-none placeholder:text-[var(--color-fog-2)]/70"
          />
        ) : null}

        {card.kind === 'video' ? (
          <PlayerDoCartao card={card} clock={clock} noAr={noAr} videoPerfil={videoPerfil} dispatch={dispatch} />
        ) : null}
      </div>

      <div className="flex flex-none items-center gap-1.5">
        {noAr ? <span className="text-[10px] text-[var(--color-go)]">{t('cards.onAir')}</span> : null}
        <button
          type="button"
          data-card-remove={card.id}
          aria-label={t('cards.remove')}
          title={t('cards.remove')}
          onClick={() => dispatch({ type: 'card/remove', cardId: card.id })}
          className="ml-auto rounded p-0.5 text-[var(--color-fog-2)] hover:bg-[var(--color-live)]/12 hover:text-[var(--color-live)]"
        >
          <Icon name="trash" size={12} />
        </button>
      </div>
    </div>
  )
}

/**
 * O player, dentro do próprio cartão.
 *
 * Fora do ar ele não fica cinza: apertar play põe o cartão no ar e começa a
 * tocar, que é o que o operador quer dizer com aquele botão. Manda comando
 * para o relógio compartilhado, nunca toca num vídeo próprio — é o que faz a
 * prévia e a transmissão nunca discordarem sobre onde o vídeo está.
 */
function PlayerDoCartao({
  card,
  clock,
  noAr,
  videoPerfil,
  dispatch
}: {
  card: CartaoVideo
  clock: VideoClock
  noAr: boolean
  videoPerfil: PerfilDeRede
  dispatch: (action: Action) => void
}): React.JSX.Element {
  const { t } = useT()
  const [agora, setAgora] = useState(() => Date.now())
  const [arrastando, setArrastando] = useState<number | null>(null)

  // a barra precisa andar sozinha enquanto toca; dez vezes por segundo é
  // suave o bastante para o olho e barato o bastante para não disputar
  // quadro com o vídeo em si
  useEffect(() => {
    if (!clock.tocando || !noAr) return
    const id = setInterval(() => setAgora(Date.now()), 100)
    return () => clearInterval(id)
  }, [clock.tocando, noAr])

  const duracao = card.duracao ?? 0
  const posicao = noAr ? (arrastando ?? posicaoDoVideo(clock, agora, card.duracao, card.loop ?? false)) : 0
  const tocando = noAr && clock.tocando

  /**
   * O que a rede recebe deste cartão, em três estados.
   *
   * "original" pode ser escolha do operador ou consequência de a cópia ainda
   * não existir, e as duas coisas têm o mesmo efeito no wi-fi mas significados
   * opostos — por isso a segunda vem em amarelo.
   */
  const perfilDaRede = perfilPorId(videoPerfil)
  const naRede = !perfilDaRede
    ? { leve: true, rotulo: t('cards.netOriginal'), titulo: t('cards.netOriginalHint') }
    : card.proxy?.perfil === videoPerfil
      ? {
          leve: true,
          rotulo: `${perfilDaRede.altura}p`,
          titulo: t('cards.netLightHint', { tamanho: `${perfilDaRede.largura}×${perfilDaRede.altura}` })
        }
      : { leve: false, rotulo: t('cards.netHeavy'), titulo: t('cards.netHeavyHint') }

  const relinkar = async (): Promise<void> => {
    const escolhido = await window.valendo.pickCardVideo(card.id)
    if (!escolhido || escolhido.erro) return
    dispatch({
      type: 'card/videoLink',
      cardId: card.id,
      caminho: escolhido.caminho,
      arquivoNome: escolhido.arquivoNome,
      // explícito nos dois sentidos: reapontar para um mp4 comum precisa
      // apagar a conversão que o cartão carregava do arquivo anterior
      // reapontar limpa a conversão do arquivo anterior: ela não vale para
      // o novo, e o cartão a refaz sozinho se o novo também não tocar
      convertido: null,
      vinculado: true
    })
  }

  if (card.vinculado === false) {
    return (
      <button
        type="button"
        data-card-relink={card.id}
        onClick={() => void relinkar()}
        title={card.caminho}
        className="flex items-center justify-center gap-1 rounded border border-[var(--color-warn)]/50 px-2 py-1 text-[11px] text-[var(--color-warn)] hover:bg-[var(--color-warn)]/15"
      >
        {t('cards.videoRelink')}
      </button>
    )
  }

  const soltar = (): void => {
    if (arrastando === null) return
    // o pulo só chega à tela do apresentador agora, no soltar: acompanhar o
    // arrasto ao vivo mandaria um borrão para o ar
    dispatch({ type: 'card/videoSeek', segundo: arrastando, arrastando: false })
    setArrastando(null)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-card-video-play={card.id}
          aria-label={tocando ? t('cards.videoPause') : t('cards.videoPlay')}
          onClick={() => {
            // fora do ar, play quer dizer "sobe e toca" — pausar um vídeo que
            // ninguém está vendo não significa nada
            if (!noAr) dispatch({ type: 'card/show', cardId: card.id })
            else dispatch({ type: 'card/videoPlay', tocando: !clock.tocando })
          }}
          className="flex-none rounded border border-[var(--color-line)] p-0.5 text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]"
        >
          <Icon name={tocando ? 'pause' : 'play'} size={11} />
        </button>

        <input
          type="range"
          data-card-video-seek={card.id}
          min={0}
          max={duracao || 1}
          step={0.05}
          value={Math.min(posicao, duracao || 1)}
          disabled={!duracao || !noAr}
          aria-label={t('cards.videoSeek')}
          onChange={(event) => {
            const segundo = Number(event.target.value)
            setArrastando(segundo)
            dispatch({ type: 'card/videoSeek', segundo, arrastando: true })
          }}
          onPointerUp={soltar}
          onKeyUp={soltar}
          onBlur={soltar}
          className="min-w-0 flex-1 accent-[var(--color-go)] disabled:opacity-40"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="flex-none font-mono text-[9px] text-[var(--color-fog-2)]">
          {tempoDeVideo(posicao)} / {tempoDeVideo(duracao)}
        </span>

        {/* o que a rede está recebendo AGORA.
            A rede nunca deixa de servir: enquanto a cópia leve não existe, ela
            manda o original. Isso é bom, e era silencioso — o painel prometia
            "3 MB por minuto" e o celular podia estar puxando o master inteiro,
            engasgando, sem nada na tela explicando. */}
        <span
          data-card-rede={card.id}
          title={naRede.titulo}
          className={`flex-none rounded px-1 text-[9px] ${
            naRede.leve ? 'text-[var(--color-fog-2)]' : 'bg-[var(--color-warn)]/15 text-[var(--color-warn)]'
          }`}
        >
          {naRede.rotulo}
        </span>

        <label
          title={t('cards.videoLoop')}
          className="ml-auto flex flex-none items-center gap-1 text-[9px] text-[var(--color-fog-2)]"
        >
          <input
            type="checkbox"
            data-card-loop={card.id}
            checked={card.loop ?? false}
            onChange={(event) => dispatch({ type: 'card/videoLoop', cardId: card.id, loop: event.target.checked })}
          />
          {t('cards.videoLoop')}
        </label>

        {noAr ? (
          <>
            <Icon name="volume" size={10} />
            <input
              type="range"
              data-card-video-volume={card.id}
              min={0}
              max={1}
              step={0.05}
              value={clock.volume}
              aria-label={t('cards.videoVolume')}
              onChange={(event) => dispatch({ type: 'card/videoVolume', volume: Number(event.target.value) })}
              className="w-10 flex-none accent-[var(--color-fog-1)]"
            />
          </>
        ) : null}
      </div>
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
  dispatch,
  onFalha
}: {
  card: CartaoVideo
  dispatch: (action: Action) => void
  onFalha: (mensagem: string) => void
}): React.JSX.Element | null {
  const ref = useRef<HTMLVideoElement>(null)
  const feito = useRef(false)
  /** já pedimos conversão para este cartão; sem isto, falhar viraria um laço */
  const tentouConverter = useRef(false)
  const falta = card.vinculado !== false && (!card.poster || !card.duracao)

  useEffect(() => {
    if (!falta || feito.current) return
    const video = ref.current
    if (!video) return

    /*
     * Não deu para tocar — agora sim vale converter.
     *
     * É aqui que se descobre, e não pela extensão do arquivo: um `.mov` de
     * celular por dentro é o mesmo formato de um mp4, só com outro rótulo, e
     * costuma tocar direto. Converter todo `.mov` por precaução gastaria
     * minutos de recodificação e um segundo arquivo do mesmo tamanho, à toa.
     * Quem realmente não toca — ProRes, matroska — cai aqui e é convertido.
     */
    const naoTocou = async (): Promise<void> => {
      if (tentouConverter.current || card.convertido) return
      tentouConverter.current = true
      const r = await window.valendo.convertCardVideo(card.id)
      if (r.convertido) {
        dispatch({ type: 'card/videoLink', cardId: card.id, convertido: r.convertido, vinculado: true })
      } else if (r.erro) {
        onFalha(`${card.arquivoNome} — ${r.erro}`)
        dispatch({ type: 'card/videoLink', cardId: card.id, vinculado: false })
      }
    }
    video.addEventListener('error', () => void naoTocou())

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
    // `card.convertido` entra de propósito: quando a conversão chega, o `src`
    // muda e este efeito precisa rodar de novo para medir o arquivo novo
  }, [falta, card.id, card.convertido, card.arquivoNome, dispatch, onFalha])

  if (!falta) return null

  return (
    <video
      ref={ref}
      key={card.convertido ?? 'original'}
      /* o `?v=` não serve para o servidor, que só olha o caminho — serve para
         o navegador. Sem ele a URL do cartão continua a mesma depois da
         conversão, e o Chromium repete a resposta da tentativa que falhou:
         o arquivo novo existe e toca, mas este elemento nunca ficaria
         sabendo. Foi o que aconteceu aqui. */
      src={`valendo://video/${encodeURIComponent(card.id)}?v=${encodeURIComponent(card.convertido ?? 'orig')}`}
      // sem isto o desenho no canvas conta como de outra origem e ler os
      // pixels de volta vira erro de segurança — não haveria miniatura
      crossOrigin="anonymous"
      muted
      preload="metadata"
      style={{ display: 'none' }}
    />
  )
}
