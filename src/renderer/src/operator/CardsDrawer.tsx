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
import { CabecalhoDePainel, SliderConsole } from '../ui/console'

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
  const { t, tp } = useT()
  const [ocupado, setOcupado] = useState(false)
  /** por que o último arquivo escolhido não serviu — some na próxima escolha */
  const [recusa, setRecusa] = useState<string | null>(null)
  /** o ponteiro está sobre a zona de soltar, com um arquivo na mão */
  const [sobreZona, setSobreZona] = useState(false)
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

  /**
   * Arquivos soltos na zona: a zona que parece soltável aceita o solto.
   *
   * O caminho real vem do preload (`pathForFile`); quem decide se cada
   * arquivo é imagem ou vídeo é o main, pela mesma lista dos seletores. O id
   * leva o índice do arquivo porque soltar três de uma vez chamaria
   * `novoCartaoId` três vezes com os mesmos argumentos — três cartões com o
   * mesmo id, dois deles fantasmas.
   */
  const soltarArquivos = async (event: React.DragEvent): Promise<void> => {
    event.preventDefault()
    setSobreZona(false)
    if (ocupado) return
    const files = Array.from(event.dataTransfer.files)
    if (files.length === 0) return

    setOcupado(true)
    setRecusa(null)
    try {
      for (const [i, file] of files.entries()) {
        const caminho = window.valendo.pathForFile(file)
        if (!caminho) continue
        const id = novoCartaoId(Date.now() + i, cards.length + i)
        const r = await window.valendo.importCardPath(id, caminho)
        if (!r) continue
        if (r.kind === 'image') {
          dispatch({
            type: 'card/add',
            card: { id, kind: 'image', nome: r.sugestao || t('cards.addImage'), arquivo: r.arquivo }
          })
        } else if (r.kind === 'video') {
          dispatch({
            type: 'card/add',
            card: {
              id,
              kind: 'video',
              nome: r.sugestao || t('cards.addVideo'),
              caminho: r.caminho,
              arquivoNome: r.arquivoNome,
              vinculado: true
            }
          })
        } else {
          setRecusa(`${r.arquivoNome} — ${r.erro}`)
        }
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section
      data-cards-drawer
      style={{ height: altura }}
      className="relative flex flex-none flex-col border-t border-[var(--color-edge)] bg-[#151518]"
    >
      <div
        data-cards-resizer
        onMouseDown={comecarArrasto}
        className="absolute inset-x-0 -top-0.5 z-10 h-1.5 cursor-row-resize hover:bg-[var(--color-fog-2)]"
      />

      <CabecalhoDePainel
        cor="var(--color-accent-2)"
        titulo={t('cards.title')}
        acao={
          <>
            <span className="text-[10px] text-[var(--color-fog-3)]">{tp('cards.count', cards.length)}</span>
            <button
              type="button"
              aria-label={t('app.close')}
              onClick={onClose}
              className="rounded p-1 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
            >
              <Icon name="close" size={12} />
            </button>
          </>
        }
      >
        <div className="ml-1 flex flex-none items-center gap-[5px]">
          <BotaoAdicionar
            atributo="image"
            rotulo={t('cards.addImage')}
            desligado={ocupado}
            onClick={() => void adicionarImagem()}
          />
          <BotaoAdicionar
            atributo="video"
            rotulo={t('cards.addVideo')}
            desligado={ocupado}
            onClick={() => void adicionarVideo()}
          />
          <BotaoAdicionar atributo="text" rotulo={t('cards.addText')} onClick={adicionarRecado} />
        </div>

        {convertendo ? (
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[10px] text-[var(--color-fog-1)]">
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
          <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--color-live)]">{recusa}</span>
        ) : blackout && noAr ? (
          <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--color-warn)]">
            {t('cards.blackoutWins')}
          </span>
        ) : null}
      </CabecalhoDePainel>

      <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2.5 overflow-x-auto p-2.5">
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

        {/* a zona de soltar fica com a sobra da fileira — e aceita de verdade
            o que parece aceitar */}
        <div
          data-card-drop
          onDragOver={(event) => {
            event.preventDefault()
            setSobreZona(true)
          }}
          onDragLeave={() => setSobreZona(false)}
          onDrop={(event) => void soltarArquivos(event)}
          className={`grid min-w-[130px] flex-1 place-items-center rounded-[7px] border border-dashed p-2 text-center text-[10px] leading-relaxed transition-colors ${
            sobreZona
              ? 'border-[var(--color-accent-2)] bg-[var(--color-accent-2)]/8 text-[var(--color-fog-1)]'
              : 'border-[#3a3a40] text-[var(--color-fog-3)]'
          }`}
        >
          <span>
            {cards.length === 0 ? (
              <>
                {t('cards.empty')}
                <br />
              </>
            ) : null}
            {t('cards.dropHint')}
          </span>
        </div>
      </div>
    </section>
  )
}

