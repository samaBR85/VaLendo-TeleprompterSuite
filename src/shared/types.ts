import type { Lang } from './i18n/types'
import type { PerfilDeRede } from './proxy'

/** Bloco de texto. `direction` são anotações em [colchetes], que não contam tempo. */
export type BlockKind = 'speech' | 'direction' | 'chapter'

export interface Block {
  id: string
  kind: BlockKind
  text: string
}

/**
 * Posição de leitura. Deliberadamente semântica, nunca em pixels: `wordOffset`
 * é a quantidade (fracionária) de palavras percorridas dentro do bloco.
 * É o que permite refluxo, troca de fonte e edição ao vivo sem mover o texto.
 */
export interface Anchor {
  blockId: string
  wordOffset: number
}

export interface LineRule {
  minWords: number
  maxWords: number
}

export interface PacingRule extends LineRule {
  /**
   * Toda linha pesa igual na régua de rolagem, então o texto sobe sempre no
   * mesmo número de pixels por segundo.
   *
   * Desligado, o peso de cada linha é o número de palavras dela — o ritmo
   * fica exato em palavras por minuto, mas a velocidade na tela oscila, já
   * que uma linha de 4 palavras e uma de 7 têm a mesma altura. Operar
   * teleprompter é sobre previsibilidade, então o padrão é ligado.
   */
  uniformSpeed: boolean
}

export interface Appearance extends PacingRule {
  fontFamily: string
  /** px no viewport lógico da saída, não na tela do operador */
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  /** margem lateral em % da largura do viewport */
  marginPct: number
  textColor: string
  bgColor: string
  directionColor: string
  align: 'left' | 'center'
  /** posição vertical da marca de leitura, 0..1 */
  readingLinePct: number
  /**
   * Desenhar a linha da marca de leitura também na transmissão.
   *
   * Desligado por padrão: para o operador a linha é referência, mas na tela do
   * apresentador ela é um traço atravessando o texto — e no vidro do
   * beam-splitter, atravessando o rosto de quem lê. Na prévia do operador ela
   * aparece sempre, independente disto.
   */
  readingMarkOnOutput: boolean
  focusDim: boolean
  mirrorX: boolean
  mirrorY: boolean
  rotation: 0 | 90 | 180 | 270
  timers: TimerOverlay
}

/**
 * As nove posições do relógio, na mesma disposição em que aparecem na grade do
 * inspetor. A ordem das linhas e colunas aqui é a de cima para baixo e da
 * esquerda para a direita, e é dela que sai tanto o desenho da grade quanto o
 * posicionamento na tela — uma fonte só, para as duas não desandarem.
 */
export const TIMER_POSITIONS = [
  ['topLeft', 'topCenter', 'topRight'],
  ['middleLeft', 'middleCenter', 'middleRight'],
  ['bottomLeft', 'bottomCenter', 'bottomRight']
] as const

export type TimerPosition = (typeof TIMER_POSITIONS)[number][number]

/** Linha e coluna da posição na grade de três por três. */
export function timerCell(position: TimerPosition): { row: number; column: number } {
  for (let row = 0; row < TIMER_POSITIONS.length; row += 1) {
    const column = (TIMER_POSITIONS[row] as readonly string[]).indexOf(position)
    if (column >= 0) return { row, column }
  }
  return { row: 0, column: 2 }
}

/**
 * Relógios sobre a transmissão.
 *
 * Desligados por padrão: o que o apresentador precisa ver é o texto, e número
 * piscando no canto tira o olho da leitura. Existem para os casos em que o
 * tempo é o assunto — ao vivo com janela fechada, gravação cronometrada.
 */
