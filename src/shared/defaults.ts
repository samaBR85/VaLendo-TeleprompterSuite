import type { Appearance, AppState, ColorPreset, Tab } from './types'
import { blocksFromText } from './text'

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
    sizePct: 3.5
  }
}

export const DEFAULT_PRESETS: ColorPreset[] = [
  { id: 'classico', name: 'Clássico', textColor: '#FFFFFF', bgColor: '#000000' },
  { id: 'papel', name: 'Papel', textColor: '#111111', bgColor: '#FFFFFF' },
  { id: 'ambar', name: 'Âmbar', textColor: '#FFD79A', bgColor: '#1A1206' },
  { id: 'noite', name: 'Azul noite', textColor: '#DCE9FF', bgColor: '#04142B' },
  { id: 'baixocontraste', name: 'Suave', textColor: '#D8D8D2', bgColor: '#16181A' }
]

export const SPEED_PRESETS = [110, 148, 190]

export const SAMPLE_TEXT = [
  '§ Abertura',
  'Boa noite. Hoje a gente vai falar sobre uma mudança que já está acontecendo nos estúdios do país inteiro.',
  '[olhar câmera 2 · pausa]',
  'E o mais importante: ninguém precisa mais parar a gravação para corrigir uma frase.',
  'Vamos ver como isso funciona na prática. Este texto pode ser editado agora, com a transmissão no ar, e a palavra que está sob a marca de leitura não vai se mexer.',
  '§ Bloco 2',
  'Experimente: aumente o corpo da fonte, mude a margem, troque as palavras por linha. Nada salta.'
].join('\n\n')

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
  defaults: { appearance: Appearance; ppm: number } = { appearance: DEFAULT_APPEARANCE, ppm: SPEED_PRESETS[1] }
): AppState {
  const tab = createTab('Abertura', SAMPLE_TEXT, TAB_COLORS[0], defaults.appearance)
  return {
    tabs: [tab],
    activeTabId: tab.id,
    layoutMode: 'split',
    inspectorVisible: true,
    transport: {
      playing: false,
      ppm: defaults.ppm,
      wordsAtStart: 0,
      startedAt: 0,
      blackout: false,
      frozen: false
    },
    output: { displayId: null, enabled: false, viewport: null },
    presets: DEFAULT_PRESETS,
    keymap: {},
    customDefaults: false,
    webview: { enabled: false }
  }
}
