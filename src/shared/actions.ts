import type { Lang } from './i18n/types'
import type {
  Anchor,
  Appearance,
  AppState,
  Cartao,
  CardOverlayStyle,
  LayoutMode,
  PreferenciasDaMaquina,
  TransportPosition
} from './types'
import type { PerfilDeRede } from './proxy'

/**
 * Tudo que muda estado passa por aqui. O renderer nunca escreve direto: manda
 * a ação para o main, que é a fonte de verdade, e recebe o estado de volta.
 * Assim a janela do operador e a da transmissão não têm como divergir.
 */
export type Action =
  | { type: 'text/set'; tabId: string; text: string }
  | { type: 'appearance/patch'; tabId: string; patch: Partial<Appearance> }
  | { type: 'appearance/invert'; tabId: string }
  | { type: 'appearance/preset'; tabId: string; presetId: string }
  | { type: 'transport/toggle' }
  /** `rebobinar: false` pausa exatamente onde parou, sem os 2 palavras de cortesia — usado pelo auto-pausa no fim do roteiro */
  | { type: 'transport/pause'; rebobinar?: boolean }
  /** `peloLoop: true` é o loop reiniciando sozinho — o relógio do modo Livre não zera, só a rolagem */
  | { type: 'transport/restart'; peloLoop?: boolean }
  | { type: 'transport/seekWords'; delta: number }
  | { type: 'transport/seekAnchor'; anchor: Anchor }
  | { type: 'transport/ppm'; ppm: number }
  | { type: 'transport/nudgePpm'; delta: number }
  | { type: 'transport/blackout' }
  | { type: 'transport/freeze' }
  /** ao chegar no fim do roteiro, volta ao início e continua tocando */
  | { type: 'transport/loop' }
  /** espera, em segundos, antes do loop reiniciar a leitura */
  | { type: 'transport/loopDelay'; seconds: number }
  | { type: 'card/add'; card: Cartao }
  | { type: 'card/remove'; cardId: string }
  /** arrastar reordena — o cartão sai de onde está e entra em `toIndex` */
  | { type: 'card/reorder'; cardId: string; toIndex: number }
  | { type: 'card/rename'; cardId: string; nome: string }
  | { type: 'card/text'; cardId: string; texto: string }
  /** o operador reimportou a arte de um cartão de imagem cujo arquivo sumiu */
  | { type: 'card/imageFile'; cardId: string; arquivo: string }
  /**
   * Mostra o cartão; passar o que já está no ar tira ele da tela.
   *
   * `paused`: só vale para vídeo, e só na hora de subir — entra no ar
   * parado no quadro em que estava, em vez de tocar sozinho. É o botão
   * PAUSE do player, para pré-posicionar antes de ir ao ar de verdade.
   */
  | { type: 'card/show'; cardId: string | null; paused?: boolean }
  | { type: 'card/videoPlay'; tocando: boolean }
  /**
   * `arrastando` distingue a barra na mão do operador de um pulo já decidido:
   * com ela na mão, as saídas seguram o quadro e só acompanham no soltar.
   *
   * `cardId` é sempre o cartão da barra que o operador está mexendo — no ar
   * ou não. Fora do ar, só a posição salva do cartão (`pausedAt`) muda; no
   * ar, o relógio compartilhado muda também, porque é ele que as saídas
   * seguem.
   */
  | { type: 'card/videoSeek'; cardId: string; segundo: number; arrastando: boolean }
  | { type: 'card/videoLoop'; cardId: string; loop: boolean }
  /** o texto da Transmissão sobrepõe este cartão em vez de substituí-lo */
  | { type: 'card/overlay'; cardId: string; overlay: boolean }
  /** o vídeo carregou e informou quanto dura — a barra precisa saber o fim */
  | { type: 'card/videoDuration'; cardId: string; duracao: number }
  /** um quadro do vídeo virou miniatura; é o que viaja no projeto */
  | { type: 'card/videoPoster'; cardId: string; poster: string }
  /** o operador reapontou o arquivo, ou o main descobriu que ele sumiu */
  | {
      type: 'card/videoLink'
      cardId: string
      caminho?: string
      arquivoNome?: string
      /** cópia tocável recém-gerada; `null` limpa a que existia */
      convertido?: string | null
      vinculado: boolean
    }
  | { type: 'layout/cards'; visible: boolean }
  | { type: 'layout/cardsHeight'; height: number }
  | { type: 'layout/sidebarWidth'; width: number }
  /** a divisória Edição×Transmissão, arrastada no Split */
  | { type: 'layout/split'; ratio: number }
  /** posição/tamanho da janela do operador, capturado ao mover/redimensionar/fechar */
  | { type: 'window/bounds'; bounds: { width: number; height: number; x: number; y: number } }
  /**
   * Conforto desta máquina: miniaturas, fonte do editor, volume da prévia,
   * ajuda aberta, aba dos Ajustes. Uma ação só para o grupo inteiro — são
   * preferências do mesmo tipo, e uma ação por slider só encheria o registro.
   */
  | { type: 'maquina/patch'; patch: Partial<PreferenciasDaMaquina> }
  | { type: 'marker/add'; tabId: string; blockId: string; label: string }
  | { type: 'marker/remove'; tabId: string; markerId: string }
  /* Apresentadores: quem fala o roteiro desta aba, e de que cor.
     `nome` é o texto como está escrito no roteiro — é o casamento com ele que
     decide onde a cor começa. O RELINK é `presenter/rename`: mesmo id, mesma
     cor, nome novo, para o operador não perder a cor ao corrigir o roteiro. */
  | { type: 'presenter/add'; tabId: string; nome: string }
  | { type: 'presenter/rename'; tabId: string; presenterId: string; nome: string }
  | { type: 'presenter/color'; tabId: string; presenterId: string; cor: string }
  | { type: 'presenter/remove'; tabId: string; presenterId: string }
  | { type: 'tab/add' }
  | { type: 'tab/close'; tabId: string }
  | { type: 'tab/activate'; tabId: string }
  | { type: 'tab/rename'; tabId: string; title: string }
  | { type: 'app/language'; language: Lang }
  /**
   * Idioma escolhido no modal de boas-vindas — troca a língua E reescreve o
   * roteiro de demonstração, o nome da aba e as predefinições de cor nela.
   *
   * Separada de `app/language` porque a diferença é o que se pode destruir sem
   * medo. No globo do cabeçalho o roteiro já pode ter sido escrito, e traduzir
   * por cima apagaria o trabalho de quem digitou; por isso lá o texto nunca é
   * tocado. Aqui a única coisa na tela é a amostra que o próprio app acabou de
   * pôr, e mostrá-la na língua escolhida É o ponto do modal.
   */
  | { type: 'estreia/language'; language: Lang }
  /** revela o trabalho gravado, que esperava de lado desde a partida */
  | { type: 'estreia/continuar' }
  /** põe o roteiro de demonstração no idioma escolhido */
  | { type: 'estreia/demo' }
  | { type: 'layout/mode'; mode: LayoutMode }
  | { type: 'layout/transportPosition'; position: TransportPosition }
  | { type: 'layout/inspector'; visible: boolean }
  | { type: 'layout/sidebar'; visible: boolean }
  | { type: 'layout/rows'; tabId: string; rows: number[] }
  | { type: 'output/set'; displayId: number | null; enabled: boolean }
  | { type: 'output/viewport'; width: number; height: number }
  | { type: 'keymap/set'; commandId: string; binding: string | null }
  | { type: 'defaults/save' }
  | { type: 'defaults/reset' }
  | { type: 'storage/dismissNotice' }
  | { type: 'document/exportedTo'; tabId: string; path: string }
  | { type: 'project/replace'; state: AppState }
  | { type: 'project/pathSet'; path: string | null }
  | { type: 'project/new' }
  | { type: 'webview/set'; enabled: boolean }
  | { type: 'webview/videoPerfil'; perfil: PerfilDeRede }
  /** o áudio do cartão de vídeo sai pela rede — rota, não nível */
  | { type: 'webview/som'; som: boolean }
  /** o interruptor "OVERLAY": ligado, força o texto por cima de qualquer cartão */
  | { type: 'cardOverlay/set'; enabled: boolean }
  | { type: 'cardOverlay/style'; style: CardOverlayStyle }
  /** a cópia leve ficou pronta (ou foi descartada, com `null`) */
  | { type: 'card/videoProxy'; cardId: string; proxy: { arquivo: string; perfil: PerfilDeRede } | null }
  | { type: 'history/undo'; tabId: string }
  | { type: 'history/redo'; tabId: string }
  | { type: 'document/import'; title: string; text: string; intoNewTab: boolean }

