import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { anchorFromWordIndex, composeLines, pixelFromAnchor, totalWords, type Layout } from '@shared/anchor'
import { coresDasLinhas, ehDeixa } from '@shared/apresentadores'
import { canvasBox, stageSize } from '@shared/output'
import { mascaraDeFoco } from '@shared/focoDaLeitura'
import { relogioIndependenteReading, stopwatchReading, timerReading, wordIndexAt } from '@shared/pacing'
import { chapterTitle } from '@shared/text'
import {
  timerCell,
  type Apresentador,
  type Appearance,
  type Block,
  type Cartao,
  type Marca,
  type CardOverlayStyle,
  type TimerPosition,
  type Transport,
  type VideoClock
} from '@shared/types'
import {
  alinhamentoDoRecado,
  animacaoDoFundo,
  apoioDoRecado,
  ATRASOS_DA_POEIRA,
  BARRAS,
  classeDoFundo,
  variaveisDoFundo,
  corpoDoRecado,
  fundoDaTela,
  POEIRA
} from '@shared/tela'
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

/**
 * Parte a linha nos pedaços que as marcas pedem.
 *
 * A cor MANUAL vence a de quem fala, e é o certo: a cor do apresentador é um
 * padrão que o app deduziu sozinho, a marca é um ato explícito de quem opera.
 * Como o `<span>` mora dentro do `<div>` que já leva a cor do dono, basta o
 * pedaço marcado declarar a sua — o resto da linha continua herdando a do
 * apresentador sem ninguém precisar repetir nada.
 *
 * Negrito, itálico e sublinhado aqui são DE VERDADE: esta é a tela onde o
 * apresentador lê, e não há nenhum campo de texto transparente atrás para sair
 * do lugar quando a letra engorda. Quem finge é o editor, e lá o motivo está
 * escrito.
 *
 * A sonda de medição logo abaixo NÃO recebe os pedaços, de propósito: ela mede
 * a largura natural de cada linha para saber se dobrou, e negrito muda largura.
 * Medir com negrito e desenhar sem — ou o contrário — daria contagem de fileira
 * errada, e a rolagem sairia de ritmo. O erro de medida de uma palavra negrito
 * é pontual; o de ritmo seria contínuo.
 */
function pedacosDaLinha(texto: string, marcas: Marca[]): React.ReactNode[] {
  const ordenadas = [...marcas].sort((a, b) => a.de - b.de)
  const fora: React.ReactNode[] = []
  let cursor = 0

  ordenadas.forEach((marca, i) => {
    const de = Math.max(cursor, marca.de)
    const ate = Math.min(texto.length, marca.ate)
    if (ate <= de) return
    if (de > cursor) fora.push(texto.slice(cursor, de))
    fora.push(
      <span
        key={i}
        data-marca
        style={{
          color: marca.cor,
          fontWeight: marca.negrito ? 800 : undefined,
          fontStyle: marca.italico ? 'italic' : undefined,
          textDecoration: marca.sublinhado ? 'underline' : undefined
        }}
      >
        {texto.slice(de, ate)}
      </span>
    )
    cursor = ate
  })

  if (cursor < texto.length) fora.push(texto.slice(cursor))
  return fora
}

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
  /**
   * Quem fala este roteiro, e de que cor.
   *
   * Opcional porque as três superfícies que este componente desenha recebem o
   * mesmo desenho de props, e um roteiro de uma pessoa só — o caso comum —
   * simplesmente não tem lista. Ausente, nada muda de cor.
   */
  apresentadores?: Apresentador[]
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
   * O interruptor "OVERLAY": ligado no nível global, força o texto por cima
   * de QUALQUER cartão, mesmo que `card.overlay` esteja desligado — é a
   * garantia do operador de nunca subir um cartão sozinho por engano.
   * Desligado, decide o `card.overlay` do cartão no ar.
   */
  cardOverlay?: { enabled: boolean; style: CardOverlayStyle }
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
  /** nível do som na prévia do operador, 0 a 1 — cheio quando não é dito */
  cardVolume?: number
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
/**
 * O cartão de TELA: fundo desenhado mais recado.
 *
 * Exportado porque a gaveta e a coluna de assets desenham o MESMO componente
 * na miniatura. Não é economia de digitação: um fundo que se desenha diferente
 * no ladrilho e no ar é uma armadilha que só aparece com a câmera ligada, e a
 * única defesa barata contra isso é não haver dois desenhos.
 *
 * A `altura` é a do quadro em que ele está, e é o que faz o corpo do recado
 * ser proporcional — o mesmo cartão numa miniatura de 99px e numa saída de
 * 1080 tem de parecer o mesmo cartão.
 */
