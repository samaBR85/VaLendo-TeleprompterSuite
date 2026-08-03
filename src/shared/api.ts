import type { Action, HistoryInfo } from './actions'
import type { Lang } from './i18n/types'
import type { Appearance, AppState, Block, Cartao, CardOverlayStyle, DisplayInfo, Transport } from './types'

export interface StateSnapshot {
  state: AppState
  history: HistoryInfo
  /**
   * Fileiras visuais medidas para cada linha da aba ativa.
   *
   * Vive fora do `AppState` de propósito: é medida, não configuração, e não
   * faz sentido gravar no workspace. Mas precisa chegar às duas janelas para
   * que main e renderer usem exatamente a mesma régua de rolagem.
   */
  rows: number[]
  storage: StorageHealth
  webview: WebviewInfo
}

/**
 * Se o app está conseguindo gravar o que o operador faz.
 *
 * Existe porque a falha que já aconteceu foi silenciosa: o app seguiu
 * funcionando por meia hora sem gravar nada, e só dava para descobrir olhando
 * a data do arquivo por fora. Um teleprompter que perde texto sem avisar é
 * pior que um que não abre.
 */
export interface StorageHealth {
  /**
   * Condição de agora: não está dando para gravar. Some sozinho no instante em
   * que uma gravação dá certo de novo.
   */
  problem: string | null
  /**
   * Algo que já aconteceu e o operador precisa saber — o trabalho gravado veio
   * ilegível, por exemplo. Fica até ele dispensar.
   *
   * Separado de `problem` porque a primeira versão disto sumia sozinha: o app
   * não conseguia ler o roteiro, avisava, e meio segundo depois o primeiro
   * salvamento bem-sucedido apagava o aviso da tela. Ninguém nunca veria.
   */
  notice: string | null
}

/** Resultado de salvar o roteiro num arquivo. Nulo quando o operador desistiu. */
export interface ExportResult {
  ok: boolean
  /** caminho gravado, para a confirmação dizer onde o arquivo ficou */
  path: string
  format: string
  error?: string
}

/** Resultado de salvar ou abrir um projeto. Nulo quando o operador desistiu. */
export interface ProjectResult {
  ok: boolean
  path: string
  error?: string
}

/**
 * Por que fechar o app precisa de confirmação.
 *
 * Os dois motivos são independentes e podem valer ao mesmo tempo — quem
 * desenha o modal decide o que dizer. Nenhum dos dois ligado significa que a
 * janela fecha calada, que é o caso comum.
 */
export interface MotivosDeFechar {
  /** a transmissão está no ar, e fechar apaga a tela do apresentador */
  noAr: boolean
  /** há mudança que não foi para o `.valendo` */
  naoSalvo: boolean
}

/**
 * O quadro que a página da rede local recebe.
 *
 * Só o necessário para desenhar a aba que está no ar — as outras abas não
 * viajam. `now` é o relógio do computador que transmite: o telefone de quem
 * assiste pode estar com a hora errada em minutos, e sem essa referência a
 * posição da leitura sairia completamente fora do lugar.
 */
export interface WebviewFrame {
  /** idioma da interface, para os avisos da página falarem a mesma língua */
  language: Lang
  /** o cartão no ar, para quem confere ver o que o apresentador vê */
  card: Cartao | null
  /** o interruptor "OVERLAY" — decide se o texto sobrepõe o cartão acima */
  cardOverlay: { enabled: boolean; style: CardOverlayStyle }
  blocks: Block[]
  appearance: Appearance
  transport: Transport
  rows: number[]
  viewport: { width: number; height: number } | null
  now: number
}

/** Estado do servidor da rede local, para a interface do operador mostrar. */
export interface WebviewInfo {
  running: boolean
  port: number
  /** endereços em que a página responde, prontos para digitar no telefone */
  addresses: string[]
  error: string | null
}

/** O que volta ao escolher uma imagem de cartão. Nulo quando o operador desistiu. */
export interface CardPickResult {
  /** nome do arquivo já copiado para a pasta do app */
  arquivo: string
  /** nome do arquivo de origem, sem extensão, como sugestão de nome */
  sugestao: string
}

/**
 * O que volta ao escolher um vídeo de cartão.
 *
 * Sem `arquivo`, ao contrário da imagem: o vídeo não é copiado para dentro do
 * app. O que viaja é onde ele mora — e escolher aqui é o que autoriza o app a
 * servir aquele arquivo.
 */
export interface CardVideoPickResult {
  caminho: string
  /** nome do arquivo com extensão, para o operador reconhecer no relink */
  arquivoNome: string
  /** nome sem extensão, como sugestão de nome do cartão */
  sugestao: string
  /**
   * Por que este arquivo não serve, quando não serve.
   *
   * O filtro da janela esconde os formatos que não tocam, mas quem digita o
   * nome à mão passa por ele. Sem uma recusa com motivo, o operador só
   * descobriria no ar, com uma tela preta.
   */
  erro?: string
}

export interface ImportResult {
  title: string
  text: string
  /** o que o operador precisa saber sobre a conversão, se houver algo */
  warnings: string[]
}

