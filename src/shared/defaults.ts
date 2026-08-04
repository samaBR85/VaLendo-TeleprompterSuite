import { traduzir, type Chave, type Lang } from './i18n'
import type {
  Appearance,
  AppState,
  CardOverlayStyle,
  ColorPreset,
  PreferenciasDaMaquina,
  Tab
} from './types'
import { blocksFromText } from './text'
import { CRONOMETRO_PARADO } from './pacing'
import { VIDEO_PARADO } from './video'

/**
 * Abaixo disto, o cartão de vídeo — o mais alto — não cabe no espaço que a
 * gaveta reserva para ele, e a fileira de baixo ("no ar" · OVERLAY · repetir)
 * fica escondida atrás da borda inferior da gaveta (`overflow-hidden` corta
 * sem avisar). Medido ao vivo com o cartão de vídeo completo (arte 90 +
 * fileira do player em duas linhas, scrub e volume/tempo separados + fileira
 * do "no ar" 28): a 200px sobravam 13px cortados; 220px é o primeiro valor
 * sem corte, com uma folga pequena para variação de fonte entre sistemas.
 */
export const CARDS_HEIGHT_MIN = 220
/**
 * A gaveta nasce no próprio mínimo, e não mais compacta.
 *
 * Já foi 172px — mostrava a fileira de miniaturas sem comer a prévia, e
 * bastava enquanto só havia imagem e recado. Mas todos os cartões dividem a
 * mesma altura (a fileira estica todos por igual); nascer abaixo do mínimo
 * faria o primeiro vídeo que o operador subisse colidir com a linha de baixo,
 * sem ele ter tocado na divisória. Nascer no próprio piso é o mais compacto
 * que dá para ser sem esse risco.
 */
export const CARDS_HEIGHT_DEFAULT = CARDS_HEIGHT_MIN
export const CARDS_HEIGHT_MAX = 420

/** largura da coluna de assets: o valor fixo de antes vira o padrão, agora ajustável */
export const SIDEBAR_WIDTH_MIN = 180
export const SIDEBAR_WIDTH_DEFAULT = 206
export const SIDEBAR_WIDTH_MAX = 420

/** a divisória Edição×Transmissão no Split — fração que a Edição ocupa */
export const EDITION_SPLIT_DEFAULT = 0.46

/* ------------------------------------------- o conforto desta máquina */

/** miniaturas da coluna de Assets */
export const THUMB_MIN = 40
export const THUMB_MAX = 96
/**
 * Meio da faixa, e não o mínimo: o slider nasce no centro, então o operador
 * descobre que dá para ir para os DOIS lados. Encostado no mínimo, ele parecia
 * um controle já no fim do curso.
 */
export const THUMB_DEFAULT = Math.round((THUMB_MIN + THUMB_MAX) / 2)

/**
 * Quanto anda um clique nos ícones das pontas: um décimo do curso.
 *
 * A conta é em PORCENTAGEM da faixa, não em pixels, para os degraus caírem
 * sempre na mesma grade de 0/10/20…100% — somar pixels arredondados iria
 * derivando e nunca fecharia exatamente nas pontas.
 */
export function passoDaMiniatura(atual: number, direcao: 1 | -1): number {
  const pct = ((atual - THUMB_MIN) / (THUMB_MAX - THUMB_MIN)) * 100
  const alvo = Math.min(100, Math.max(0, Math.round(pct / 10) * 10 + direcao * 10))
  return Math.round(THUMB_MIN + (alvo / 100) * (THUMB_MAX - THUMB_MIN))
}

/** corpo da fonte de DIGITAR, no editor — nunca a da saída */
export const EDITOR_FONT_MIN = 11
export const EDITOR_FONT_MAX = 28
export const EDITOR_FONT_DEFAULT = 14

/**
 * Como a máquina nasce: tudo no mesmo lugar de sempre.
 *
 * Estes valores viviam soltos como `useState` dentro dos componentes e
 * reiniciavam a cada abertura. Vindos daqui, o reducer consegue guardá-los e
 * limitá-los num lugar só — e `semMaquina` consegue cortá-los do `.valendo`
 * como um bloco.
 */