export interface TimerOverlay {
  /** tempo desde o início da leitura */
  elapsed: boolean
  /** tempo restante até o fim do roteiro */
  remaining: boolean
  position: TimerPosition
  /** cor de cada um, separada: verde e vermelho se explicam sozinhos de relance */
  elapsedColor: string
  remainingColor: string
  /** tamanho em % da altura da saída */
  sizePct: number
  /**
   * Como os dois relógios contam.
   *
   * `palavras`: a fórmula de sempre — decorrido e restante saem do índice de
   * palavras e do ritmo, então mudar a velocidade ou editar o texto muda o
   * que os relógios mostram na hora.
   *
   * `cronometro`: um cronômetro de verdade. Decorrido só anda com o play do
   * *texto*, ponto — nada recalcula ele. Restante vira "quanto falta para o
   * alvo" e, se o alvo estourar, passa a contar "quanto já passou do alvo" em
   * vez de ficar preso em zero.
   *
   * `livre`: decorrido nunca congela, nem quando o texto pausa — é só o
   * tempo real desde que a leitura desta aba começou (`independentStartedAt`
   * do transporte). Sem play/pausa próprio, sem botão novo: nasce com o
   * primeiro play e some ao reiniciar, do mesmo jeito que o cronômetro já
   * faz — a única diferença é que pausar o texto não pausa ele. É para o
   * programa que abre com vídeo e só depois corta para quem lê: o tempo do
   * vídeo já entra na conta.
   */
  mode: 'palavras' | 'cronometro' | 'livre'
  /** o alvo do modo cronômetro, em segundos */
  targetSeconds: number
}

export interface ColorPreset {
  id: string
  name: string
  textColor: string
  bgColor: string
}

export interface Marker {
  id: string
  blockId: string
  label: string
}

export interface Tab {
  id: string
  title: string
  color: string
  blocks: Block[]
  appearance: Appearance
  markers: Marker[]
  anchor: Anchor | null
  /**
   * Último arquivo em que esta aba foi salva.
   *
   * É o que faz Ctrl+S regravar por cima sem perguntar nada. No meio de uma
   * gravação, diálogo na tela é o que ninguém quer — ainda mais com a
   * transmissão por cima de tudo.
   */
  exportPath?: string
  /** incrementa a cada mudança de conteúdo; usado para reconciliar renderers */
  rev: number
}

/**
 * Um cartão é o que o operador põe na tela do apresentador no lugar do
 * roteiro: uma imagem preparada antes (standby, logo, "voltamos já") ou um
 * recado escrito na hora ("CORTA", "FALTAM 2 MIN").
 *
 * Diferente da tela preta, que é ausência, o cartão é mensagem — por isso
 * acompanha o espelho e o giro da saída, senão o apresentador lê ao contrário
 * através do vidro.
 */
/**
 * `nome` é como o operador chama o cartão na lista, e nasce vazio: quem quiser
 * batizar, batiza; quem não quiser, se vira pela miniatura, que já mostra a
 * arte ou o próprio recado. O campo diz o que quer pelo texto de exemplo, em
 * cinza — sem isso ele ficava mudo e parecia obrigatório.
 */
export type Cartao =
  | {
      id: string
      kind: 'image'
      nome: string
      /** nome do arquivo dentro de userData/cartoes — nunca o caminho de origem */
      arquivo: string
    }
  | {
      id: string
      kind: 'video'
      nome: string
      /**
       * Onde o arquivo está, e é lá que ele fica.
       *
       * Vídeo não é copiado para dentro do app como a foto é: um programa de
       * meia hora encheria a pasta do usuário, e o projeto que o carregasse
       * junto viraria um arquivo que ninguém manda por e-mail. O preço é o
       * vínculo poder quebrar — daí `vinculado` e o relink.
       */
      caminho: string
      /** o nome que o arquivo tinha, para o operador saber o que reapontar */
      arquivoNome: string
      /**
       * Cópia tocável, dentro do app, quando o original não toca.
       *
       * Um `.mov` continua sendo o original e é ele que o cartão referencia —
       * isto aqui é derivado, como a miniatura. Nasce de trocar a embalagem
       * (ou recodificar, quando não dá), e é o que vai de fato para a tela e
       * para a rede. Some junto com o cartão.
       */
      convertido?: string
      /**
       * Cópia leve para a rede local, e o perfil com que foi gerada.
       *
       * Guardar o perfil é o que permite refazer quando o operador muda de
       * ideia: sem isso, trocar de "leve" para "alta" seguiria servindo o
       * arquivo antigo sem ninguém notar.
       */
      proxy?: { arquivo: string; perfil: PerfilDeRede }
      /** um quadro, em data: URL — viaja no projeto e mantém o cartão reconhecível mesmo desvinculado */
      poster?: string
      /** duração em segundos, medida quando o vídeo carrega */
      duracao?: number
      /** repete ao chegar no fim, em vez de segurar o último quadro */
      loop?: boolean
      /**
       * Onde o operador deixou este vídeo — a última posição de um pausar ou
       * um arrasto na barra, dentro ou fora do ar.
       *
       * É o que permite dar scrub fora do ar: sem um lugar para guardar o
       * resultado, arrastar a barra de um cartão que não está na tela não
       * levaria a nada. Quando o cartão sobe ao ar, é daqui que ele parte —
       * pré-posicionar antes de mostrar é o ponto todo.
       */
      pausedAt?: number
      /**
       * O arquivo existe e está autorizado nesta máquina.
       *
       * `false` é o estado de "relinkar". Só o main sabe dizer, porque só ele
       * enxerga o disco; nasce indefinido e é preenchido a cada abertura.
       */
      vinculado?: boolean
    }
  | { id: string; kind: 'text'; nome: string; texto: string }