export interface HistoryInfo {
  canUndo: boolean
  canRedo: boolean
  depth: number
}

export const CHANNELS = {
  stateGet: 'state:get',
  stateAction: 'state:action',
  stateChanged: 'state:changed',
  historyInfo: 'history:info',
  displaysList: 'displays:list',
  displaysChanged: 'displays:changed',
  displaysIdentify: 'displays:identify',
  importDocument: 'document:import',
  exportDocument: 'document:export',
  projectSave: 'project:save',
  projectOpen: 'project:open',
  /** abre um caminho já conhecido, sem passar pelo diálogo — os recentes */
  projectOpenPath: 'project:openPath',
  projectRecents: 'project:recents',
  projectClearRecents: 'project:clearRecents',
  projectIsDirty: 'project:isDirty',
  openExternal: 'app:openExternal',
  /** escala da interface do operador — preferência da máquina, fora do AppState */
  uiScaleGet: 'app:uiScaleGet',
  uiScaleSet: 'app:uiScaleSet',
  broadcastCoversOperator: 'broadcast:coversOperator',
  confirmCloseRequest: 'app:confirmCloseRequest',
  confirmCloseResponse: 'app:confirmCloseResponse',
  cardPick: 'card:pick',
  cardPickVideo: 'card:pickVideo',
  cardImportPath: 'card:importPath',
  cardConvert: 'card:convert',
  cardConvertProgress: 'card:convertProgress'
} as const