/**
 * O que volta ao soltar um arquivo na gaveta de cartões.
 *
 * Quem decide se o arquivo é imagem ou vídeo é o main, pela mesma lista de
 * extensões dos seletores — o renderer não carrega uma cópia dessa regra.
 * `recusado` traz o motivo: um arquivo que não é nem imagem nem vídeo não
 * pode sumir em silêncio depois de um gesto tão explícito quanto arrastar.
 */
export type CardDropResult =
  | { kind: 'image'; arquivo: string; sugestao: string }
  | { kind: 'video'; caminho: string; arquivoNome: string; sugestao: string }
  | { kind: 'recusado'; arquivoNome: string; erro: string }

/** Superfície exposta pelo preload. O renderer só conhece isto do processo main. */
export interface ValendoApi {
  platform: NodeJS.Platform
  getState(): Promise<StateSnapshot>
  dispatch(action: Action): void
  listDisplays(): Promise<DisplayInfo[]>
  identifyDisplays(): void
  /** abre o seletor de arquivo e devolve o roteiro já convertido e limpo */
  importDocument(): Promise<ImportResult | null>
  /**
   * Salva a aba ativa num arquivo. Com `saveAs`, sempre pergunta onde; sem ele,
   * regrava por cima do último arquivo desta aba e só pergunta na primeira vez.
   */
  exportDocument(saveAs: boolean): Promise<ExportResult | null>
  /**
   * Grava o programa inteiro num .valendo: abas, aparência, marcadores, ritmo.
   * Com `saveAs`, sempre pergunta onde; sem ele, regrava por cima do arquivo
   * já aberto (`projectPath`) e só pergunta se ainda não há um.
   */
  saveProject(saveAs?: boolean): Promise<ProjectResult | null>
  /** abre um .valendo e substitui o que está na tela */
  openProject(): Promise<ProjectResult | null>
  /** o projeto aberto tem mudança que não foi para o arquivo ainda? */
  projectIsDirty(): Promise<boolean>
  openExternal(url: string): void
  /** A escala com que esta janela nasceu — o main já a aplicou no construtor. */
  getZoom(): number
  /**
   * Escala a interface DESTA janela — texto, ícone, borda e respiro juntos,
   * como o zoom de um navegador — e grava a escolha para a próxima abertura.
   * Só a janela do operador chama: escalar a transmissão mudaria o corpo do
   * texto que o apresentador está lendo.
   */
  setZoom(factor: number): void
  /** a transmissão está por cima da janela do operador? */
  coversOperator(): Promise<boolean>
  onState(callback: (snapshot: StateSnapshot) => void): () => void
  onDisplays(callback: (displays: DisplayInfo[]) => void): () => void
  /**
   * O main pediu confirmação antes de fechar, e diz POR QUÊ — a transmissão
   * está no ar, há mudança não salva, ou os dois. Substitui o diálogo nativo
   * do sistema por um modal do próprio app.
   */
  onConfirmClose(callback: (motivos: MotivosDeFechar) => void): () => void
  /** resposta ao pedido acima — confirma que pode fechar, ou cancela. */
  respondToClose(confirmed: boolean): void
  /** abre o seletor de imagem e já copia o arquivo para dentro do app */
  pickCardImage(cardId: string): Promise<CardPickResult | null>
  /**
   * Abre o seletor de vídeo. Não copia nada — devolve onde o arquivo está e
   * autoriza o app a servi-lo. Serve tanto para subir quanto para relinkar.
   */
  pickCardVideo(cardId: string): Promise<CardVideoPickResult | null>
  /**
   * O caminho real de um arquivo solto na janela. `File.path` não existe mais
   * no Chromium — só o preload consegue perguntar isso ao Electron.
   */
  pathForFile(file: File): string
  /**
   * Importa um arquivo solto na gaveta: a segunda porta de entrada de cartão,
   * ao lado dos seletores — e igualmente um gesto explícito do operador.
   * Imagem é copiada para dentro do app; vídeo é autorizado onde está.
   */
  importCardPath(cardId: string, caminho: string): Promise<CardDropResult | null>
  /**
   * Pede a conversão do vídeo deste cartão.
   *
   * Só depois de o `<video>` ter falhado: a extensão não decide nada, porque
   * muito `.mov` já toca direto.
   */
  convertCardVideo(cardId: string): Promise<CardConvertResult>
  /**
   * Andamento da conversão.
   *
   * Trocar a embalagem leva segundos; recodificar leva perto do tempo do
   * próprio vídeo. A tela precisa distinguir as duas, senão uma espera de
   * minutos parece o app travado.
   */
  onCardConvert(callback: (info: CardConvertProgress | null) => void): () => void
}

/** O que volta ao pedir a conversão de um vídeo que a janela não tocou. */
export interface CardConvertResult {
  /** nome da cópia tocável gerada dentro do app */
  convertido?: string
  erro?: string
}

export interface CardConvertProgress {
  arquivoNome: string
  /** 0 a 1, ou nulo enquanto a duração do arquivo não é conhecida */
  fracao: number | null
  recodificando: boolean
}