/**
 * De onde o vídeo partiu e quando — não em que segundo ele está.
 *
 * O mesmo desenho do relógio de rolagem, e pela mesma razão: com a posição
 * guardada, manter duas janelas juntas exigiria mandar o segundo atual a cada
 * quadro. Guardando a partida, cada superfície calcula sozinha.
 */
export interface VideoClock {
  tocando: boolean
  /** segundo do vídeo no instante em que deu play */
  base: number
  /** Date.now() do play */
  comecouEm: number
  /**
   * O operador está com a barra na mão.
   *
   * Enquanto está, as saídas seguram o quadro onde estava e só pulam uma vez,
   * quando ele solta: um arrasto que a tela do apresentador acompanha ao vivo
   * vira um borrão no ar.
   */
  arrastando: boolean
  /** volume da prévia do operador, 0 a 1 — a transmissão é sempre muda */
  volume: number
}

export interface Transport {
  playing: boolean
  /** palavras por minuto */
  ppm: number
  /** índice global de palavras no instante em que o play foi acionado */
  wordsAtStart: number
  /** Date.now() do play */
  startedAt: number
  /** tela preta na saída, sem parar o relógio */
  blackout: boolean
  /** congela a saída enquanto o operador reescreve */
  frozen: boolean
  /**
   * Cartão no ar, ou nada.
   *
   * Mora no transporte, e não em `cards`, porque é estado de momento: abrir um
   * projeto não pode subir um cartão na cara do apresentador, do mesmo jeito
   * que não sobe a transmissão.
   */
  card: string | null
  /**
   * O relógio do vídeo no ar.
   *
   * Mora no transporte junto com `card` porque é da mesma natureza: estado de
   * momento. Abrir um projeto não retoma um vídeo no meio.
   */
  video: VideoClock
  /**
   * O cronômetro de verdade, para quem escolheu o modo `cronometro` no
   * relógio da saída.
   *
   * Guarda de onde partiu e quando, do mesmo jeito que `video` — cada janela
   * calcula sozinha o segundo atual. A diferença para o relógio de rolagem
   * (`wordsAtStart`/`startedAt`) é o que mexe nele: editar o texto, mudar
   * palavras-por-linha ou o ritmo reancora a leitura o tempo todo, e um
   * cronômetro que reiniciasse a cada uma dessas mudanças não seria um
   * cronômetro. Só o play/pausa e o reiniciar tocam aqui.
   */
  stopwatch: StopwatchClock
  /**
   * Date.now() de quando a leitura desta aba começou a contar, para quem
   * escolheu o modo `livre` no relógio da saída.
   *
   * A diferença para `stopwatch`: aquele congela quando o texto pausa, este
   * nunca congela — decorrido é só `agora - independentStartedAt`, sem
   * nenhum `if (tocando)`. É o relógio para quando o programa abre com
   * vídeo e só depois corta para quem lê: o tempo do vídeo já entra na
   * conta, e pausar o texto no meio (por qualquer motivo) não pára nada.
   * Só reiniciar a leitura ou trocar de aba zera — o mesmo gatilho que já
   * zera `stopwatch` hoje.
   */
  independentStartedAt: number
}