export const MAQUINA_PADRAO: PreferenciasDaMaquina = {
  window: null,
  thumbSize: THUMB_DEFAULT,
  editorFontSize: EDITOR_FONT_DEFAULT,
  editorAllCaps: false,
  cardVolume: 1,
  ajudaAberta: true,
  abaDosAjustes: 'texto'
}

/**
 * O padrão de fábrica do overlay: desligado, e faixa escura pronta para
 * quando ligar — é o único dos três estilos que garante legibilidade em
 * cima de qualquer imagem, então é o que faz sentido já vir escolhido.
 */
export const DEFAULT_CARD_OVERLAY: { enabled: boolean; style: CardOverlayStyle } = {
  enabled: false,
  style: 'faixa'
}

/**
 * As famílias de fonte da saída, pela CHAVE do dicionário.
 *
 * Os nomes eram texto fixo em português, e apareciam em português mesmo com o
 * app em inglês — é a única lista da interface que tinha ficado de fora do
 * i18n. O `value` (a pilha de fontes do CSS) é o que vai para o arquivo do
 * projeto e não muda com o idioma; traduzir o nome não mexe em roteiro
 * nenhum.
 */
export const FONT_OPTIONS: { chave: Chave; value: string }[] = [
  { chave: 'font.system', value: 'system-ui, sans-serif' },
  { chave: 'font.sans', value: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { chave: 'font.serif', value: 'Georgia, "Times New Roman", serif' },
  { chave: 'font.mono', value: '"Cascadia Mono", "SF Mono", Consolas, monospace' },
  { chave: 'font.condensed', value: '"Arial Narrow", "Helvetica Neue Condensed", sans-serif' },
  { chave: 'font.legible', value: '"Atkinson Hyperlegible", "Verdana", sans-serif' }
]

export const DEFAULT_APPEARANCE: Appearance = {
  fontFamily: FONT_OPTIONS[1].value,
  fontSize: 64,
  fontWeight: 500,
  lineHeight: 1.35,
  letterSpacing: 0,
  allCaps: false,
  marginPct: 8,
  positionPct: 50,
  minWords: 4,
  maxWords: 7,
  uniformSpeed: true,
  // branco no preto é o que um teleprompter deve ser, e não acompanha o tema
  // do app: isto é o que o apresentador lê, não o cromo em volta
  textColor: '#FFFFFF',
  bgColor: '#000000',
  directionColor: '#6AA8FF',
  align: 'left',
  readingLinePct: 0.38,
  readingMarkOnOutput: false,
  focusDim: true,
  // ligado de fábrica: o teleprompter devolve a imagem por um vidro
  // semiespelhado, então a montagem comum já pede o espelho horizontal —
  // nascer desligado fazia todo rig novo começar com o texto ao contrário na
  // cara do apresentador. Não mexe na prévia nem na página da rede
  mirrorX: true,
  mirrorY: false,
  rotation: 0,
  timers: {
    elapsed: false,
    remaining: false,
    position: 'topRight',
    elapsedColor: '#46D17F',
    remainingColor: '#FF6B5E',
    sizePct: 3.5,
    mode: 'palavras',
    targetSeconds: 180
  }
}

/**
 * As paletas nascem com o nome no idioma da instalação.
 *
 * Nome é dado, não interface: fica gravado no workspace e no .valendo. Por
 * isso é traduzido na hora de criar, e não a cada desenho — trocar o idioma
 * depois não renomeia paleta que já está salva, do mesmo jeito que não
 * renomeia aba que o operador batizou.
 */
export function presetsPadrao(lang: Lang = 'pt-BR'): ColorPreset[] {
  return [
    { id: 'classico', name: traduzir(lang, 'content.preset.classic'), textColor: '#FFFFFF', bgColor: '#000000' },
    { id: 'papel', name: traduzir(lang, 'content.preset.paper'), textColor: '#111111', bgColor: '#FFFFFF' },
    { id: 'ambar', name: traduzir(lang, 'content.preset.amber'), textColor: '#FFD79A', bgColor: '#1A1206' },
    { id: 'noite', name: traduzir(lang, 'content.preset.night'), textColor: '#DCE9FF', bgColor: '#04142B' },
    { id: 'baixocontraste', name: traduzir(lang, 'content.preset.soft'), textColor: '#D8D8D2', bgColor: '#16181A' }
  ]
}

export const DEFAULT_PRESETS: ColorPreset[] = presetsPadrao('pt-BR')

export const SPEED_PRESETS = [110, 148, 190]

/** Roteiro de demonstração, no idioma da instalação. Também é dado, não interface. */
export function roteiroDeExemplo(lang: Lang = 'pt-BR'): string {
  return traduzir(lang, 'content.sample')
}

export const SAMPLE_TEXT = roteiroDeExemplo('pt-BR')

let tabCounter = 0

/**
 * `appearance` entra por parâmetro para que a aba nova nasça com o padrão que o
 * operador gravou, e não com o de fábrica. Sem isso, criar uma aba no meio do
 * programa devolveria a fonte e as cores para valores que ele já tinha trocado.
 */
export function createTab(
  title: string,
  text: string,
  color: string,
  appearance: Appearance = DEFAULT_APPEARANCE
): Tab {
  tabCounter += 1
  const blocks = blocksFromText(text)
  return {
    id: `t${Date.now().toString(36)}${tabCounter.toString(36)}`,
    title,
    color,
    blocks,
    // cópia em dois níveis: uma aba não pode compartilhar o objeto de relógios
    // com o padrão, ou mexer numa mexeria na outra
    appearance: { ...appearance, timers: { ...appearance.timers } },
    markers: [],
    // vazio é o caso comum: um apresentador só, sem nome escrito no roteiro
    apresentadores: [],
    anchor: blocks.length > 0 ? { blockId: blocks[0].id, wordOffset: 0 } : null,
    rev: 1
  }
}

/**
 * O pontinho que identifica cada aba.
 *
 * Seis cores distinguíveis de relance — é assim que o operador acha a aba
 * certa no meio de dez sem ler o nome. Ficam aqui em hex, e não como tokens
 * de tema, porque são identidade de conteúdo: a aba "Encerramento" continua
 * verde independentemente da cor que o app usar para "está rolando".
 */
export const TAB_COLORS = ['#EE7AB4', '#C07BF0', '#F0B429', '#46D17F', '#6AA8FF', '#FF4D4D']

export function createInitialState(
  defaults: { appearance: Appearance; ppm: number } = { appearance: DEFAULT_APPEARANCE, ppm: SPEED_PRESETS[1] },
  lang: Lang = 'en'
): AppState {
  const tab = createTab(
    traduzir(lang, 'content.firstTab'),
    roteiroDeExemplo(lang),
    TAB_COLORS[0],
    defaults.appearance
  )
  return {
    tabs: [tab],
    activeTabId: tab.id,
    projectPath: null,
    language: lang,
    layoutMode: 'split',
    // a régua no rodapé é a visão de fábrica: durante o programa o olho está
    // no roteiro e na prévia, e o transporte logo abaixo deles fica no caminho
    // da mão — no topo ele obriga a subir a tela inteira para dar um play. Quem
    // preferir o contrário troca uma vez (F8) e a escolha fica gravada
    transportPosition: 'regua',
    inspectorVisible: true,
    sidebarVisible: true,
    sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
    cardsVisible: false,
    cardsHeight: CARDS_HEIGHT_DEFAULT,
    editionSplit: EDITION_SPLIT_DEFAULT,
    maquina: MAQUINA_PADRAO,
    transport: {
      playing: false,
      ppm: defaults.ppm,
      wordsAtStart: 0,
      startedAt: 0,
      blackout: false,
      frozen: false,
      card: null,
      video: VIDEO_PARADO,
      stopwatch: CRONOMETRO_PARADO,
      independentStartedAt: 0,
      loop: false,
      loopDelaySeconds: 0
    },
    output: { displayId: null, enabled: false, viewport: null },
    presets: presetsPadrao(lang),
    cards: [],
    cardOverlay: DEFAULT_CARD_OVERLAY,
    keymap: {},
    customDefaults: false,
    // `som` nasce ligado: é o comportamento que já existia antes de haver
    // interruptor, e ninguém é pego de surpresa por isso — quem assiste ainda
    // precisa tocar no botão para liberar o áudio no próprio aparelho
    webview: { enabled: false, videoPerfil: 'leve', som: true }
  }
}