function BotaoAdicionar({
  atributo,
  rotulo,
  desligado = false,
  onClick
}: {
  atributo: string
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
      className="flex-none rounded-[5px] border border-[var(--color-edge)] px-2 py-[2px] text-[10px] font-medium transition-[filter] hover:brightness-115 disabled:opacity-30"
      style={{
        background: 'color-mix(in srgb, var(--color-accent-2) 13%, var(--color-ink-2))',
        color: 'color-mix(in srgb, var(--color-accent-2) 35%, var(--color-fog-1))'
      }}
    >
      + {rotulo}
    </button>
  )
}

/**
 * Um cartão inteiro: a arte com as etiquetas por cima, e embaixo o que aquele
 * tipo precisa — player no vídeo, recado no texto, e a fileira do "no ar".
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

  /**
   * A arte não carregou — o arquivo sumiu do disco.
   *
   * Sem isto o cartão ficava um retângulo preto mudo, indistinguível de um
   * standby proposital, e o operador só descobria o problema ao vivo, quando
   * pusesse no ar. Chave por `card.arquivo`: se o operador reimportar, o
   * `<img>` nasce de novo com outra `src` e o aviso não gruda no cartão certo.
   */
  const [imagemQuebrada, setImagemQuebrada] = useState(false)
  // reimportar troca `card.arquivo` a maior parte do tempo: sem isto o aviso
  // continuaria na tela mesmo com a arte nova já certa, porque o estado é do
  // componente, não do arquivo
  useEffect(() => setImagemQuebrada(false), [card.kind === 'image' ? card.arquivo : null])
  /**
   * O reimportado pode gerar o MESMO nome do arquivo antigo — mesma
   * extensão, mesmo id — e aí `card.arquivo` não muda, o efeito acima não
   * dispara, e o `<img>` nem tenta buscar de novo (mesma `src` de uma
   * requisição que já falhou). Este número força os dois: incrementa a cada
   * reimportação bem-sucedida, entra na `key` (remonta o `<img>`) e na URL
   * (o navegador não reaproveita a resposta 404 de antes).
   */
  const [versaoDaImagem, setVersaoDaImagem] = useState(0)

  /**
   * A barra na mão do operador, para a miniatura mostrar o quadro daquele
   * segundo enquanto ele arrasta — vive aqui, e não dentro do player, porque
   * a miniatura também precisa saber.
   */
  const [arrastando, setArrastando] = useState<number | null>(null)
  const previaRef = useRef<HTMLVideoElement>(null)

  /**
   * A fila de busca do vídeo da prévia, e por que ela existe.
   *
   * Buscar um segundo num H.264 não é instantâneo — o navegador decodifica a
   * partir do quadro-chave anterior. Um arrasto rápido manda pedidos mais
   * rápido do que eles terminam; escrever um `currentTime` novo por cima de
   * uma busca em andamento não cancela a de antes, as duas competem, e o que
   * sobra na tela é um quadro fora de ordem. Por isso só uma busca corre por
   * vez: um pedido novo enquanto há uma em andamento só fica guardado
   * (`pendente`, sempre sobrescrito pelo mais recente) e dispara no
   * `onSeeked`, quando a anterior realmente termina.
   *
   * É a mesma fila que garante a miniatura certa ao soltar: capturar direto
   * no clique pegaria o quadro que está na tela NAQUELE instante, que pode
   * ser de uma busca ainda em voo — `capturarAoAssentar` adia a captura para
   * quando a fila esvaziar de verdade.
   */
  const buscando = useRef(false)
  const pendente = useRef<number | null>(null)
  const capturarAoAssentar = useRef(false)

  const buscar = (segundo: number): void => {
    const video = previaRef.current
    if (!video) return
    if (buscando.current) {
      pendente.current = segundo
      return
    }
    buscando.current = true
    video.currentTime = segundo
  }

  useEffect(() => {
    if (arrastando !== null) buscar(arrastando)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastando])

  /**
   * Ao soltar a barra, o quadro em que o arrasto parou vira a miniatura —
   * não só a posição de partida, o retrato do cartão também. Sem isso o
   * operador escolhia o ponto certo e via a gaveta inteira voltar a mostrar
   * o quadro antigo, como se a escolha não tivesse ficado.
   */
  const capturarQuadroDoArrasto = (): void => {
    const video = previaRef.current
    // < HAVE_CURRENT_DATA: ainda não há quadro decodificado neste ponto —
    // desenhar agora pegaria um frame preto ou o de antes do pulo
    if (!video || card.kind !== 'video' || video.readyState < 2) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 192
      canvas.height = Math.max(1, Math.round((192 * video.videoHeight) / (video.videoWidth || 1)))
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      dispatch({ type: 'card/videoPoster', cardId: card.id, poster: canvas.toDataURL('image/jpeg', 0.6) })
    } catch {
      // sem miniatura nova não é motivo para travar nada — a antiga continua valendo
    }
  }

  const aoAssentarBusca = (): void => {
    const proximo = pendente.current
    pendente.current = null
    const video = previaRef.current
    if (proximo !== null && video) {
      // ainda tem um pedido mais novo esperando — busca ele agora, e uma
      // captura pedida continua adiada até ESTA assentar
      video.currentTime = proximo
      return
    }
    buscando.current = false
    if (capturarAoAssentar.current) {
      capturarAoAssentar.current = false
      capturarQuadroDoArrasto()
      // só agora a prévia pode sumir: soltar a barra não desmonta o <video>
      // sozinho, porque desmontar cedo demais mata a busca em voo antes
      // dela terminar, e o `onSeeked` que dispararia a captura nunca chega
      setArrastando(null)
    }
  }

  /**
   * Chamado ao soltar a barra. Não desmonta a prévia por conta própria —
   * quem faz isso é `aoAssentarBusca`, quando a captura (imediata ou
   * adiada) realmente terminar.
   */
  const finalizarArrasto = (): void => {
    if (buscando.current) {
      capturarAoAssentar.current = true
      return
    }
    capturarQuadroDoArrasto()
    setArrastando(null)
  }

  const reimportarImagem = async (): Promise<void> => {
    const escolhido = await window.valendo.pickCardImage(card.id)
    if (!escolhido) return
    dispatch({ type: 'card/imageFile', cardId: card.id, arquivo: escolhido.arquivo })
    setImagemQuebrada(false)
    setVersaoDaImagem((v) => v + 1)
  }

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
    : card.kind === 'video' && card.proxy?.perfil === videoPerfil
      ? {
          leve: true,
          rotulo: `${perfilDaRede.altura}p`,
          titulo: t('cards.netLightHint', { tamanho: `${perfilDaRede.largura}×${perfilDaRede.altura}` })
        }
      : { leve: false, rotulo: t('cards.netHeavy'), titulo: t('cards.netHeavyHint') }

  return (
    <div
      data-card-tile={card.id}
      data-on-air={noAr ? 'sim' : 'nao'}
      className={`flex w-[160px] flex-none flex-col overflow-hidden rounded-[7px] border bg-[#1c1c20] ${
        noAr ? 'border-[var(--color-go)]/70 shadow-[0_0_0_1px_rgba(70,209,127,.22)]' : 'border-[var(--color-edge)]'
      }`}
    >
      {card.kind === 'video' ? <PreparaVideo card={card} dispatch={dispatch} onFalha={onFalha} /> : null}

      {/* só retrato, não botão: subir no ar é decisão do quadrado "no ar"
          ou do play do player, nunca de um clique na arte. As etiquetas — o
          atalho, a duração, a rede e o próprio nome — moram sobre a arte,
          como na maquete, e o nome continua um campo de verdade: a faixa
          escrita é editável no lugar. */}
      <div className="relative flex h-[90px] flex-none items-center justify-center overflow-hidden bg-black">
        {card.kind === 'image' ? (
          imagemQuebrada ? (
            <button
              type="button"
              data-card-relink={card.id}
              onClick={() => void reimportarImagem()}
              className="flex items-center justify-center gap-1 px-2 text-center text-[10px] text-[var(--color-warn)] hover:underline"
            >
              {t('cards.imageRelink')}
            </button>
          ) : (
            <img
              key={`${card.arquivo}:${versaoDaImagem}`}
              src={`valendo://cartao/${encodeURIComponent(card.arquivo)}?v=${versaoDaImagem}`}
              alt=""
              className="max-h-full max-w-full object-contain"
              onError={() => setImagemQuebrada(true)}
            />
          )
        ) : card.kind === 'video' ? (
          arrastando !== null ? (
            <PreviaDoArrasto card={card} segundo={arrastando} videoRef={previaRef} buscar={buscar} onSeeked={aoAssentarBusca} />
          ) : card.poster ? (
            <img src={card.poster} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <Icon name="play" size={18} />
          )
        ) : (
          <span className="line-clamp-3 px-2 pb-4 text-center text-[12px] leading-snug font-semibold whitespace-pre-wrap text-[var(--color-fog-05)]">
            {card.texto || '—'}
          </span>
        )}

        {/* o número do atalho é a etiqueta roxa: é por ele que o operador
            dispara o cartão no meio do programa */}
        {atalho ? (
          <kbd
            data-card-atalho={card.id}
            title={`Ctrl+Shift+${atalho}`}
            className="absolute top-[5px] left-[5px] grid h-4 w-4 place-items-center rounded-[4px] bg-[var(--color-accent-2)] font-mono text-[9px] font-bold text-[#1c1020]"
          >
            {atalho}
          </kbd>
        ) : null}

        {card.kind === 'video' && card.duracao ? (
          <span className="absolute top-[5px] right-[5px] rounded-[4px] bg-black/65 px-1 font-mono text-[9px] font-semibold text-[var(--color-fog-0)]">
            {tempoDeVideo(card.duracao)}
          </span>
        ) : null}

        {card.kind === 'video' && !desvinculado ? (
          <span
            data-card-rede={card.id}
            title={naRede.titulo}
            className={`absolute top-[24px] right-[5px] max-w-[70%] truncate rounded-[4px] px-1 text-[8px] ${
              naRede.leve ? 'bg-black/60 text-[var(--color-fog-2)]' : 'bg-[var(--color-warn)]/85 text-black'
            }`}
          >
            {naRede.rotulo}
          </span>
        ) : null}

        {desvinculado ? (
          <span className="absolute inset-x-0 bottom-[19px] bg-[var(--color-warn)]/85 py-0.5 text-center text-[9px] text-black">
            {t('cards.videoMissing')}
          </span>
        ) : null}

        {/* a faixa de nome da maquete, editável no lugar */}
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
          className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-[3px] text-[9px] text-[var(--color-fog-05)] outline-none placeholder:text-[var(--color-fog-3)] focus:bg-black/85"
        />
      </div>

      {card.kind === 'video' ? (
        <PlayerDoCartao
          card={card}
          clock={clock}
          noAr={noAr}
          dispatch={dispatch}
          arrastando={arrastando}
          onArrastar={setArrastando}
          onSoltarArrasto={finalizarArrasto}
        />
      ) : null}

      {/* o miolo cresce com a gaveta: puxar a divisória dá mais linha ao
          recado, sem inchar as miniaturas */}
      {card.kind === 'text' ? (
        <div className="flex min-h-0 flex-1 flex-col p-[7px] pb-0">
          <textarea
            value={card.texto}
            aria-label={t('cards.message')}
            placeholder={t('cards.messagePlaceholder')}
            autoFocus={card.texto === ''}
            onChange={(event) => dispatch({ type: 'card/text', cardId: card.id, texto: event.target.value })}
            className="min-h-0 flex-1 resize-none rounded border border-[var(--color-edge)] bg-[#141416] px-1.5 py-1 text-[10px] leading-snug outline-none placeholder:text-[var(--color-fog-3)]"
          />
        </div>
      ) : null}

      <div className="mt-auto flex flex-none items-center gap-1.5 px-[7px] py-[5px]">
        {/* o quadrado que decide o que vai ao ar — clicar na arte não decide
            nada. Serve para ligar e para tirar da tela, e o player do vídeo
            faz a mesma coisa pelo play: as duas são as únicas portas. */}
        <label
          title={noAr ? t('cards.hide') : t('cards.show')}
          className={`flex flex-none items-center gap-1 text-[10px] ${
            desvinculado ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
          } ${noAr ? 'text-[var(--color-go)]' : 'text-[var(--color-fog-2)]'}`}
        >
          <input
            type="checkbox"
            data-card-onscreen={card.id}
            checked={noAr}
            disabled={desvinculado}
            onChange={() => dispatch({ type: 'card/show', cardId: card.id })}
          />
          {t('cards.onAir')}
        </label>

        {/* o volume só existe com o cartão no ar: fora dele não há o que ouvir */}
        {card.kind === 'video' && noAr ? (
          <span className="flex min-w-0 items-center gap-1">
            <Icon name="volume" size={9} className="flex-none text-[var(--color-fog-2)]" />
            <SliderConsole
              mini
              data-card-video-volume={card.id}
              min={0}
              max={1}
              step={0.05}
              value={clock.volume}
              cor="var(--color-fog-2)"
              aria-label={t('cards.videoVolume')}
              onValue={(volume) => dispatch({ type: 'card/videoVolume', volume })}
              className="w-[34px] flex-none"
            />
          </span>
        ) : null}

        <span className="ml-auto flex flex-none items-center gap-1">
          {card.kind === 'video' && !desvinculado ? (
            <label title={t('cards.videoLoop')} className="flex-none cursor-pointer">
              <input
                type="checkbox"
                data-card-loop={card.id}
                checked={card.loop ?? false}
                onChange={(event) => dispatch({ type: 'card/videoLoop', cardId: card.id, loop: event.target.checked })}
                className="peer sr-only"
              />
              <span className="grid h-[18px] w-6 place-items-center rounded-[5px] border border-[var(--color-edge)] bg-[var(--color-ink-2)] text-[11px] text-[var(--color-fog-2)] peer-checked:border-[var(--color-accent-2)] peer-checked:bg-[var(--color-accent-2)]/18 peer-checked:text-[#d9bdf0]">
                ↻
              </span>
            </label>
          ) : null}
          <button
            type="button"
            data-card-remove={card.id}
            aria-label={t('cards.remove')}
            title={t('cards.remove')}
            onClick={() => dispatch({ type: 'card/remove', cardId: card.id })}
            className="rounded p-0.5 text-[var(--color-fog-2)] hover:bg-[var(--color-live)]/12 hover:text-[var(--color-live)]"
          >
            <Icon name="trash" size={12} />
          </button>
        </span>
      </div>
    </div>
  )
}

