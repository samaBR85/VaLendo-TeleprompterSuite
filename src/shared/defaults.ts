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

/**
 * A divisória Edição×Transmissão no Split — fração que a Edição ocupa.
 *
 * Meio exato, e o número importa porque o duplo clique na divisória volta
 * para aqui. Era 0.46, e ninguém sabia dizer por quê: dava à Transmissão uma
 * sobra de 4% que não vinha de nenhuma medida. O efeito era o operador dar o
 * duplo clique esperando centralizar e ficar com a divisória visivelmente
 * fora do meio, sem gesto nenhum que a levasse até lá.
 */
export const EDITION_SPLIT_DEFAULT = 0.5

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
/**
 * A fonte com que se DIGITA — não a que o apresentador lê.
 *
 * Monoespaçada por padrão porque o editor é uma ilusão de alinhamento: um
 * campo de texto invisível por cima de um bloco colorido, casados caractere a
 * caractere. Qualquer família serve, contanto que as DUAS camadas usem a
 * mesma; a monoespaçada só é a que perdoa mais, porque a coluna do texto fica
 * previsível para quem conta caracteres de deixa.
 */
export const EDITOR_FONTE_PADRAO = '"Cascadia Mono", "SF Mono", Consolas, monospace'

export const MAQUINA_PADRAO: PreferenciasDaMaquina = {
  window: null,
  thumbSize: THUMB_DEFAULT,
  editorFontSize: EDITOR_FONT_DEFAULT,
  editorFontFamily: EDITOR_FONTE_PADRAO,
  editorAllCaps: false,
  /* a grade completa na abertura: e a que o operador ja conhece, e trocar o
     que ele ve ao abrir seria mudar o gesto dele sem pedir. As oito ficam a
     um clique. O filtro nasce LIGADO porque ele so apaga o que de fato nao se
     le — desligado por padrao, ninguem descobriria que ele existe */
  paletaCurta: false,
  filtroDeContraste: true,
  paletaPastel: false,
  cardVolume: 1,
  /* a roda nasce VAZIA, e as quatro casas aparecem em branco na barra. Branco
     é a cor do texto sem marca — a casa vazia mostra o que aquele lugar ainda
     não tem, em vez de fingir uma sugestão que o operador nunca escolheu */
  coresRecentes: [],
  proximaCorRecente: 0,
  ajudaAberta: true,
  presetsAberto: true,
  apresentadoresAberto: true,
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
/**
 * A única que o app carrega consigo — e a única em que o controle de peso é
 * contínuo de verdade. As de baixo são do sistema, e o sistema instala duas ou
 * três faces por família; ver `pesosQueDesenham` em `shared/pesos.ts`.
 */
export const FONTE_EMBUTIDA = '"Inter Variable", system-ui, sans-serif'

export const FONT_OPTIONS: { chave: Chave; value: string }[] = [
  { chave: 'font.inter', value: FONTE_EMBUTIDA },
  { chave: 'font.system', value: 'system-ui, sans-serif' },
  { chave: 'font.sans', value: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { chave: 'font.serif', value: 'Georgia, "Times New Roman", serif' },
  { chave: 'font.mono', value: EDITOR_FONTE_PADRAO },
  { chave: 'font.condensed', value: '"Arial Narrow", "Helvetica Neue Condensed", sans-serif' },
  { chave: 'font.legible', value: '"Atkinson Hyperlegible", "Verdana", sans-serif' }
]

/**
 * As fontes de DIGITAR — outra lista, e é de propósito.
 *
 * Era a mesma da saída, e as duas respondem a perguntas diferentes: uma é o
 * que é confortável de digitar por horas na tela do operador, a outra é o que
 * se lê a três metros num vidro semiespelhado. A de cima descreve CATEGORIAS
 * ("Com serifa"), porque a saída aceita o que a máquina tiver instalado; esta
 * nomeia FONTES, porque todas as dez viajam dentro do app e desenham igual no
 * Windows e no Mac. Ver os `@font-face` em `styles.css`.
 *
 * Em ordem ALFABÉTICA, e não agrupadas por natureza. Ficaram um tempo juntas
 * por família — mono, proporcionais, serifadas —, mas dez itens é o ponto em
 * que essa ordem deixa de ajudar: quem já sabe o nome da fonte que quer perde
 * mais tempo descobrindo em qual grupo ela mora do que percorrendo a lista
 * inteira. Alfabética não precisa ser aprendida.
 *
 * A ordem é fixa no código, e não calculada na tela, porque nome de fonte não
 * se traduz — a lista sai igual nos seis idiomas. `fontes.test.ts` cobra que
 * ela continue ordenada: é a única coisa que impede uma fonte nova de entrar
 * no fim por descuido.
 *
 * Repare que a iA Writer Quattro vem ANTES da IBM Plex Sans: ignorando
 * maiúsculas, `ia` vem antes de `ib`.
 *
 * Cada pilha tem reserva do sistema depois da embutida. Não deveria ser
 * preciso — o arquivo vem junto —, mas se um dia um build sair sem a fonte, a
 * reserva mantém o editor legível em vez de entregar a fonte padrão do
 * navegador no meio de um roteiro.
 */
export const FONTES_DO_EDITOR: { chave: Chave; value: string }[] = [
  { chave: 'font.alegreya', value: 'Alegreya, Georgia, serif' },
  { chave: 'font.atkinson', value: '"Atkinson Hyperlegible Next", system-ui, sans-serif' },
  { chave: 'font.cascadia', value: EDITOR_FONTE_PADRAO },
  { chave: 'font.quattro', value: '"iA Writer Quattro", ui-monospace, monospace' },
  { chave: 'font.plex', value: '"IBM Plex Sans", system-ui, sans-serif' },
  { chave: 'font.inter', value: FONTE_EMBUTIDA },
  { chave: 'font.jetbrains', value: '"JetBrains Mono", ui-monospace, monospace' },
  { chave: 'font.lexend', value: 'Lexend, system-ui, sans-serif' },
  { chave: 'font.literata', value: 'Literata, Georgia, serif' },
  { chave: 'font.newsreader', value: 'Newsreader, Georgia, serif' }
]

/**
 * A fonte de digitar guardada ainda existe na lista?
 *
 * Quem tinha escolhido "Com serifa" ou "Condensada" no editor tem a pilha do
 * Georgia ou do Arial Narrow gravada no `workspace.json` — valores que saíram
 * quando as duas listas se separaram. Sem esta peneira o menu mostraria o
 * rótulo da padrão enquanto o editor continuaria desenhando em Georgia: o
 * controle dizendo uma coisa e a tela mostrando outra, que é pior do que
 * perder a escolha.
 *
 * Mora aqui, e não em `semMaquina`/`project.ts`, porque é decisão de LEITURA:
 * o caminho do projeto tem de continuar carregando e devolvendo o que
 * encontrou, sem opinião.
 */
export function fonteDoEditorValida(valor: string | undefined): string {
  return FONTES_DO_EDITOR.some((f) => f.value === valor) ? (valor as string) : EDITOR_FONTE_PADRAO
}

export const DEFAULT_APPEARANCE: Appearance = {
  // a embutida: é a única em que mudar o peso muda o desenho em todos os
  // degraus, e num teleprompter o peso é ajuste de legibilidade no vidro
  fontFamily: FONTE_EMBUTIDA,
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
  deixas: [],
  ocultarApresentadores: false,
  // branco no preto é o que um teleprompter deve ser, e não acompanha o tema
  // do app: isto é o que o apresentador lê, não o cromo em volta
  textColor: '#FFFFFF',
  bgColor: '#000000',
  directionColor: '#6AA8FF',
  align: 'left',
  readingLinePct: 0.38,
  readingMarkOnOutput: false,
  focusDim: true,
  // 60 é a calibragem que devolve as paradas escritas à mão antes deste
  // controle existir: quem não mexer no slider não vê diferença nenhuma
  focusDimPct: 60,
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
    // `som` nasce ligado: é o comportamento que já existia antes de haver
    // interruptor, e ninguém é pego de surpresa por isso — quem assiste ainda
    // precisa tocar no botão para liberar o áudio no próprio aparelho
    webview: { enabled: false, videoPerfil: 'leve', som: true }
  }
}
