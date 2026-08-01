import { traduzir, type Lang } from './i18n'
import type { Appearance, AppState, ColorPreset, Tab } from './types'
import { blocksFromText } from './text'
import { CRONOMETRO_PARADO } from './pacing'
import { VIDEO_PARADO } from './video'

/**
 * Abaixo disto, o cartão de vídeo — o mais alto, com as três linhas do
 * player quando está no ar (transporte, tempo/rede/repetir, volume) — não
 * cabe mais no espaço que a gaveta reserva para ele, e o miolo (que pode
 * encolher, `flex-1 min-h-0`) fica menor que o player (que não encolhe). O
 * player então vaza por cima da linha "on screen"/lixeira: os ícones colidem.
 *
 * Medido no app: cabeçalho (34px) + borda (1px) + respiro da fileira de
 * cartões (20px) + altura mínima de conteúdo do cartão de vídeo (193px) =
 * 248px. Com folga para variação de renderização de fonte entre sistemas.
 */
export const CARDS_HEIGHT_MIN = 260
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

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Sistema', value: 'system-ui, sans-serif' },
  { label: 'Sem serifa larga', value: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { label: 'Serifa', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monoespaçada', value: '"Cascadia Mono", "SF Mono", Consolas, monospace' },
  { label: 'Condensada', value: '"Arial Narrow", "Helvetica Neue Condensed", sans-serif' },
  { label: 'Legibilidade alta', value: '"Atkinson Hyperlegible", "Verdana", sans-serif' }
]

export const DEFAULT_APPEARANCE: Appearance = {
  fontFamily: FONT_OPTIONS[1].value,
  fontSize: 64,
  fontWeight: 500,
  lineHeight: 1.35,
  letterSpacing: 0,
  marginPct: 8,
  minWords: 4,
  maxWords: 7,
  uniformSpeed: true,
  textColor: '#FFFFFF',
  bgColor: '#000000',
  directionColor: '#7FB2FF',
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
    elapsedColor: '#5DCAA5',
    remainingColor: '#E24B4A',
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
    anchor: blocks.length > 0 ? { blockId: blocks[0].id, wordOffset: 0 } : null,
    rev: 1
  }
}

export const TAB_COLORS = ['#E24B4A', '#378ADD', '#1D9E75', '#EF9F27', '#7F77DD', '#D4537E']

export function createInitialState(
  defaults: { appearance: Appearance; ppm: number } = { appearance: DEFAULT_APPEARANCE, ppm: SPEED_PRESETS[1] },
  lang: Lang = 'pt-BR'
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
    language: lang,
    layoutMode: 'split',
    inspectorVisible: true,
    cardsVisible: false,
    cardsHeight: CARDS_HEIGHT_DEFAULT,
    transport: {
      playing: false,
      ppm: defaults.ppm,
      wordsAtStart: 0,
      startedAt: 0,
      blackout: false,
      frozen: false,
      card: null,
      video: VIDEO_PARADO,
      stopwatch: CRONOMETRO_PARADO
    },
    output: { displayId: null, enabled: false, viewport: null },
    presets: presetsPadrao(lang),
    cards: [],
    keymap: {},
    customDefaults: false,
    webview: { enabled: false, videoPerfil: 'leve' }
  }
}