/**
 * Um quadro parado do vídeo, no segundo pedido — nunca tocando.
 *
 * É a prévia que aparece na miniatura enquanto o operador arrasta a barra.
 * Um `<video>` comum, mas sem `autoPlay` e sem jamais chamar `.play()`:
 * só `currentTime` muda, então o navegador desenha um quadro e para —
 * exatamente o que faz um `<video>` pausado com o tempo trocado. Compartilha
 * o mesmo arquivo do player de verdade (mesma URL, mesma faixa de bytes),
 * então o quadro que aparece aqui é o quadro que vai para a tela ao soltar.
 */
/**
 * Só a apresentação: quem decide QUANDO buscar (a fila de um pedido por vez,
 * pra não engasgar num arrasto rápido) e quando capturar a miniatura mora em
 * `CartaoNaGaveta` — a prévia e o player de verdade precisam do mesmo vídeo
 * e da mesma fila, então a fila só pode morar num lugar que os dois alcancem.
 */
function PreviaDoArrasto({
  card,
  segundo,
  videoRef,
  buscar,
  onSeeked
}: {
  card: CartaoVideo
  segundo: number
  /** exposto para fora: é dele que se tira o quadro final, ao soltar a barra */
  videoRef: React.RefObject<HTMLVideoElement | null>
  buscar: (segundo: number) => void
  onSeeked: () => void
}): React.JSX.Element {
  return (
    <video
      ref={videoRef}
      muted
      playsInline
      preload="auto"
      // sem isto, tirar o quadro para virar miniatura (mais abaixo, num
      // canvas) falha calado: o navegador marca o vídeo como de outra
      // origem e recusa devolver os pixels — o mesmo motivo pelo qual o
      // vídeo escondido de `PreparaVideo` também precisa disto
      crossOrigin="anonymous"
      src={`valendo://video/${encodeURIComponent(card.id)}?v=${encodeURIComponent(card.convertido ?? 'orig')}`}
      // o efeito que dispara a primeira busca já roda no mount (a mesma
      // troca de estado que monta este vídeo já aciona o `useEffect` do
      // pai) — isto aqui é só reforço para quando os metadados demoram e a
      // primeira tentativa foi ignorada antes de o vídeo saber a duração
      onLoadedMetadata={() => buscar(segundo)}
      onSeeked={onSeeked}
      className="max-h-full max-w-full object-contain"
    />
  )
}

