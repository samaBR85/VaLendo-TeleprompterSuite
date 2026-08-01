import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { anchorFromWordIndex, composeLines, pixelFromAnchor, totalWords, type Layout } from '@shared/anchor'
import { canvasBox, stageSize } from '@shared/output'
import { timerReading, wordIndexAt } from '@shared/pacing'
import { chapterTitle } from '@shared/text'
import {
  timerCell,
  type Appearance,
  type Block,
  type Cartao,
  type TimerPosition,
  type Transport,
  type VideoClock
} from '@shared/types'
import { posicaoDoVideo } from '@shared/video'

export interface Viewport {
  width: number
  height: number
}

/** Traduz a célula da grade em posicionamento absoluto dentro da saída. */
function timerPlacement(position: TimerPosition, inset: number): React.CSSProperties {
  const { row, column } = timerCell(position)
  const shiftX = column === 1 ? '-50%' : '0'
  const shiftY = row === 1 ? '-50%' : '0'

  return {
    top: row === 0 ? inset : row === 1 ? '50%' : undefined,
    bottom: row === 2 ? inset : undefined,
    left: column === 0 ? inset : column === 1 ? '50%' : undefined,
    right: column === 2 ? inset : undefined,
    transform: shiftX === '0' && shiftY === '0' ? undefined : `translate(${shiftX}, ${shiftY})`
  }
}

/**
 * Cinza escuro fixo, não uma cor do tema: a guia precisa ficar discreta sobre o
 * fundo preto de sempre e ainda assim aparecer sobre um fundo claro, e não pode
 * competir com a marca de leitura pela atenção do operador.
 */
const MARGIN_GUIDE = '#4D4D4D'

export interface PrompterMetrics {
  /** alguma linha composta não caberia na largura e o navegador dobrou */
  wrapping: boolean
  /** maior corpo de fonte em que nenhuma linha dobra */
  fitFontSize: number
  /** fileiras visuais de cada linha composta, na ordem */
  rows: number[]
}

interface Props {
  blocks: Block[]
  appearance: Appearance
  transport: Transport
  /** tamanho lógico da saída, em pixels reais do monitor de destino */
  viewport: Viewport
  /** fileiras medidas, vindas do main: main e renderer precisam da mesma régua */
  rows?: number[]
  /**
   * Desenha as duas linhas verticais onde a margem corta o texto.
   *
   * Só a prévia do operador liga isto. É a única coisa que ela mostra a mais
   * que a transmissão, e de propósito: é auxílio de quem monta o roteiro, não
   * de quem lê. Na tela do apresentador seria sujeira.
   */
  marginGuides?: boolean
  /**
   * Desenhar a marca de leitura.
   *
   * A prévia do operador manda `true` sempre — é dela que ele tira a
   * referência. A transmissão e a página da rede seguem o que o operador
   * escolheu nos ajustes.
   */
  readingMark: boolean
  /**
   * O cartão no ar, se houver.
   *
   * Vem pronto em vez de o canvas procurar na lista: a página da rede recebe
   * um quadro, não o estado inteiro, e assim as duas superfícies desenham a
   * partir da mesma coisa.
   */
  card?: Cartao | null
  /**
   * De onde a imagem é carregada. `valendo://cartao/` nas janelas do app,
   * `/cartao/` na página servida pela rede — a mesma imagem, dois caminhos.
   */
  cardBaseUrl?: string
  /**
   * De onde o vídeo é carregado — por id de cartão, nunca por caminho de
   * arquivo: quem traduz id em disco é o main, e assim não existe URL que
   * possa ser forjada para servir outra coisa.
   */
  videoBaseUrl?: string
  /**
   * Esta é a prévia do operador, e não uma saída.
   *
   * Duas consequências, as duas só dela: é a única superfície com som — a
   * transmissão é sempre muda porque o vidro do teleprompter não tem
   * alto-falante e o som sairia dobrado na mesma máquina —, e é a única que
   * acompanha a barra ao vivo enquanto o operador arrasta.
   */
  previaDoOperador?: boolean
  /**
   * Tocar o som do vídeo nesta superfície.
   *
   * Segue a prévia do operador quando não é dito, que é o caso das janelas do
   * app. A página da rede decide sozinha: navegador de celular não deixa
   * começar com som sem um toque, então lá o som nasce desligado e é a pessoa
   * que assiste quem liga.
   */
  cardAudio?: boolean
  /**
   * Aplicar espelho e giro.
   *
   * Só a janela que alimenta o vidro do teleprompter liga isto. Espelhar e
   * girar existem para compensar o vidro semiespelhado do equipamento — e
   * cada rig monta esse vidro de um jeito. Na prévia do operador e na página
   * de conferência da rede local não há vidro nenhum no caminho: ali o mesmo
   * giro só deixaria o texto ilegível para quem lê direto da tela.
   *
   * Note que isto não mexe em `stageSize`: a prévia continua compondo as
   * linhas na mesma largura da transmissão, então a quebra de linha e a
   * palavra sob a marca de leitura seguem batendo com o que vai ao ar.
   */
  outputTransforms?: boolean
  onMetrics?: (metrics: PrompterMetrics) => void
}