/** De onde o cronômetro partiu e quando — nunca em que segundo ele está. */
export interface StopwatchClock {
  /** segundos acumulados enquanto pausado */
  base: number
  /** Date.now() de quando a corrida atual começou; 0 enquanto pausado */
  comecouEm: number
}

export interface OutputConfig {
  displayId: number | null
  enabled: boolean
  /**
   * Viewport que a janela de transmissão realmente tem, informado por ela.
   *
   * Não dá para deduzir do monitor: em cheio o Windows entrega alguns pixels a
   * mais do que `display.size`, e a prévia do operador precisa do número certo
   * ou deixa de ser réplica exata.
   */
  viewport: { width: number; height: number } | null
}

export type LayoutMode = 'split' | 'focus' | 'deck'

/**
 * Onde mora o transporte — o play, os relógios e a régua de velocidade.
 *
 * `topo`: tudo na barra de cima, como sempre foi.
 * `regua`: a barra de cima fica só com arquivo e saída, e o transporte vira
 * uma faixa no rodapé, entre o roteiro e os cartões — mais perto de onde o
 * olho já está durante o programa, e devolvendo altura ao editor e à prévia.
 *
 * É preferência de operação, não de aparência: cada operador acha uma das
 * duas mais rápida para a mão dele, e a escolha fica gravada.
 */
export type TransportPosition = 'topo' | 'regua'

export interface AppState {
  tabs: Tab[]
  activeTabId: string
  /**
   * Onde o .valendo deste programa foi salvo ou aberto pela última vez —
   * `null` enquanto nada foi gravado ainda. É o que dá nome ao projeto no
   * centro do cabeçalho; diferente de `tab.exportPath`, que é do ROTEIRO
   * (só o texto), não do programa inteiro.
   */
  projectPath: string | null
  /**
   * Idioma da interface. Do app inteiro, não da aba: é cromo do programa, e
   * não uma escolha de aparência do roteiro.
   */
  language: Lang
  layoutMode: LayoutMode
  transportPosition: TransportPosition
  /** painel de ajustes da direita */
  inspectorVisible: boolean
  /** coluna de capítulos e cartões do bloco, à esquerda — só existe no Split */
  sidebarVisible: boolean
  /**
   * A gaveta de cartões, embaixo.
   *
   * Mora aqui e não no renderer, ao lado de `inspectorVisible`, porque é
   * painel fixo e não janela de passagem: quem deixou a gaveta aberta com as
   * artes do programa quer encontrá-la aberta amanhã.
   */
  cardsVisible: boolean
  /** altura da gaveta em pixels, ajustada pelo operador na divisória */
  cardsHeight: number
  transport: Transport
  output: OutputConfig
  presets: ColorPreset[]
  /**
   * Os cartões do programa. Do projeto, não da aba: são mobília do estúdio, e
   * o mesmo standby serve para qualquer roteiro aberto.
   */
  cards: Cartao[]
  /** commandId -> binding, sobrepondo o padrão do registro */
  keymap: Record<string, string>
  /**
   * O operador gravou os próprios padrões, em vez dos de fábrica.
   *
   * Derivado da existência de `defaults.json`, e recalculado a cada abertura:
   * o valor que estiver no workspace gravado não vale nada, porque o arquivo
   * de padrões pode ter sido apagado enquanto o app estava fechado.
   */
  customDefaults: boolean
  /**
   * A página que quem está na mesma rede abre para acompanhar a leitura.
   *
   * Como a transmissão, nunca sobe sozinha ao abrir o app: pôr o roteiro na
   * rede é uma decisão, e decisão que o app toma por conta própria não é
   * decisão de ninguém.
   */
  webview: {
    enabled: boolean
    /**
     * Peso do vídeo servido à rede local. `original` manda o arquivo como
     * ele é; os outros mandam uma cópia recodificada, gerada uma vez.
     */
    videoPerfil: PerfilDeRede
  }
}

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  size: { width: number; height: number }
  scaleFactor: number
  rotation: number
  internal: boolean
  primary: boolean
}