export function TelaDoCartao({
  card,
  altura,
  folgaInferior = 0
}: {
  card: Extract<Cartao, { kind: 'tela' }>
  altura: number
  /**
   * Pixels a mais de respiro embaixo, para quem desenha ALGO por cima do
   * quadro. É o caso do ladrilho da gaveta, que tem a faixa do nome colada na
   * base: sem isto um recado posicionado no pé some atrás do nome, e a
   * miniatura passa a mentir justamente sobre o que vai ao ar.
   */
  folgaInferior?: number
}): React.JSX.Element {
  const efeito = animacaoDoFundo(card.fundo)
  return (
    <div
      data-card-tela={card.id}
      data-card-tela-efeito={efeito ?? undefined}
      className={classeDoFundo(card.fundo)}
      style={{
        position: 'absolute',
        inset: 0,
        /* com efeito, quem pinta é a classe: um `background` inline aqui
           ganharia dela e a animação sumiria sem erro nenhum */
        ...(efeito ? variaveisDoFundo(card.fundo) : { background: fundoDaTela(card.fundo) }),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: apoioDoRecado(card.recado?.posicao),
        // o recado não encosta na borda: atrás de um vidro de teleprompter é o
        // último centímetro da tela que se perde primeiro
        padding: `7% 8% calc(7% + ${folgaInferior}px)`,
        overflow: 'hidden'
      }}
    >
      {/* Os dois efeitos que não cabem num pseudo-elemento: eles precisam de
          muitas peças, cada uma com o próprio atraso. Os atrasos saem do
          ÍNDICE e não de sorteio — sorteado, o mesmo cartão sairia diferente
          na miniatura, na prévia e na tela do apresentador. */}
      {efeito === 'barras' ? (
        <div className="tela-barras-fila" aria-hidden="true">
          {Array.from({ length: BARRAS }, (_, i) => (
            <i key={i} style={{ animationDelay: `${-((i * 7) % 26) / 10}s` }} />
          ))}
        </div>
      ) : null}

      {efeito === 'poeira' ? (
        <div className="absolute inset-0" aria-hidden="true">
          {ATRASOS_DA_POEIRA.map((atraso, i) => (
            <i key={i} style={{ left: `${4 + (i * 92) / (POEIRA - 1)}%`, animationDelay: `${atraso}s` }}>
              <b />
            </i>
          ))}
        </div>
      ) : null}

      {card.recado?.texto ? (
        <div
          data-card-tela-recado
          style={{
            fontSize: corpoDoRecado(card.recado.corpoPct, altura),
            fontWeight: 700,
            letterSpacing: '0.05em',
            lineHeight: 1.15,
            // sem a largura toda, o bloco encolhe até o texto e alinhar
            // à esquerda ou à direita não move nada
            width: '100%',
            // acima dos pseudo-elementos dos efeitos, senão o halo do
            // Respiro e os borrões das Ondas passam por cima do recado
            position: 'relative',
            zIndex: 1,
            textAlign: alinhamentoDoRecado(card.recado.alinhamento),
            color: card.recado.cor,
            overflowWrap: 'break-word',
            // onde o operador apertou Enter é onde quebra aqui também
            whiteSpace: 'pre-wrap'
          }}
        >
          {card.recado.texto}
        </div>
      ) : null}
    </div>
  )
}