/**
 * O vídeo do cartão, seguindo o relógio compartilhado.
 *
 * Cada superfície tem o seu `<video>` e nenhuma manda quadro para a outra: as
 * duas derivam o segundo atual de `{base, comecouEm}`, do mesmo jeito que a
 * rolagem do texto. Medido, dois tocadores do mesmo arquivo na mesma máquina
 * ficam a 6 ms um do outro em 5 segundos — a correção abaixo existe só para o
 * caso raro de um deles engasgar, e por isso o limite é generoso: corrigir de
 * menos ninguém vê, corrigir de mais é um pulo na tela do apresentador.
 *
 * Sem controles em superfície nenhuma. A barra vive no painel de cartões, e o
 * que chega aqui é sempre estado — nunca um player que o vidro do teleprompter
 * pudesse acabar mostrando.
 */
function VideoCartao({
  card,
  clock,
  src,
  comSom,
  previaDoOperador
}: {
  card: Extract<Cartao, { kind: 'video' }>
  clock: VideoClock
  src: string
  comSom: boolean
  previaDoOperador: boolean
}): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const loop = card.loop ?? false

  // com a barra na mão do operador, só a prévia dele acompanha ao vivo: a
  // tela do apresentador segura o quadro e pula uma vez, quando ele solta
  const congelado = clock.arrastando && !previaDoOperador

  useEffect(() => {
    const video = ref.current
    if (!video || congelado) return

    const alvo = posicaoDoVideo(clock, Date.now(), card.duracao, loop)
    if (Math.abs(video.currentTime - alvo) > 0.25) video.currentTime = alvo

    if (clock.tocando) {
      // pode ser recusado quando o Chromium não vê gesto do usuário; a
      // transmissão é muda, então passa — e a prévia nasce de um clique
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [clock, card.duracao, loop, congelado])

  /*
   * O volume do painel é do monitor do operador, e só dele.
   *
   * Na página da rede quem manda no volume é o botão do próprio aparelho:
   * deixar o operador mexer no som do celular de quem confere seria mexer
   * numa coisa que não é dele — e no iPhone o pedido seria ignorado de
   * qualquer forma.
   */
  useEffect(() => {
    const video = ref.current
    if (!video || !previaDoOperador) return
    video.volume = clock.volume
  }, [clock.volume, previaDoOperador])

  /*
   * Reencontro periódico.
   *
   * Um engasgo de decodificação — disco ocupado, quadro pesado — deixa este
   * tocador para trás sem que nada no estado mude, então não há efeito que
   * dispare. Sem esta ronda, ele ficaria atrasado até o próximo comando.
   */
  useEffect(() => {
    if (!clock.tocando || congelado) return
    const id = setInterval(() => {
      const video = ref.current
      if (!video) return
      const alvo = posicaoDoVideo(clock, Date.now(), card.duracao, loop)
      if (Math.abs(video.currentTime - alvo) > 0.4) video.currentTime = alvo
    }, 2000)
    return () => clearInterval(id)
  }, [clock, card.duracao, loop, congelado])

  return (
    <video
      ref={ref}
      data-card-video={card.id}
      src={src}
      loop={loop}
      muted={!comSom}
      playsInline
      // sem `controls` em lugar nenhum: a barra do player nativo na tela do
      // apresentador seria a pior coisa que este recurso poderia fazer
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
    />
  )
}

/**
 * O mesmo componente desenha a janela da transmissão e a prévia do operador.
 *
 * A prévia roda no tamanho lógico do monitor de destino e só recebe um
 * `scale()` do container — por isso ela é réplica exata por construção, e não
 * por calibragem. Se um dia divergir, divergiu nas duas.
 */
export function PrompterCanvas({
  blocks,
  appearance,
  transport,
  viewport,
  rows,
  marginGuides = false,
  readingMark,
  outputTransforms = false,
  card = null,
  cardBaseUrl = 'valendo://cartao/',
  videoBaseUrl = 'valendo://video/',
  previaDoOperador = false,
  cardAudio,
  onMetrics
}: Props): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const geometry = useRef<Layout>([])
  const lastMetrics = useRef('')
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const remainingRef = useRef<HTMLSpanElement>(null)

  // o palco é onde o texto é composto, e não muda com a superfície: é o que
  // mantém a quebra de linha da prévia igual à da transmissão. A caixa é o
  // que se desenha na tela, e essa sim acompanha o giro ser aplicado ou não
  const stage = stageSize(appearance.rotation, viewport)
  const box = canvasBox(appearance.rotation, viewport, outputTransforms)

  const readingLineY = stage.height * appearance.readingLinePct

  const lines = useMemo(
    () => composeLines(blocks, appearance, rows),
    [blocks, appearance.minWords, appearance.maxWords, appearance.uniformSpeed, rows]
  )

  /** Mede o DOM depois do layout. A composição das linhas não muda aqui — só a geometria. */
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const measure = (): void => {
      const nodes = [...container.querySelectorAll<HTMLElement>('[data-line]')]
      geometry.current = lines.map((spec, index) => {
        const node = nodes[index]
        return { ...spec, top: node?.offsetTop ?? 0, height: node?.offsetHeight ?? 0 }
      })

      if (!onMetrics) return

      const style = getComputedStyle(container)
      const available =
        container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)

      // quantas fileiras visuais cada linha ocupou de fato. É a régua de
      // rolagem: uma linha que dobrou tem o dobro da altura e precisa custar o
      // dobro, senão o texto passa por ela no dobro da velocidade
      const rowHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize)
      const measuredRows = [...nodes].map((node) =>
        rowHeight > 0 ? Math.max(1, Math.round(node.offsetHeight / rowHeight)) : 1
      )

      // largura natural de cada linha, medida sem permitir dobra, contra a
      // largura útil: é assim que se descobre se a regra de palavras por linha
      // está sendo respeitada de fato ou só no papel
      const probes = container.querySelectorAll<HTMLElement>('[data-probe-line]')

      let widest = 0
      for (const probe of probes) widest = Math.max(widest, probe.offsetWidth)

      const wrapping = widest > available + 1
      const fitFontSize =
        widest > 0 ? Math.max(12, Math.floor((appearance.fontSize * available) / widest)) : appearance.fontSize

      const signature = `${wrapping}:${fitFontSize}:${measuredRows.join(',')}`
      if (signature === lastMetrics.current) return
      lastMetrics.current = signature
      onMetrics({ wrapping, fitFontSize, rows: measuredRows })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [
    lines,
    appearance.fontFamily,
    appearance.fontSize,
    appearance.fontWeight,
    appearance.lineHeight,
    appearance.letterSpacing,
    appearance.marginPct,
    appearance.align,
    stage.width,
    stage.height,
    onMetrics
  ])

  /**
   * Um `requestAnimationFrame` por janela, alimentado pelo relógio do main.
   * Nenhuma mensagem por frame: cada janela deriva a própria posição, então
   * não existe deriva entre a prévia e o que o apresentador lê.
   */
  useEffect(() => {
    let frame = 0

    const tick = (): void => {
      frame = requestAnimationFrame(tick)
      const container = scrollRef.current
      if (!container || transport.frozen) return

      const wordIndex = wordIndexAt(transport, Date.now())

      // relógios escritos direto no DOM, como a rolagem: passar por estado do
      // React a cada quadro derrubaria o desempenho da própria rolagem.
      // A comparação é com o próprio DOM, e não com um valor guardado:
      // desligar e religar cria elementos novos e vazios, e um cache com o
      // texto antigo faria a escrita ser pulada, deixando o canto em branco
      const elapsed = elapsedRef.current
      const remaining = remainingRef.current
      if (elapsed || remaining) {
        const reading = timerReading(wordIndex, totalWords(geometry.current), transport.ppm)
        if (elapsed && elapsed.textContent !== reading.elapsed) elapsed.textContent = reading.elapsed
        const rest = `-${reading.remaining}`
        if (remaining && remaining.textContent !== rest) remaining.textContent = rest
      }

      const anchor = anchorFromWordIndex(geometry.current, wordIndex)
      if (!anchor) return

      const y = pixelFromAnchor(geometry.current, anchor)
      if (y === null) return

      container.style.transform = `translate3d(0, ${(readingLineY - y).toFixed(2)}px, 0)`
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [transport, readingLineY, appearance.timers.elapsed, appearance.timers.remaining])

  const mirror = `${appearance.mirrorX ? ' scaleX(-1)' : ''}${appearance.mirrorY ? ' scaleY(-1)' : ''}`
  const compensacao = outputTransforms ? ` rotate(${appearance.rotation}deg)${mirror}` : ''

  return (
    <div
      data-prompter-surface={outputTransforms ? 'broadcast' : 'preview'}
      style={{
        width: box.width,
        height: box.height,
        background: appearance.bgColor,
        position: 'relative',
        overflow: 'hidden',
        flex: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: stage.width,
          height: stage.height,
          overflow: 'hidden',
          transform: `translate(-50%, -50%)${compensacao}`
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            maskImage: appearance.focusDim
              ? 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 12%, #000 30%, #000 52%, rgba(0,0,0,0.4) 78%, transparent 100%)'
              : undefined
          }}
        >
          <div
            ref={scrollRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              paddingLeft: `${appearance.marginPct}%`,
              paddingRight: `${appearance.marginPct}%`,
              paddingBottom: stage.height,
              willChange: 'transform',
              fontFamily: appearance.fontFamily,
              fontSize: appearance.fontSize,
              fontWeight: appearance.fontWeight,
              lineHeight: appearance.lineHeight,
              letterSpacing: `${appearance.letterSpacing}em`,
              color: appearance.textColor,
              textAlign: appearance.align
            }}
          >
            {lines.map((line, index) => (
              <div
                key={`${line.blockId}-${index}`}
                data-line
                style={
                  line.kind === 'direction'
                    ? { color: appearance.directionColor, fontStyle: 'italic', opacity: 0.9 }
                    : line.kind === 'chapter'
                      ? // sem mudar o tamanho da fonte nem acrescentar padding: a
                        // altura da linha precisa continuar igual à de uma linha
                        // comum, senão o peso em palavras atribuído a ela (em
                        // anchor.ts) some de proporção e a rolagem trava aqui
                        { letterSpacing: '0.2em', opacity: 0.6, textTransform: 'uppercase' }
                      : undefined
                }
              >
                {line.spacer
                  ? // espaço inquebrável: um div vazio teria altura zero, e a
                    // linha em branco do roteiro não apareceria na tela
                    ' '
                  : line.kind === 'chapter'
                    ? chapterTitle({ id: line.blockId, kind: 'chapter', text: line.text })
                    : line.text}
              </div>
            ))}

            {/* sonda de medição: as mesmas linhas sem permitir dobra, fora do
                fluxo, só para saber a largura natural de cada uma */}
            {onMetrics ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  visibility: 'hidden',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}
              >
                {lines.map((line, index) => (
                  <div
                    key={`probe-${index}`}
                    data-probe-line
                    style={
                      line.kind === 'direction'
                        ? { fontStyle: 'italic' }
                        : line.kind === 'chapter'
                          ? { letterSpacing: '0.2em', textTransform: 'uppercase' }
                          : undefined
                    }
                  >
                    {line.kind === 'chapter'
                      ? chapterTitle({ id: line.blockId, kind: 'chapter', text: line.text })
                      : line.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* relógios: dentro do rotador, para acompanharem espelho e rotação —
            no vidro do beam-splitter o número precisa ser legível junto com o
            texto, não invertido ao contrário dele */}
        {appearance.timers.elapsed || appearance.timers.remaining ? (
          <div
            data-timers
            style={{
              position: 'absolute',
              ...timerPlacement(appearance.timers.position, stage.height * 0.025),
              display: 'flex',
              gap: '0.8em',
              fontSize: (stage.height * appearance.timers.sizePct) / 100,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              lineHeight: 1,
              pointerEvents: 'none'
            }}
          >
            {appearance.timers.elapsed ? (
              <span ref={elapsedRef} data-timer-elapsed style={{ color: appearance.timers.elapsedColor }} />
            ) : null}
            {appearance.timers.remaining ? (
              <span
                ref={remainingRef}
                data-timer-remaining
                style={{ color: appearance.timers.remainingColor }}
              />
            ) : null}
          </div>
        ) : null}

        {/* guias de margem: fora do container que rola, para ficarem paradas, e
            dentro do rotador, para acompanharem rotação e espelho junto com o
            texto que elas delimitam. Centradas no limite, não encostadas nele */}
        {marginGuides
          ? ([0, 1] as const).map((side) => (
              <div
                key={side}
                data-margin-guide={side === 0 ? 'left' : 'right'}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  [side === 0 ? 'left' : 'right']: `${appearance.marginPct}%`,
                  // espessura proporcional: a prévia é desenhada em tamanho real
                  // e depois reduzida, e 1px viraria menos de um pixel na tela
                  width: Math.max(1, stage.width * 0.0012),
                  transform: `translateX(${side === 0 ? '-50%' : '50%'})`,
                  background: MARGIN_GUIDE,
                  pointerEvents: 'none'
                }}
              />
            ))
          : null}

        {/* marca de leitura: espessura proporcional ao viewport para continuar
            visível quando a prévia do operador reduz a escala, e cunhas nas
            laterais, que sobrevivem melhor à redução do que uma linha fina */}
        {readingMark ? (
          <>
            <div
              data-reading-mark
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: readingLineY,
                height: Math.max(2, stage.height * 0.004),
                background: appearance.directionColor,
                opacity: 0.5,
                pointerEvents: 'none'
              }}
            />
            {([0, 1] as const).map((side) => (
              <div
                key={side}
                data-reading-wedge
                style={{
                  position: 'absolute',
                  top: readingLineY,
                  [side === 0 ? 'left' : 'right']: 0,
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: `${stage.height * 0.014}px solid transparent`,
                  borderBottom: `${stage.height * 0.014}px solid transparent`,
                  [side === 0 ? 'borderLeft' : 'borderRight']:
                    `${stage.height * 0.016}px solid ${appearance.directionColor}`,
                  pointerEvents: 'none'
                }}
              />
            ))}
          </>
        ) : null}

        {/* o cartão fica DENTRO do rotador, com o texto: ao contrário da tela
            preta, que é ausência e espelhada continua igual, um cartão carrega
            logo e palavra — sem acompanhar o espelho do vidro, o apresentador
            leria tudo ao contrário. E como a prévia e a página da rede não
            aplicam a compensação, ali ele sai legível de graça */}
        {card ? (
          <div
            data-card={card.id}
            data-card-kind={card.kind}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {card.kind === 'image' ? (
              <img
                src={`${cardBaseUrl}${encodeURIComponent(card.arquivo)}`}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : card.kind === 'video' ? (
              <VideoCartao
                card={card}
                clock={transport.video}
                src={`${videoBaseUrl}${encodeURIComponent(card.id)}`}
                comSom={cardAudio ?? previaDoOperador}
                previaDoOperador={previaDoOperador}
              />
            ) : (
              <div
                data-card-text
                style={{
                  padding: `0 ${appearance.marginPct}%`,
                  fontFamily: appearance.fontFamily,
                  // acompanha o corpo do roteiro, mas bem maior: recado é para
                  // ser lido de relance, não lido linha a linha
                  fontSize: appearance.fontSize * 1.6,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  textAlign: 'center',
                  color: appearance.textColor,
                  overflowWrap: 'break-word',
                  // onde o operador apertou Enter é onde quebra aqui também:
                  // um recado de duas linhas foi escrito em duas de propósito
                  whiteSpace: 'pre-wrap'
                }}
              >
                {card.texto}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {transport.blackout ? (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
      ) : null}

      {transport.frozen ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `${Math.max(3, box.height * 0.006)}px solid ${appearance.directionColor}`,
            pointerEvents: 'none',
            opacity: 0.7
          }}
        />
      ) : null}
    </div>
  )
}
