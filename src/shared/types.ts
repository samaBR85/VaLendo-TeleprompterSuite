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

export interface AppState {
  tabs: Tab[]
  activeTabId: string
  layoutMode: LayoutMode
  /** painel de ajustes da direita */
  inspectorVisible: boolean
  transport: Transport
  output: OutputConfig
  presets: ColorPreset[]
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
  webview: { enabled: boolean }
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