export function VideoCartao({
  card,
  clock,
  src,
  comSom,
  volume,
  previaDoOperador
}: {
  card: Extract<Cartao, { kind: 'video' }>
  clock: VideoClock
  src: string
  comSom: boolean
  /**
   * Nível do som na prévia do operador, 0 a 1.
   *
   * Prop, e não campo do relógio compartilhado: o relógio diz ONDE o vídeo
   * está, e isso as duas janelas precisam concordar; o volume é do fone de
   * quem opera, e a transmissão nunca o ouve. Enquanto morou no relógio, ele
   * era zerado junto com o resto a cada abertura e a cada troca de projeto.
   */
  volume: number
  previaDoOperador: boolean
}): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const loop = card.loop ?? false

  // com a barra na mão do operador, só a prévia dele acompanha ao vivo: a
  // tela do apresentador segura o quadro e pula uma vez, quando ele solta
  const congelado = clock.arrastando && !previaDoOperador

  /**
   * O que realmente identifica uma ordem do operador.
   *
   * `clock` chega como objeto novo a cada atualização de estado — e na página
   * da rede isso é de dois em dois segundos, mesmo sem ninguém tocar em nada.
   * Reagir à identidade do objeto fazia o vídeo ser reposicionado o tempo
   * todo; reagir a estes três valores faz reagir a play, pausa e pulo.
   */
  const ordem = `${clock.tocando}|${clock.base}|${clock.comecouEm}`
  const ultimaOrdem = useRef('')

  useEffect(() => {
    const video = ref.current
    if (!video || congelado) return
    if (ordem === ultimaOrdem.current) return
    ultimaOrdem.current = ordem

    /*
     * Meio segundo de tolerância, e não um quarto.
     *
     * Mexer em `currentTime` é pedir um salto ao decodificador, e no iPhone
     * isso trava a página por dezenas de milissegundos e derruba quadros.
     * Medido no aparelho de quem relatou: pausas de 43 a 99 ms, constantes, a
     * cada acerto. Como o acerto de fuso da rede balança com a latência do
     * wi-fi, o alvo oscilava sozinho e o salto disparava sem que nada tivesse
     * mudado de verdade — o vídeo se reposicionava para corrigir o meu próprio
     * ruído de medição.
     *
     * Dois tocadores do mesmo arquivo derivam 6 ms em 5 segundos (medido), e
     * meio segundo de folga não se percebe numa página de conferência.
     */
    const alvo = posicaoDoVideo(clock, Date.now(), card.duracao, loop)
    if (Math.abs(video.currentTime - alvo) > 0.5) video.currentTime = alvo

    if (clock.tocando) {
      // só quando está parado: chamar `play` no que já toca é churn à toa
      if (video.paused) void video.play().catch(() => undefined)
    } else if (!video.paused) {
      video.pause()
    }
  }, [ordem, clock, card.duracao, loop, congelado])

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
    video.volume = volume
  }, [volume, previaDoOperador])

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
      // rede larga de propósito: esta ronda existe para o engasgo de verdade,
      // não para perseguir o ruído do acerto de fuso. Corrigir de menos
      // ninguém vê; corrigir de mais é o salto que engasga a imagem
      const alvo = posicaoDoVideo(clock, Date.now(), card.duracao, loop)
      if (Math.abs(video.currentTime - alvo) > 1.5) video.currentTime = alvo
    }, 5000)
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
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
  apresentadores,
  appearance,
  transport,
  viewport,
  rows,
  marginGuides = false,
  readingMark,
  outputTransforms = false,
  card = null,
  cardOverlay,
  cardBaseUrl = 'valendo://cartao/',
  videoBaseUrl = 'valendo://video/',
  previaDoOperador = false,
  cardAudio,
  cardVolume = 1,
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

  /* a cor de cada linha e quais delas são deixa: um passo puro sobre as
     mesmas linhas compostas, então prévia, transmissão e página da rede
     recebem exatamente a mesma pintura sem nenhuma delas repetir a regra */
  const coresDeQuemFala = useMemo(
    () => coresDasLinhas(lines, apresentadores ?? []),
    [lines, apresentadores]
  )
  const deixas = useMemo(
    () => lines.map((l) => ehDeixa(l, apresentadores ?? [])),
    [lines, apresentadores]
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
  /*
   * Um cartão ou a tela preta cobrem o palco inteiro, e são opacos.
   *
   * Enquanto estão ali, mover o texto por baixo é trabalho que ninguém vê — e
   * não é trabalho barato: é uma camada do tamanho da saída, marcada com
   * `will-change: transform`, sendo reposicionada sessenta vezes por segundo.
   * Num computador a placa de vídeo absorve. Num celular, ela disputa o
   * compositor com o vídeo do próprio cartão, e o que engasga é a imagem que
   * o operador está mostrando.
   *
   * Não há deriva em parar: a posição é derivada do relógio, não acumulada.
   * Quando o cartão sai, o primeiro quadro já escreve o lugar certo.
   *
   * "OVERLAY" muda a conta: com ele valendo para este cartão, o texto NÃO
   * está coberto — ele é o que se quer ver, rolando por cima da arte. O
   * global (`cardOverlay.enabled`) força a resposta para qualquer cartão,
   * mesmo com o toggle dele desligado; sem o global, decide `card.overlay`.
   */
  const overlaying = Boolean(card && (cardOverlay?.enabled || card.overlay))
  const palcoCoberto = (Boolean(card) && !overlaying) || transport.blackout

  useEffect(() => {
    if (palcoCoberto) return
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
        // decorrido/restante têm três fórmulas possíveis: a de sempre, que
        // sai da posição de leitura; o cronômetro, que congela quando o
        // texto pausa; e o livre, igual ao cronômetro mas sem congelar —
        // nunca sai do índice de palavras nos dois últimos casos
        const reading =
          appearance.timers.mode === 'cronometro'
            ? stopwatchReading(transport.stopwatch, transport.playing, Date.now(), appearance.timers.targetSeconds)
            : appearance.timers.mode === 'livre'
              ? relogioIndependenteReading(transport.independentStartedAt, Date.now(), appearance.timers.targetSeconds)
              : { ...timerReading(wordIndex, totalWords(geometry.current), transport.ppm), estourou: false }
        if (elapsed && elapsed.textContent !== reading.elapsed) elapsed.textContent = reading.elapsed
        // "-" contando para o fim, "+" contando o quanto já passou dele —
        // sem o sinal trocar, "quanto falta" e "quanto passou" pareceriam a
        // mesma coisa num relance
        const rest = `${reading.estourou ? '+' : '-'}${reading.remaining}`
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
  }, [
    transport,
    readingLineY,
    appearance.timers.elapsed,
    appearance.timers.remaining,
    appearance.timers.mode,
    appearance.timers.targetSeconds,
    palcoCoberto
  ])

  const mirror = `${appearance.mirrorX ? ' scaleX(-1)' : ''}${appearance.mirrorY ? ' scaleY(-1)' : ''}`
  const compensacao = outputTransforms ? ` rotate(${appearance.rotation}deg)${mirror}` : ''

  /**
   * "Position" desliza a caixa de texto entre as duas margens, sem mudar a
   * LARGURA dela — só `marginPct` decide isso. A folga total para deslizar
   * é `2×marginPct` (a soma das duas margens de sempre); em 50% a folga se
   * reparte igual, devolvendo exatamente o `marginPct` de cada lado — o
   * comportamento simétrico de sempre. Em 0%, a esquerda zera (encosta na
   * borda) e a direita dobra; em 100%, o espelho.
   */
  const folgaHorizontal = 2 * appearance.marginPct
  const paddingEsquerdo = (folgaHorizontal * appearance.positionPct) / 100
  const paddingDireito = folgaHorizontal - paddingEsquerdo

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
        {/*
          Coberto pelo cartão, este bloco inteiro sai de vista — e o que
          importa é que ele sai do compositor.

          Aqui moram duas coisas caras: uma máscara de gradiente do tamanho da
          saída, que obriga o navegador a uma passada de composição própria, e
          logo dentro uma camada promovida com `will-change`. No computador
          isso não custa nada visível. No celular, um vídeo desenhado ao lado
          desse arranjo perde o caminho rápido do hardware e passa a ser
          recomposto quadro a quadro — que foi o engasgo relatado, e que o
          modo `#video`, sem nada disto em volta, não tinha.

          `visibility` e não `display`: escondido assim o texto continua tendo
          layout, então a medição das linhas segue válida. Com `display: none`
          ela mediria zeros — e trocar a fonte com um cartão no ar deixaria a
          leitura no lugar errado quando ele saísse.
        */}
        {/* faixa escura entre o cartão e o texto — só existe sobrepondo com
            o estilo "faixa": garante leitura sem depender do que está por
            baixo. Zero custo no caso comum: nem monta quando não precisa */}
        {overlaying && cardOverlay?.style === 'faixa' ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(0,0,0,0.45)' }} />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            overflow: 'hidden',
            visibility: palcoCoberto ? 'hidden' : undefined,
            maskImage:
              appearance.focusDim && !palcoCoberto
                ? mascaraDeFoco(appearance.readingLinePct, appearance.focusDimPct)
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
              paddingLeft: `${paddingEsquerdo}%`,
              paddingRight: `${paddingDireito}%`,
              paddingBottom: stage.height,
              // a promoção só vale enquanto há rolagem para promover; com o
              // palco coberto ela seria uma camada guardada na GPU à toa,
              // disputando espaço com o vídeo do cartão
              willChange: palcoCoberto ? undefined : 'transform',
              fontFamily: appearance.fontFamily,
              fontSize: appearance.fontSize,
              fontWeight: appearance.fontWeight,
              lineHeight: appearance.lineHeight,
              letterSpacing: `${appearance.letterSpacing}em`,
              // CAIXA ALTA é só pintura: o texto guardado não muda, e desligar
              // devolve as maiúsculas originais. Aqui vale para as três
              // superfícies que este componente desenha — a tela do
              // apresentador, a prévia do operador e a página da rede
              textTransform: appearance.allCaps ? 'uppercase' : undefined,
              color: appearance.textColor,
              textAlign: appearance.align,
              // estilo "sombra": sem faixa atrás, o contraste vem de cada
              // letra ter a própria sombra — funciona em qualquer imagem,
              // mas pinta menos que a faixa
              textShadow:
                overlaying && cardOverlay?.style === 'sombra'
                  ? '0 1px 4px rgba(0,0,0,.9), 0 0 10px rgba(0,0,0,.75)'
                  : undefined
            }}
          >
            {lines.map((line, index) => (
              <div
                key={`${line.blockId}-${index}`}
                data-line
                data-apresentador={coresDeQuemFala[index] ?? undefined}
                style={
                  line.kind === 'direction'
                    ? { color: appearance.directionColor, fontStyle: 'italic', opacity: 0.9 }
                    : line.kind === 'chapter'
                      ? // sem mudar o tamanho da fonte nem acrescentar padding: a
                        // altura da linha precisa continuar igual à de uma linha
                        // comum, senão o peso em palavras atribuído a ela (em
                        // anchor.ts) some de proporção e a rolagem trava aqui
                        { letterSpacing: '0.2em', opacity: 0.6, textTransform: 'uppercase' }
                      : /* a cor de quem fala, quando há alguém: só a FALA muda
                           de cor — a linha do nome é tratada logo abaixo, e
                           capítulo e direção mantêm as suas, que são do sistema */
                        deixas[index]
                        ? { color: deixas[index]?.cor, opacity: 0.75, letterSpacing: '0.08em' }
                        : coresDeQuemFala[index]
                          ? { color: coresDeQuemFala[index] ?? undefined }
                          : undefined
                }
              >
                {line.spacer
                  ? // espaço inquebrável: um div vazio teria altura zero, e a
                    // linha em branco do roteiro não apareceria na tela
                    ' '
                  : line.kind === 'chapter'
                    ? chapterTitle({ id: line.blockId, kind: 'chapter', text: line.text })
                    : line.marcas
                      ? pedacosDaLinha(line.text, line.marcas)
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
              zIndex: 4,
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
            texto que elas delimitam. Centradas no limite, não encostadas nele.
            Acompanham a posição (mesmos `paddingEsquerdo`/`paddingDireito` do
            container que rola): a margem se desloca com o texto, e continua
            marcando onde a largura dele é limitada naquele ponto */}
        {marginGuides
          ? ([0, 1] as const).map((side) => (
              <div
                key={side}
                data-margin-guide={side === 0 ? 'left' : 'right'}
                style={{
                  position: 'absolute',
                  zIndex: 4,
                  top: 0,
                  bottom: 0,
                  [side === 0 ? 'left' : 'right']: `${side === 0 ? paddingEsquerdo : paddingDireito}%`,
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
                zIndex: 4,
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
                  zIndex: 4,
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
            aplicam a compensação, ali ele sai legível de graça.

            `zIndex: 1`, o mais baixo do rotador: sem "OVERLAY" ele ainda cobre
            tudo (é o único visível — os outros ficam escondidos ou vazios do
            jeito de sempre), mas sobrepondo, o texto (zIndex 3), a faixa
            (zIndex 2) e timers/guias/marca (zIndex 4) precisam pintar por
            cima dele, não por baixo como a ordem do DOM sozinha faria. */}
        {card ? (
          <div
            data-card={card.id}
            data-card-kind={card.kind}
            data-card-overlaying={overlaying ? 'sim' : 'nao'}
            style={{
              position: 'absolute',
              zIndex: 1,
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
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : card.kind === 'video' ? (
              <VideoCartao
                card={card}
                clock={transport.video}
                /* o `?v=` acompanha a conversão: quando ela chega, a URL muda
                   e o tocador busca o arquivo novo em vez de repetir a
                   resposta antiga. O servidor ignora a parte depois do `?`. */
                src={`${videoBaseUrl}${encodeURIComponent(card.id)}?v=${encodeURIComponent(card.convertido ?? 'orig')}`}
                comSom={cardAudio ?? previaDoOperador}
                volume={cardVolume}
                previaDoOperador={previaDoOperador}
              />
            ) : card.kind === 'tela' ? (
              <TelaDoCartao card={card} altura={box.height} />
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