/**
 * O player, dentro do próprio cartão — a faixa de transporte da maquete:
 * play redondo, barra roxa, tempo corrente. A duração total virou etiqueta
 * sobre a arte, e repetir/volume moram na fileira de baixo do cartão.
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
  dispatch,
  arrastando,
  onArrastar,
  onSoltarArrasto
}: {
  card: CartaoVideo
  clock: VideoClock
  noAr: boolean
  dispatch: (action: Action) => void
  /** a barra na mão do operador; mora no cartão, não aqui, porque a miniatura também precisa */
  arrastando: number | null
  onArrastar: (segundo: number | null) => void
  /** tira o quadro do arrasto e vira a miniatura nova do cartão */
  onSoltarArrasto: () => void
}): React.JSX.Element {
  const { t } = useT()
  const [agora, setAgora] = useState(() => Date.now())

  // a barra precisa andar sozinha enquanto toca; dez vezes por segundo é
  // suave o bastante para o olho e barato o bastante para não disputar
  // quadro com o vídeo em si
  useEffect(() => {
    if (!clock.tocando || !noAr) return
    const id = setInterval(() => setAgora(Date.now()), 100)
    return () => clearInterval(id)
  }, [clock.tocando, noAr])

  const duracao = card.duracao ?? 0
  // fora do ar a barra mostra a última posição salva — dá para arrastar até
  // um ponto específico antes de subir, e é dali que o vídeo parte quando sobe
  const posicao =
    arrastando ?? (noAr ? posicaoDoVideo(clock, agora, card.duracao, card.loop ?? false) : (card.pausedAt ?? 0))
  const tocando = noAr && clock.tocando

  const relinkar = async (): Promise<void> => {
    const escolhido = await window.valendo.pickCardVideo(card.id)
    if (!escolhido || escolhido.erro) return
    dispatch({
      type: 'card/videoLink',
      cardId: card.id,
      caminho: escolhido.caminho,
      arquivoNome: escolhido.arquivoNome,
      // reapontar limpa a conversão do arquivo anterior: ela não vale para
      // o novo, e o cartão a refaz sozinho se o novo também não tocar
      convertido: null,
      vinculado: true
    })
  }

  if (card.vinculado === false) {
    return (
      <div className="border-y border-[var(--color-edge)] bg-[var(--color-ink-1)] p-1">
        <button
          type="button"
          data-card-relink={card.id}
          onClick={() => void relinkar()}
          title={card.caminho}
          className="flex w-full items-center justify-center gap-1 rounded border border-[var(--color-warn)]/50 px-2 py-0.5 text-[10px] text-[var(--color-warn)] hover:bg-[var(--color-warn)]/15"
        >
          {t('cards.videoRelink')}
        </button>
      </div>
    )
  }

  const soltar = (): void => {
    if (arrastando === null) return
    // o pulo só chega à tela do apresentador agora, no soltar: acompanhar o
    // arrasto ao vivo mandaria um borrão para o ar. Fora do ar não há para
    // quem mandar nada — só grava a posição no próprio cartão
    dispatch({ type: 'card/videoSeek', cardId: card.id, segundo: arrastando, arrastando: false })
    // quem tira a prévia de cena é `onSoltarArrasto`, não aqui: se a busca
    // do último ponto ainda estiver em voo, desmontar agora mataria ela
    // antes de terminar, e a miniatura ficaria com um quadro velho
    onSoltarArrasto()
  }

  return (
    <div className="flex flex-none items-center gap-[7px] border-y border-[var(--color-edge)] bg-[var(--color-ink-1)] px-[7px] py-1">
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
        className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full border border-[var(--color-edge)] text-[var(--color-fog-0)]"
        style={{ background: 'linear-gradient(#3a3a40, #2a2a2f)' }}
      >
        <Icon name={tocando ? 'pause' : 'play'} size={8} />
      </button>

      <SliderConsole
        mini
        data-card-video-seek={card.id}
        min={0}
        max={duracao || 1}
        step={0.05}
        value={Math.min(posicao, duracao || 1)}
        disabled={!duracao}
        cor="var(--color-accent-2)"
        aria-label={t('cards.videoSeek')}
        onValue={(segundo) => {
          onArrastar(segundo)
          dispatch({ type: 'card/videoSeek', cardId: card.id, segundo, arrastando: true })
        }}
        onPointerUp={soltar}
        onKeyUp={soltar}
        onBlur={soltar}
        className="min-w-0 flex-1 disabled:opacity-40"
      />

      <span className="flex-none font-mono text-[9px] font-semibold text-[var(--color-fog-2)]">
        {tempoDeVideo(posicao)}
      </span>
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
