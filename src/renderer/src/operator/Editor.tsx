import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import type { AjudaId } from '@shared/ajuda'
import { insertBlock, type InsertKind } from '@shared/insertBlock'
import { coresDasLinhas, ehDeixa, type LinhaPintavel } from '@shared/apresentadores'
import { blocksFromText, caretFromAnchor, marcasNoTexto, serializeBlocks, stripFormatting } from '@shared/text'
import { edicaoEntre, marcasDaFatia, remapearMarcas, type Marca } from '@shared/marcas'
import {
  achadosParaPintar,
  acharTodas,
  faixasDepoisDeTrocar,
  indiceDaProxima,
  type Ocorrencia
} from '@shared/busca'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'
import { SeletorDeCor } from '../ui/SeletorDeCor'
import type { Anchor, Apresentador, BlockKind, Tab } from '@shared/types'

const TYPE_SETTINGS: React.CSSProperties = {
  margin: 0,
  border: 'none',
  padding: '14px 16px',
  fontFamily: '"Cascadia Mono", "SF Mono", Consolas, monospace',
  lineHeight: 1.75,
  letterSpacing: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  tabSize: 2
}

/**
 * Quanto tempo o editor fica só seu depois de você mexer nele.
 *
 * Rolar para ler adiante, ou digitar, desliga o acompanhamento por este tempo.
 * Sem isso, o "seguir a leitura" puxaria a tela de volta a cada palavra e
 * consultar um trecho mais abaixo viraria impossível — o recurso brigaria com
 * o próprio operador.
 */
const RESPEITO_MS = 4_000

/** Onde a marca da leitura fica, em coordenadas do conteúdo (não da tela). */
interface MarcaDaLeitura {
  top: number
  height: number
}

/**
 * O retângulo do caractere `posicao` dentro do `<pre>` colorido.
 *
 * Um `Range` sobre os nós de texto: é o próprio navegador respondendo onde
 * aquela letra foi parar depois de quebrar linha, com a fonte e a largura
 * reais. Qualquer conta nossa (linha × altura) erraria em parágrafo que
 * envolve, que é o caso comum num roteiro.
 *
 * Devolve em coordenadas do CONTEÚDO — já somado o scroll —, para a marca não
 * precisar ser recalculada a cada rolagem.
 */
function retanguloDoTexto(pre: HTMLPreElement, posicao: number): MarcaDaLeitura | null {
  const caminhante = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
  let percorrido = 0
  let no = caminhante.nextNode() as Text | null
  while (no) {
    const fim = percorrido + no.length
    if (posicao <= fim) {
      const range = document.createRange()
      const dentro = Math.max(0, Math.min(no.length, posicao - percorrido))
      range.setStart(no, dentro)
      // um range vazio não tem retângulo em todo navegador; um caractere de
      // largura sempre tem
      range.setEnd(no, Math.min(no.length, dentro + 1))
      const caixa = range.getBoundingClientRect()
      const molde = pre.getBoundingClientRect()
      if (caixa.height === 0) return null
      return { top: caixa.top - molde.top + pre.scrollTop, height: caixa.height }
    }
    percorrido = fim
    no = caminhante.nextNode() as Text | null
  }
  return null
}

/**
 * A marca desenhada no editor — sem encostar na LARGURA de um só glifo.
 *
 * Aqui não vale o que vale na transmissão. O editor é uma ilusão: um
 * `textarea` transparente por cima de um `<pre>` colorido, alinhados
 * caractere a caractere. Negrito e itálico de verdade mudam a largura das
 * letras; o `<pre>` passaria a quebrar linha num lugar e o `textarea` noutro,
 * e o cursor cairia ao lado da letra que se está vendo — num roteiro no ar.
 *
 * Então cada atributo vira um sinal que a fonte não sente:
 *
 *   negrito     sombra de meio pixel — engorda o traço sem ocupar espaço
 *   itálico     traço ondulado embaixo
 *   sublinhado  traço reto embaixo
 *   cor         a cor mesmo
 *
 * A sombra é pintura pura: não entra no cálculo de layout, então o negrito
 * aqui parece negrito e continua medindo exatamente o mesmo. Itálico é o
 * único que não tem equivalente honesto — inclinar exigiria `inline-block`, e
 * isso mudaria a quebra —, então ele vira um traço com cara própria.
 *
 * Itálico E sublinhado juntos saem como um traço só, o ondulado: são duas
 * linhas no mesmo lugar e o CSS só desenha um estilo por vez. É combinação
 * rara, e as duas continuam aparecendo inteiras na Transmissão, que é onde a
 * marca vale de verdade. O editor aqui é lembrete, não prova.
 */
function pedacosDaLinha(texto: string, marcas: Marca[]): React.ReactNode[] {
  /* as fronteiras de todas as marcas, em ordem e sem repetir: entre duas
     fronteiras o estilo é constante, e cada intervalo vira um span */
  const cortes = [...new Set([0, texto.length, ...marcas.flatMap((m) => [m.de, m.ate])])]
    .filter((n) => n >= 0 && n <= texto.length)
    .sort((a, b) => a - b)

  const fora: React.ReactNode[] = []
  for (let i = 0; i < cortes.length - 1; i++) {
    const [de, ate] = [cortes[i], cortes[i + 1]]
    if (ate <= de) continue
    const pedaco = texto.slice(de, ate)
    // as que cobrem este intervalo; a última ganha, como na transmissão
    const cobrem = marcas.filter((m) => m.de <= de && m.ate >= ate)
    if (cobrem.length === 0) {
      fora.push(pedaco)
      continue
    }
    const cor = cobrem.filter((m) => m.cor).at(-1)?.cor
    const negrito = cobrem.some((m) => m.negrito)
    const italico = cobrem.some((m) => m.italico)
    const sublinhado = cobrem.some((m) => m.sublinhado)
    if (!cor && !negrito && !italico && !sublinhado) {
      fora.push(pedaco)
      continue
    }
    fora.push(
      <span
        key={de}
        data-marca
        style={{
          ...(cor ? { color: cor } : {}),
          ...(negrito ? { textShadow: '0.45px 0 0 currentColor' } : {}),
          ...(italico || sublinhado
            ? {
                textDecorationLine: 'underline',
                textDecorationStyle: italico ? ('wavy' as const) : ('solid' as const),
                textUnderlineOffset: '0.18em',
                textDecorationThickness: italico ? '1px' : '2px'
              }
            : {})
        }}
      >
        {pedaco}
      </span>
    )
  }
  return fora
}

export interface CaixaDoAchado {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Os retângulos de VÁRIOS trechos, numa varredura só.
 *
 * Irmão de `retanguloDoTexto`, e pelo mesmo motivo: quem responde onde o texto
 * caiu é o navegador, sobre o `<pre>` colorido que tem a fonte e a quebra
 * reais. A diferença é que aqui o `Range` cobre o achado inteiro, e não um
 * caractere — a marca de leitura é uma faixa de linha porque marca ONDE a
 * leitura está; o achado precisa cercar a PALAVRA, senão procurar num
 * parágrafo denso devolve uma faixa que não diz qual das dez palavras é.
 *
 * Plural de propósito: com o FIND ALL ligado, um roteiro de meia hora pode ter
 * duzentas ocorrências, e medir uma por vez percorreria o texto inteiro
 * duzentas vezes. Como os trechos chegam em ordem, uma passagem só resolve
 * todos — e a lista sai na MESMA ordem que entrou, com `null` onde não deu
 * para medir.
 *
 * Achado que envolve para a linha de baixo devolve a união dos dois pedaços —
 * uma caixa larga demais. É raro (termo de busca é curto) e o estrago é
 * cosmético, então não vale o preço de desenhar dois retângulos.
 */
function caixasDeTrechos(pre: HTMLPreElement, trechos: Ocorrencia[]): (CaixaDoAchado | null)[] {
  const fora: (CaixaDoAchado | null)[] = trechos.map(() => null)
  if (trechos.length === 0) return fora

  const molde = pre.getBoundingClientRect()
  const caminhante = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let percorrido = 0
  let no = caminhante.nextNode() as Text | null
  let alvo = 0
  let noInicio: Text | null = null
  let dentroInicio = 0

  while (no && alvo < trechos.length) {
    const acaba = percorrido + no.length

    // um nó pode conter o começo de um trecho, o fim de outro, ou vários
    // inteiros — daí o `while` de dentro
    for (;;) {
      if (alvo >= trechos.length) break
      const { inicio, fim } = trechos[alvo]
      if (!noInicio) {
        if (inicio > acaba) break
        noInicio = no
        dentroInicio = Math.max(0, Math.min(no.length, inicio - percorrido))
      }
      if (fim > acaba) break

      range.setStart(noInicio, dentroInicio)
      range.setEnd(no, Math.max(0, Math.min(no.length, fim - percorrido)))
      const caixa = range.getBoundingClientRect()
      fora[alvo] =
        caixa.height === 0
          ? null
          : {
              top: caixa.top - molde.top + pre.scrollTop,
              left: caixa.left - molde.left,
              width: caixa.width,
              height: caixa.height
            }
      noInicio = null
      alvo += 1
    }

    percorrido = acaba
    no = caminhante.nextNode() as Text | null
  }
  return fora
}

/** A pele das duas caixas de texto da barra. */
const CAMPO =
  'h-[23px] rounded border border-[var(--color-edge)] bg-[var(--color-ink-0)] px-1.5 font-mono text-[11.5px] text-[var(--color-fog-0)] outline-none'

/**
 * Quinze caracteres, e a conta é literal.
 *
 * `ch` é a largura do algarismo zero da fonte do próprio elemento — e como o
 * campo é monoespaçado, quinze `ch` são quinze caracteres, não uma estimativa.
 * A fonte mono também é a do editor: o que se digita aqui é texto de roteiro,
 * e vê-lo na mesma letra ajuda a reconhecê-lo.
 */
const LARGURA_DO_CAMPO: React.CSSProperties = {
  /* os 14px são o que o `box-sizing: border-box` come: 6px de respiro de cada
     lado mais 1px de borda. Sem eles cabiam 13 caracteres, não 15 — e a
     diferença só apareceu porque o script mediu em vez de acreditar */
  width: 'calc(15ch + 14px)'
}

/**
 * Uma etapa da barra: a caixinha que a liga, o rótulo, e o que ela controla.
 *
 * A caixinha é o que resolve a confusão do desenho antigo. Lá havia três
 * linhas de teclas parecidas e nenhuma dizia sobre o que agia; aqui o operador
 * MARCA o que quer que aconteça, lê em português o que é, e há um botão só que
 * faz. Desmarcar não apaga o que estava digitado — só esmaece.
 */
function Passo({
  marca,
  ligado,
  rotulo,
  onToggle,
  children
}: {
  marca: string
  ligado: boolean
  rotulo: string
  onToggle: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        {...{ [`data-${marca}`]: '' }}
        role="switch"
        aria-checked={ligado}
        aria-label={rotulo}
        title={rotulo}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        /* NEUTRA de propósito, e o ✓ em branco. Uma caixinha verde ao lado de
           uma bolinha de cor escolhida pelo operador viravam duas cores
           disputando o olho na mesma linha — e só uma delas significa alguma
           coisa sobre o roteiro */
        className={`grid h-[13px] w-[13px] flex-none place-items-center rounded-[3px] border text-[9px] leading-none ${
          ligado
            ? 'border-[var(--color-fog-1)] bg-[var(--color-ink-4)] text-[var(--color-fog-0)]'
            : 'border-[var(--color-fog-3)] text-transparent hover:border-[var(--color-fog-1)]'
        }`}
      >
        ✓
      </button>
      <span
        className={`w-[52px] flex-none text-[9px] leading-tight tracking-[0.08em] uppercase ${
          ligado ? 'text-[var(--color-fog-1)]' : 'text-[var(--color-fog-3)]'
        }`}
      >
        {rotulo}
      </span>
      {children}
    </div>
  )
}

/**
 * O botão que AGE — e é o único da barra.
 *
 * Em relevo, e o par não é "duas ações": é a mesma ação, aqui ou em todas. O
 * destaque verde marca o gesto mais comum, que é o daqui.
 */
function TeclaDeAplicar({
  marca,
  rotulo,
  desligado,
  destaque,
  cor,
  onClick,
  children
}: {
  marca: string
  rotulo: string
  desligado?: boolean
  destaque?: boolean
  /**
   * A cor que a barra vai pintar, quando há uma.
   *
   * O botão veste a cor escolhida: antes de clicar, ele já mostra o que vai
   * sair. É a mesma ideia da tecla de play, que é verde porque o que ela faz
   * é verde — e aqui a cor não é decoração, é o resultado.
   */
  cor?: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const tom = cor ?? (destaque ? 'var(--color-go)' : null)
  return (
    <button
      type="button"
      {...{ [`data-busca-${marca}`]: '' }}
      title={rotulo}
      aria-label={rotulo}
      disabled={desligado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-[23px] flex-1 rounded border px-2 text-[9px] font-bold tracking-[0.08em] uppercase disabled:opacity-30"
      style={
        tom
          ? {
              borderColor: `color-mix(in srgb, ${tom} 28%, #000)`,
              background: `linear-gradient(color-mix(in srgb, ${tom} 26%, #232327), color-mix(in srgb, ${tom} 12%, #1c1c1f))`,
              color: `color-mix(in srgb, ${tom} 70%, white)`
            }
          : {
              borderColor: 'var(--color-edge)',
              background: 'linear-gradient(#2a2a2f,#1c1c1f)',
              color: 'var(--color-fog-1)'
            }
      }
    >
      {children}
    </button>
  )
}

/**
 * Um interruptor da barra de busca — ALL e SPEECH.
 *
 * Chapado de propósito, ao contrário das teclas que AGEM. É a diferença que a
 * barra inteira comunica sem uma palavra: relevo faz alguma coisa acontecer
 * agora, chapado só muda o que a próxima tecla vai fazer. Sem essa separação
 * as seis casas da direita liam como seis botões iguais, e o operador
 * descobriria o que cada um faz apertando — no ar.
 */
function Interruptor({
  marca,
  ajudaId,
  rotulo,
  aceso,
  desligado,
  onClick,
  className = 'w-full',
  children
}: {
  marca: string
  ajudaId: AjudaId
  rotulo: string
  aceso: boolean
  desligado?: boolean
  onClick: () => void
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      {...{ [`data-${marca}`]: '' }}
      {...ajuda(ajudaId)}
      title={rotulo}
      aria-pressed={aceso}
      disabled={desligado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-[23px] flex-none rounded text-[8px] font-bold tracking-[0.06em] disabled:opacity-30 ${className} ${
        aceso
          ? 'bg-[var(--color-warn)] text-[#201a06]'
          : 'border border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
      }`}
    >
      {children}
    </button>
  )
}

/** As teclinhas que AGEM na barra de busca: andar, trocar, pintar. */
function BotaoDeBusca({
  marca,
  rotulo,
  desligado,
  onClick,
  children
}: {
  marca: string
  rotulo: string
  desligado?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      {...{ [`data-busca-${marca}`]: '' }}
      title={rotulo}
      aria-label={rotulo}
      disabled={desligado}
      /* o foco NUNCA sai do campo: clicar numa seta e perder o cursor de
         digitação obrigaria a clicar de volta a cada salto */
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-6 w-6 flex-none rounded border border-[var(--color-edge)] text-[12px] leading-none text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)] disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

interface Props {
  tab: Tab
  /** tamanho da fonte do textarea editável — não é a fonte da SAÍDA, só de digitar */
  fontSize: number
  dispatch: (action: Action) => void
  /**
   * O cursor mudou de lugar — clique, seta, ou a digitação também empurra o
   * cursor. Quem usa é o CATCH: com ele ligado, cada aviso destes dispara um
   * "Go To" automático. Sem ouvinte, não custa nada além do evento em si.
   */
  onCaretMove?: () => void
  /** quem fala este roteiro — pinta o editor com a mesma regra da transmissão */
  apresentadores: Apresentador[]
  /**
   * Há texto digitado que ainda não chegou ao main (o respiro de 140ms).
   *
   * Quem usa é o botão DESFAZER: ele acende por `history.canUndo`, que vem do
   * main — e nessa janela de 140ms o main ainda não sabe da digitação, então o
   * botão ficava DESABILITADO justo no instante em que o operador acabou de
   * escrever e vai desfazer. O clique não fazia nada nem dava sinal; o
   * segundo, já depois do respiro, funcionava. Daí a impressão de "preciso
   * clicar duas vezes".
   */
  onPendenteChange?: (pendente: boolean) => void
  /** ALL CAPS: só a PINTURA do editor, o texto guardado não muda */
  allCaps?: boolean
  /** a mesma roda de quatro cores do cabeçalho — uma caixa de tintas só no app inteiro */
  coresRecentes: string[]
}

export interface EditorHandle {
  /**
   * Mostra no editor a palavra que a transmissão está lendo — rola até ela e
   * a marca. Nunca mexe no cursor: ver onde a leitura está não pode custar o
   * ponto onde a mão estava.
   */
  mostrarAncora: (anchor: Anchor, opcoes?: { comCursor?: boolean }) => void
  /** apaga a marca — ao desligar o acompanhamento */
  limparMarca: () => void
  /** manda agora, sem esperar o debounce, o que ainda estiver pendente. */
  flush: () => void
  /** insere capítulo ou direção no cursor, já com o miolo selecionado. */
  insert: (kind: InsertKind) => void
  /** tira a marcação do roteiro inteiro: sem capítulos, sem direções. */
  removerFormatacao: () => void
  /**
   * Onde a seleção começa e termina, no texto inteiro — `null` se nada.
   *
   * Irmã de `selecao()`, que devolve o TEXTO. Quem pinta precisa da faixa: a
   * marca é guardada por posição, não por conteúdo, senão pintar "ação"
   * pintaria todas as "ação" do roteiro em vez daquela.
   */
  selecaoFaixa: () => { de: number; ate: number } | null
  /** abre a busca no editor, semeada com o que estiver selecionado (Ctrl+F). */
  abrirBusca: () => void
  /** o texto atual do rascunho e onde o cursor está nele — para o "Go To". */
  caret: () => { text: string; position: number }
  /**
   * O que está selecionado agora, sem espaço nas pontas — vazio se nada.
   *
   * É por aqui que nasce um apresentador: o operador seleciona o nome que já
   * está escrito no roteiro e clica no botão. Nada é digitado duas vezes, e o
   * texto do roteiro não muda uma letra.
   */
  selecao: () => string
}

/**
 * Editor com realce por trás de um textarea de texto transparente.
 *
 * O parágrafo em [colchetes] e o título de capítulo precisam se distinguir num
 * relance, mas o operador não pode perder o comportamento nativo de digitação
 * — cursor, seleção, teclado do sistema. Um textarea transparente sobre um
 * `pre` colorido dá as duas coisas.
 */
export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { tab, fontSize, apresentadores, dispatch, onCaretMove, onPendenteChange, allCaps, coresRecentes },
  ref
) {
  const { t } = useT()
  const incoming = useMemo(() => serializeBlocks(tab.blocks), [tab.blocks])
  const [draft, setDraft] = useState(incoming)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  /** onde desenhar a marca da leitura, ou nada quando não se está seguindo */
  const [marca, setMarca] = useState<MarcaDaLeitura | null>(null)
  /** quando o operador mexeu no editor pela última vez — ver `RESPEITO_MS` */
  const ultimoToque = useRef(0)
  /** a rolagem de agora, só para reposicionar a marca na tela */
  const [rolagem, setRolagem] = useState(0)
  const lastSent = useRef(incoming)
  /**
   * A forma normalizada do que mandamos.
   *
   * O modelo de blocos descarta espaço em branco de sobra: "abc\n" volta do
   * main como "abc". Sem reconhecer isso como eco da própria digitação, o
   * editor adotava a versão normalizada e recuava o cursor — era o Enter que
   * parecia não funcionar.
   */
  const lastSentNormalized = useRef(incoming)
  const lastKey = useRef(`${tab.id}:${tab.rev}`)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingValue = useRef<string | null>(null)

  /** avisa o pai só na TROCA de estado, para não re-renderizar a cada tecla */
  const pendente = useRef(false)
  const avisarPendente = useRef<(v: boolean) => void>(() => {})
  avisarPendente.current = (v: boolean): void => {
    if (pendente.current === v) return
    pendente.current = v
    onPendenteChange?.(v)
  }

  // adota o texto do main sempre que a aba ou a revisão dela mudar — assim o
  // desfazer, o refazer e a troca de aba entram na hora. O gatilho é
  // `id:rev`, não o texto: quando desfazer volta o documento para um texto
  // IGUAL ao de antes de uma edição recente (ex.: digitar e desfazer em
  // seguida), o React chega a lotear as duas atualizações juntas e nunca
  // renderiza o estado intermediário — da perspectiva dele, o texto "não
  // mudou" porque a string bate com a de antes. `rev` só sobe e nunca repete
  // valor dentro da mesma aba, então o efeito sempre roda quando precisa.
  useEffect(() => {
    const key = `${tab.id}:${tab.rev}`
    if (key === lastKey.current) return
    lastKey.current = key

    // eco da nossa própria digitação: não reposiciona o cursor. Vale tanto
    // para o texto igual ao que mandamos quanto para a normalização dele
    if (incoming === lastSent.current || incoming === lastSentNormalized.current) return
    lastSent.current = incoming
    lastSentNormalized.current = incoming

    // uma mudança externa (desfazer, refazer, troca de aba) chegou enquanto
    // uma digitação ainda esperava os 140ms de debounce para ser enviada.
    // Sem cancelar esse envio pendente, ele dispara logo depois e manda o
    // texto antigo de volta por cima da mudança que acabou de chegar.
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      pendingValue.current = null
      avisarPendente.current(false)
    }

    const caret = areaRef.current?.selectionStart ?? 0
    setDraft(incoming)
    requestAnimationFrame(() => {
      const area = areaRef.current
      if (!area) return
      const position = Math.min(caret, incoming.length)
      area.setSelectionRange(position, position)
    })
  }, [tab.id, tab.rev, incoming])

  /**
   * O envio pendente não morre com o editor.
   *
   * Trocar de modo desmonta este componente — e antes disto a limpeza só
   * cancelava o temporizador do respiro de 140 ms, jogando fora o que ainda
   * não tinha sido mandado. Quem digitasse a última frase e fosse direto para
   * o Foco ou para a Mesa perderia justamente essas palavras. O envio vai por
   * uma referência sempre atual, senão a limpeza mandaria o texto para a aba
   * que estava aberta na primeira renderização.
   */
  const enviarAgora = useRef<(value: string) => void>(() => {})
  useEffect(() => {
    return () => {
      if (!timer.current) return
      clearTimeout(timer.current)
      if (pendingValue.current !== null) enviarAgora.current(pendingValue.current)
    }
  }, [])

  const send = (value: string): void => {
    lastSent.current = value
    lastSentNormalized.current = serializeBlocks(blocksFromText(value))
    dispatch({ type: 'text/set', tabId: tab.id, text: value })
  }

  // mantida atual a cada renderização, para a limpeza acima nunca mandar o
  // texto para a aba errada
  enviarAgora.current = send

  const push = (value: string, delay: number): void => {
    pendingValue.current = value
    avisarPendente.current(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      pendingValue.current = null
      avisarPendente.current(false)
      send(value)
    }, delay)
  }

  /**
   * Manda agora o que estiver esperando o debounce, sem esperar.
   *
   * Sem isso, desfazer logo depois de digitar reverte o histórico ANTES da
   * digitação mais recente ter chegado até ele — o desfazer acaba pegando um
   * passo mais antigo do que o esperado, e o que você acabou de escrever some
   * junto, mesmo sem ter sido o alvo do desfazer.
   */
  const flush = useCallback((): void => {
    if (timer.current === null) return
    clearTimeout(timer.current)
    timer.current = null
    const value = pendingValue.current
    pendingValue.current = null
    avisarPendente.current(false)
    if (value !== null) send(value)
  }, [tab.id, dispatch])

  /**
   * Guarda a rolagem do editor e devolve quem a repõe.
   *
   * Trocar o `value` do textarea zera o `scrollTop` — e os botões da barra
   * substituem o TEXTO INTEIRO, que é justamente o que os faz entrar no
   * histórico como um passo só. O efeito era o editor saltar para o começo
   * do roteiro a cada capítulo ou direção inserida, a cem linhas de onde o
   * operador estava.
   *
   * Digitando `##` ou `[` na mão isso nunca aconteceu, e a diferença é essa:
   * ali o valor cresce mas o nó do DOM é o mesmo, então a rolagem fica.
   *
   * O `<pre>` do realce é reposicionado junto — ele fica ATRÁS do textarea e
   * as duas rolagens andam casadas; repor só uma descolaria o colorido do
   * texto até a próxima rolagem manual.
   */
  const preservarRolagem = useCallback((): (() => void) => {
    const antes = areaRef.current?.scrollTop ?? 0
    return () => {
      if (areaRef.current) areaRef.current.scrollTop = antes
      if (preRef.current) preRef.current.scrollTop = antes
      setRolagem(antes)
    }
  }, [])

  /**
   * O botão da barra tira o foco do textarea antes do clique, mas o textarea
   * guarda a última seleção mesmo desfocado — então a inserção cai no ponto
   * onde o cursor estava, e o foco volta logo em seguida.
   */
  const insert = useCallback(
    (kind: InsertKind): void => {
      const area = areaRef.current
      if (!area) return

      const repor = preservarRolagem()
      const result = insertBlock(area.value, area.selectionStart, area.selectionEnd, kind)
      setDraft(result.text)
      push(result.text, 0)

      requestAnimationFrame(() => {
        // `preventScroll` para o foco não arrastar a página atrás do editor;
        // a rolagem de dentro é o `repor` quem devolve
        area.focus({ preventScroll: true })
        area.setSelectionRange(result.selectionStart, result.selectionEnd)
        repor()
      })
    },
    [preservarRolagem, tab.id, dispatch]
  )

  /**
   * Age sobre o RASCUNHO, não sobre os blocos do main.
   *
   * O que está na tela pode estar até 140ms à frente do que o main conhece —
   * limpar a partir dos blocos jogaria fora a última frase digitada. Sai daqui
   * pelo mesmo caminho de uma inserção, então entra no histórico como um passo
   * só e o Mod+Z devolve o roteiro marcado inteiro.
   */
  const removerFormatacao = useCallback((): void => {
    const area = areaRef.current
    const atual = area?.value ?? draft
    const limpo = stripFormatting(atual)
    if (limpo === atual) return

    const caret = Math.min(area?.selectionStart ?? 0, limpo.length)
    const repor = preservarRolagem()
    setDraft(limpo)
    push(limpo, 0)

    requestAnimationFrame(() => {
      if (!area) return
      area.focus({ preventScroll: true })
      area.setSelectionRange(caret, caret)
      repor()
    })
  }, [draft, preservarRolagem, tab.id, dispatch])

  const caret = useCallback(
    () => ({ text: draft, position: areaRef.current?.selectionStart ?? 0 }),
    [draft]
  )

  const selecao = useCallback((): string => {
    const area = areaRef.current
    if (!area) return ''
    return draft.slice(area.selectionStart, area.selectionEnd).trim()
  }, [draft])

  /**
   * Mostra no editor a palavra que a transmissão está lendo — o caminho de
   * volta do "Go To".
   *
   * NÃO mexe no cursor, de propósito. Mover o caret enquanto a leitura corre
   * roubaria o ponto de digitação de quem está corrigindo um trecho mais
   * abaixo, e a letra seguinte cairia noutro lugar. O que ela faz é rolar e
   * marcar — o operador vê onde a leitura está sem perder onde a mão estava.
   *
   * A medida sai do `<pre>` colorido, não de uma conta: ele tem a mesma fonte
   * e quebra nos mesmos pontos que o textarea, então um `Range` sobre o texto
   * dele devolve o retângulo exato do caractere — inclusive em que linha
   * VISUAL de um parágrafo longo ele caiu, que nenhuma conta por índice de
   * linha daria.
   */
  const mostrarAncora = useCallback(
    (anchor: Anchor, opcoes?: { comCursor?: boolean }): void => {
      const area = areaRef.current
      const pre = preRef.current
      if (!area || !pre) return

      /*
       * Cede a vez a quem está usando o editor — mas só o acompanhamento
       * automático.
       *
       * `comCursor` é o clique no "Go To" da Transmissão: alguém PEDIU para ir
       * até a leitura, então respeitar o respiro seria recusar o que foi
       * mandado. É também o jeito de voltar para a leitura sem esperar os
       * quatro segundos.
       */
      if (!opcoes?.comCursor && Date.now() - ultimoToque.current < RESPEITO_MS) return

      const posicao = caretFromAnchor(tab.blocks, draft, anchor)
      if (posicao === null) return setMarca(null)

      const alvo = retanguloDoTexto(pre, posicao)
      if (!alvo) return setMarca(null)

      setMarca(alvo)

      /*
       * Só rola quando a marca sai da faixa confortável (o miolo da caixa).
       *
       * Rolando para centralizar a cada palavra, o texto ficaria em movimento
       * perpétuo debaixo do olho de quem lê. Assim ele fica parado enquanto a
       * leitura atravessa a tela, e dá um salto só quando ela chega perto da
       * borda.
       */
      const altura = area.clientHeight
      const relativo = alvo.top - area.scrollTop
      const jaVisivel = relativo >= altura * 0.15 && relativo <= altura * 0.75
      if (!jaVisivel) {
        area.scrollTop = Math.max(0, alvo.top - altura * 0.35)
        pre.scrollTop = area.scrollTop
        setRolagem(area.scrollTop)
      }

      // o cursor só se move a pedido — e aí o foco vai junto, senão a próxima
      // tecla digitada não cairia no lugar para onde a pessoa acabou de olhar
      if (opcoes?.comCursor) {
        area.focus()
        area.setSelectionRange(posicao, posicao)
        ultimoToque.current = 0
      }
    },
    [draft, tab.blocks]
  )

  /* ------------------------------------------------------------------ busca */

  /**
   * Procurar no roteiro sem tirar o dedo do lugar.
   *
   * Duas decisões que valem mais que o recurso em si:
   *
   * 1. O foco NUNCA sai do campo de busca. Um `setSelectionRange` no textarea
   *    exigiria focá-lo, e aí a próxima letra digitada iria para o roteiro em
   *    vez de para a busca. Por isso o achado é desenhado por nós, com o mesmo
   *    mecanismo da marca de leitura — e de quebra ele aparece mesmo com o
   *    textarea sem foco, coisa que a seleção nativa não faz.
   *
   * 2. Procurar segura o acompanhamento automático (`ultimoToque`). Sem isso, a
   *    leitura correndo puxaria a tela de volta um segundo depois de cada salto,
   *    e o operador ficaria brigando com o próprio app para ler o que achou.
   *    Procurar mexe na tela, NUNCA na posição de leitura: quem está no ar não
   *    sente nada.
   */
  const [busca, setBusca] = useState<string | null>(null)
  const [troca, setTroca] = useState('')
  const [atual, setAtual] = useState(0)
  const [achado, setAchado] = useState<CaixaDoAchado | null>(null)
  /** FIND ALL: as caixas de TODAS as ocorrências, medidas de uma vez */
  const [todas, setTodas] = useState(false)
  /**
   * A cor escolhida na barra — `null` é a bolinha pontilhada, que TIRA a marca
   * em vez de trocá-la, e `undefined` é "ainda não escolhi".
   */
  const [corDaBusca, setCorDaBusca] = useState<string | null | undefined>(undefined)
  /**
   * As duas caixinhas: o que o botão de aplicar vai fazer.
   *
   * São o coração do desenho novo. Antes havia três linhas com seis teclas
   * parecidas, e nenhuma dizia sobre o que agia; agora as caixinhas dizem o
   * que está em jogo e existe UM lugar que age. Marcadas as duas, trocar e
   * pintar acontecem no mesmo clique — o encadeamento que antes era impossível.
   *
   * Trocar nasce marcada porque é o que quem abre a segunda linha veio fazer;
   * pintar nasce desmarcada porque ainda não há cor escolhida.
   */
  const [trocarLigado, setTrocarLigado] = useState(true)
  const [pintarLigado, setPintarLigado] = useState(false)
  /**
   * SPEECH: pintar todas atropela as falas que já têm cor de apresentador?
   *
   * Nasce DESLIGADO — pula. A cor do apresentador é um sistema, e quem lê a
   * tela associou aquela cor àquela pessoa; uma varredura que desmancha isso
   * num clique, sem aviso, é o tipo de coisa que se descobre no ar.
   */
  const [sobrescrever, setSobrescrever] = useState(false)
  const [caixas, setCaixas] = useState<(CaixaDoAchado | null)[]>([])
  const campoBusca = useRef<HTMLInputElement>(null)

  const ocorrencias = useMemo(() => (busca === null ? [] : acharTodas(draft, busca)), [draft, busca])

  const irParaAchado = useCallback(
    (indice: number): void => {
      const area = areaRef.current
      const pre = preRef.current
      const alvo = ocorrencias[indice]
      if (!area || !pre || !alvo) return setAchado(null)

      setAtual(indice)
      // o acompanhamento sai da frente: quem procura está olhando para outro
      // ponto do texto, e ser puxado de volta seria o app discordando da mão
      ultimoToque.current = Date.now()

      const [caixa] = caixasDeTrechos(pre, [alvo])
      setAchado(caixa)
      if (!caixa) return

      const altura = area.clientHeight
      const relativo = caixa.top - area.scrollTop
      if (relativo < altura * 0.12 || relativo > altura * 0.78) {
        area.scrollTop = Math.max(0, caixa.top - altura * 0.35)
        pre.scrollTop = area.scrollTop
        setRolagem(area.scrollTop)
      }
    },
    [ocorrencias]
  )

  /* a cada tecla no campo, cai na primeira ocorrência a partir de onde o cursor
     estava — e não sempre na primeira do texto, que faria a busca ignorar onde
     a pessoa está trabalhando */
  useEffect(() => {
    if (busca === null) return
    if (ocorrencias.length === 0) return setAchado(null)
    const de = areaRef.current?.selectionStart ?? 0
    irParaAchado(Math.max(0, indiceDaProxima(ocorrencias, de)))
    // de propósito só quando a lista muda: andar entre ocorrências é trabalho
    // do Enter e das setas, não deste efeito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocorrencias])

  const andar = (paraTras: boolean): void => {
    if (ocorrencias.length === 0) return
    const daqui = ocorrencias[atual]
    const de = daqui ? (paraTras ? daqui.inicio : daqui.inicio + 1) : 0
    irParaAchado(indiceDaProxima(ocorrencias, de, paraTras))
  }

  /*
   * As caixas do FIND ALL.
   *
   * Refeitas quando a lista muda, quando o interruptor liga, e quando o corpo
   * da fonte muda — os três casos em que o texto se recompõe por baixo. A
   * ROLAGEM não entra: as caixas vêm em coordenadas do conteúdo, e quem traz
   * para a tela é o `- rolagem` do desenho.
   */
  useEffect(() => {
    const pre = preRef.current
    if (!todas || busca === null || !pre) return setCaixas([])
    setCaixas(caixasDeTrechos(pre, ocorrencias))
  }, [todas, busca, ocorrencias, fontSize])

  /**
   * Trocar uma ocorrência, ou todas.
   *
   * De trás para a frente, e é o detalhe que faz funcionar: trocando do fim
   * para o começo, os índices das ocorrências ainda não visitadas continuam
   * valendo. Do começo para o fim, a primeira troca já deslocaria todas as
   * outras — e um termo de tamanho diferente do substituto faria a segunda
   * troca cair no lugar errado.
   *
   * "Trocar todas" sai daqui como UM texto novo, e não como trinta edições:
   * são trinta trocas e um único passo de desfazer, que é o que a mão espera
   * de um comando chamado "todas".
   */
  /**
   * O que o botão de aplicar vai fazer, dado o que está marcado e preenchido.
   *
   * Existe para o botão poder ficar APAGADO quando não faria nada. Um botão
   * que aceita o clique e não muda coisa alguma é pior que um apagado: ensina
   * que o recurso não funciona.
   */
  /** o botão só acende quando o clique for mudar alguma coisa */
  const podeAplicar =
    ocorrencias.length > 0 && (trocarLigado || (pintarLigado && corDaBusca !== undefined))

  const oQueVaiFazer = (): { troca: boolean; pinta: boolean } => ({
    troca: trocarLigado,
    pinta: pintarLigado && corDaBusca !== undefined
  })

  /**
   * O botão único: troca, pinta, ou faz as duas coisas no mesmo passo.
   *
   * As duas juntas eram o buraco do desenho antigo. Lá a cor pintava *o que a
   * busca acha* — e depois de trocar "agora" por "depois", a busca continuava
   * procurando "agora", achava zero, e a linha da cor ficava inerte. O
   * encadeamento mais natural que existe (achar, trocar, pintar o que entrou)
   * era justamente o impossível.
   *
   * Aqui a troca acontece primeiro e `faixasDepoisDeTrocar` diz onde cada
   * palavra nova caiu. A cor vai para LÁ, sem a busca precisar procurar de
   * novo — ela nem acharia.
   */
  const aplicar = (todasAsVezes: boolean): void => {
    const area = areaRef.current
    const { troca: vaiTrocar, pinta: vaiPintar } = oQueVaiFazer()
    if (!area || busca === null || busca === '' || ocorrencias.length === 0) return
    if (!vaiTrocar && !vaiPintar) return

    const alvos = todasAsVezes ? ocorrencias : ocorrencias[atual] ? [ocorrencias[atual]] : []
    if (alvos.length === 0) return

    /*
     * Quem vai ser pintado é decidido no texto de AGORA, antes de qualquer
     * troca. O SPEECH pergunta "esta ocorrência está numa fala com dono?", e a
     * resposta é sobre onde ela está hoje — não sobre onde a palavra nova vai
     * cair. E vale só para o "todas": pintar UM achado é um pedido explícito,
     * naquele lugar, não uma varredura que possa atropelar o sistema de cores
     * dos apresentadores sem o operador ver.
     */
    const pintaveis = !vaiPintar
      ? []
      : todasAsVezes
        ? achadosParaPintar(alvos, draft, donosDasLinhas, sobrescrever)
        : alvos

    if (!vaiTrocar) {
      if (pintaveis.length === 0) return
      // sem troca, o texto não mudou: as faixas são as de agora
      flush()
      marcar(pintaveis.map((a) => ({ de: a.inicio, ate: a.fim })))
      return
    }

    const repor = preservarRolagem()
    let texto = draft
    for (let i = alvos.length - 1; i >= 0; i -= 1) {
      texto = texto.slice(0, alvos[i].inicio) + troca + texto.slice(alvos[i].fim)
    }
    setDraft(texto)
    /*
     * `push` com zero de espera ainda passa por um `setTimeout`, e um dispatch
     * logo em seguida chegaria ao main ANTES do texto novo — a marca cairia
     * medida contra o texto velho. O `flush()` manda na hora, e é o que garante
     * a ordem: primeiro o texto, depois a cor.
     */
    push(texto, 0)
    flush()

    if (pintaveis.length > 0) {
      const caiuEm = faixasDepoisDeTrocar(alvos, troca.length)
      const trechos = alvos
        .map((a, i) => ({ a, faixa: caiuEm[i] }))
        .filter(({ a }) => pintaveis.includes(a))
        .map(({ faixa }) => ({ de: faixa.inicio, ate: faixa.fim }))
        .filter((t) => t.ate > t.de)
      if (trechos.length > 0) marcar(trechos)
    }

    // o cursor fica DEPOIS do que acabou de entrar: assim o próximo "aplicar"
    // pega a ocorrência seguinte, e não fica batendo na mesma
    const depois = alvos[0].inicio + troca.length
    requestAnimationFrame(() => {
      area.setSelectionRange(depois, depois)
      repor()
    })
  }

  /**
   * Manda a cor escolhida para os trechos, numa chamada só.
   *
   * Uma, e não várias: em várias, o Ctrl+Z despintaria metade — e "metade do
   * jeito antigo" é pior que qualquer um dos dois inteiros.
   */
  const marcar = (trechos: { de: number; ate: number }[]): void => {
    if (corDaBusca === null) dispatch({ type: 'marca/limpar', tabId: tab.id, trechos })
    else if (corDaBusca !== undefined) {
      dispatch({ type: 'marca/aplicar', tabId: tab.id, trechos, patch: { cor: corDaBusca } })
      dispatch({ type: 'marca/corUsada', cor: corDaBusca })
    }
  }

  const fecharBusca = (comCursor: boolean): void => {
    const alvo = ocorrencias[atual]
    setBusca(null)
    setAchado(null)
    const area = areaRef.current
    if (!area) return
    area.focus()
    // Esc devolve o cursor PARA o achado: quem procurou quer editar ali. O ×
    // não mexe no cursor — foi um gesto de fechar, não de ir
    if (comCursor && alvo) area.setSelectionRange(alvo.inicio, alvo.fim)
  }

  const abrirBusca = useCallback((): void => {
    const area = areaRef.current
    // semeia com o que estiver selecionado, como todo editor faz
    const selecionado = area ? draft.slice(area.selectionStart, area.selectionEnd) : ''
    // seleção de várias linhas não vira termo de busca: seria um termo que
    // ninguém quis, e ela some do campo assim que a pessoa digita
    setBusca(selecionado.includes('\n') ? '' : selecionado)
    setAtual(0)
    // o campo só existe depois do render que o `busca` não-nulo provoca
    setTimeout(() => campoBusca.current?.select(), 0)
  }, [draft])

  const selecaoFaixa = useCallback((): { de: number; ate: number } | null => {
    const area = areaRef.current
    if (!area || area.selectionStart === area.selectionEnd) return null
    return { de: area.selectionStart, ate: area.selectionEnd }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      flush,
      insert,
      removerFormatacao,
      caret,
      selecao,
      selecaoFaixa,
      mostrarAncora,
      abrirBusca,
      limparMarca: () => setMarca(null)
    }),
    [flush, insert, removerFormatacao, caret, selecao, selecaoFaixa, mostrarAncora, abrirBusca]
  )

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    ultimoToque.current = Date.now()
    setDraft(event.target.value)
    push(event.target.value, 140)
  }

  /**
   * As marcas do roteiro nas coordenadas do RASCUNHO — o texto de agora, que
   * pode estar até 140ms à frente do que o main conhece.
   *
   * Sem o remapeamento, a marca ficaria parada enquanto se digita antes dela e
   * só daria um pulo para o lugar certo quando o main respondesse. Com ele,
   * ela acompanha a letra. É a MESMA conta que o main usa quando o texto chega
   * de verdade — aqui adiantada, para a tela não mentir nem por um respiro.
   */
  const marcasDoRascunho = useMemo(() => {
    const doTexto = marcasNoTexto(tab.blocks)
    if (doTexto.length === 0 || draft === incoming) return doTexto
    const edicao = edicaoEntre(incoming, draft)
    return edicao ? remapearMarcas(doTexto, [edicao]) : doTexto
  }, [tab.blocks, incoming, draft])

  /**
   * Quem fala, também no editor — uma cor (ou `null`) por linha.
   *
   * A MESMA função da transmissão (`coresDasLinhas`), alimentada com as linhas
   * do editor em vez das compostas — é o que garante que a cor vista digitando
   * é a cor que o apresentador vai ler. Duas implementações divergiriam no
   * primeiro ajuste, e o editor viraria prévia mentirosa.
   *
   * A classificação repete as regexes do desenho porque aqui ainda não há
   * blocos: o rascunho pode estar 140ms à frente do que o main conhece.
   *
   * Saiu de dentro do `highlighted` e virou memo próprio porque o "pintar
   * todas" da barra de busca precisa da MESMA lista — é ela que decide quais
   * achados o interruptor SPEECH manda pular.
   */
  const linhasPintaveis = useMemo((): LinhaPintavel[] => {
    return draft.split('\n').map((line) => {
      const t = line.trim()
      const kind: BlockKind = /^\[[\s\S]*\]$/.test(t)
        ? 'direction'
        : /^#{1,6}\s+/.test(t)
          ? 'chapter'
          : 'speech'
      return { kind, text: line }
    })
  }, [draft])

  const donosDasLinhas = useMemo(
    () => coresDasLinhas(linhasPintaveis, apresentadores),
    [linhasPintaveis, apresentadores]
  )

  const highlighted = useMemo(() => {
    const lines = draft.split('\n')
    const pintaveis = linhasPintaveis
    const deQuemFala = donosDasLinhas

    /* onde cada linha começa no texto inteiro, para fatiar as marcas dela */
    let percorrido = 0
    const inicios = lines.map((line) => {
      const inicio = percorrido
      percorrido += line.length + 1
      return inicio
    })

    return lines.map((line, index) => {
      const trimmed = line.trim()
      const isDirection = /^\[[\s\S]*\]$/.test(trimmed)
      const isChapter = /^#{1,6}\s+/.test(trimmed)
      const deixa = ehDeixa(pintaveis[index], apresentadores)
      const color = isDirection
        ? 'var(--color-link)'
        : isChapter
          ? 'var(--color-warn)'
          : (deixa?.cor ?? deQuemFala[index] ?? 'var(--color-fog-0)')
      /*
       * Direção ganha fundo — mas só pintura.
       *
       * Nada de `padding` ou `border` aqui: este `<pre>` é uma camada
       * colorida por cima de um `textarea` transparente, e os dois precisam
       * quebrar linha exatamente no mesmo lugar. Qualquer coisa que ocupe
       * espaço empurra os glifos de um e não do outro, e o cursor passa a
       * cair ao lado da letra que se está vendo. `background` pinta sem
       * ocupar espaço nenhum.
       *
       * Havia também uma barra de 2px na borda esquerda (`inset 2px 0 0`).
       * Saiu: colada no `[` da rubrica ela era lida como um `|` digitado, e
       * o fundo já distingue a linha sem esse risco.
       */
      const realce = isDirection
        ? { background: 'color-mix(in srgb, var(--color-link) 9%, transparent)' }
        : /* o nome de quem fala vem em negrito: é a deixa, e precisa se
             distinguir da fala que ela abre — as duas estão na mesma cor */
          deixa
          ? { fontWeight: 700 }
          : undefined
      const minhas = marcasDaFatia(marcasDoRascunho, inicios[index], inicios[index] + line.length)
      return (
        <span key={index} style={{ color, ...realce }}>
          {minhas.length > 0 ? pedacosDaLinha(line, minhas) : line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      )
    })
  }, [draft, apresentadores, marcasDoRascunho, linhasPintaveis, donosDasLinhas])

  // `scrollbar-gutter: stable` nos dois: sem isso, um roteiro comprido o
  // bastante para precisar de rolagem reserva os 13px da barra só no textarea
  // (que rola de verdade) e não no <pre> (que só é panorâmico por baixo dele)
  // — os dois passam a quebrar linha em pontos diferentes, e selecionar texto
  // revela o textarea real desalinhado por baixo do texto colorido.
  /*
   * ALL CAPS é PINTURA, não edição.
   *
   * `text-transform` muda o que se vê e não toca uma letra do que está
   * guardado — desligar devolve o texto exatamente como estava, com as
   * maiúsculas que já existiam nos lugares certos. Transformar o texto de
   * verdade seria destrutivo: não há como saber depois quais letras eram
   * maiúsculas antes.
   *
   * Vai nas DUAS camadas com o mesmo valor. Aqui isso é seguro porque a fonte
   * do editor é monoespaçada: maiúscula e minúscula ocupam a mesma largura,
   * então a quebra de linha do `<pre>` e a do `textarea` continuam caindo no
   * mesmo lugar — que é a única coisa que mantém o cursor sob a letra certa.
   */
  const caixaAlta: React.CSSProperties = allCaps ? { textTransform: 'uppercase' } : {}

  return (
    // `data-sem-roda`: sobre o texto que se está escrevendo a roda rola o
    // roteiro, como em qualquer editor — nunca o ritmo da leitura. A marca
    // fica aqui e não no textarea porque o `<pre>` colorido por baixo também
    // está nesta caixa
    <div data-sem-roda className="relative min-h-0 flex-1 overflow-hidden">
      {/* A barra de busca: FLUTUA por cima do texto, no canto de cima. Não
          empurra o editor para baixo de propósito — reflowar o roteiro para
          abrir uma busca moveria todo o texto sob o olho de quem só queria
          achar uma palavra. */}
      {busca !== null ? (
        <div
          data-busca
          /*
           * A barra é uma FRASE montada de cima para baixo: procure isto →
           * mude estas coisas → aplique. Três blocos, e um lugar só que age.
           *
           * O desenho anterior tinha três linhas com seis teclas parecidas, e
           * nenhuma dizia sobre o que agia — pior, a linha da cor pintava *o
           * que a busca acha*, então depois de trocar ela ficava inerte: a
           * busca continuava procurando o termo antigo, que já não existia. O
           * encadeamento mais natural que existe era justamente o impossível.
           *
           * Aqui as duas caixinhas dizem o que está em jogo, e o botão faz
           * tudo o que está marcado de uma vez.
           */
          className="absolute top-2 right-4 z-20 flex w-max flex-col gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] p-1 pt-4.5 shadow-[0_6px_20px_rgba(0,0,0,.5)]"
        >
          {/* o × solto no canto: fechar não é irmão de nenhum dos passos */}
          <button
            type="button"
            data-busca-fechar
            title={t('app.close')}
            aria-label={t('app.close')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fecharBusca(false)}
            className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded text-[11px] leading-none text-[var(--color-fog-3)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            ×
          </button>

          {/* ── PROCURE ISTO ── o ALL mora aqui porque qualifica a BUSCA:
              "marque toda ocorrência". Ele nunca teve nada a ver com trocar. */}
          <div className="flex items-center gap-1">
            <input
              ref={campoBusca}
              data-busca-campo
              {...ajuda('editor.find')}
              value={busca}
              placeholder={t('editor.findPlaceholder')}
              aria-label={t('editor.find')}
              onChange={(e) => setBusca(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  andar(e.shiftKey)
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  fecharBusca(true)
                }
                // as setas andam entre achados sem tirar a mão do campo
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  andar(e.key === 'ArrowUp')
                }
              }}
              className={CAMPO}
              style={LARGURA_DO_CAMPO}
            />
            {/* a contagem diz se vale continuar apertando — e "0" precisa
                gritar, senão a pessoa fica batendo Enter num termo que não existe */}
            <span
              data-busca-contagem
              className={`w-8 flex-none text-center font-mono text-[10px] tabular-nums ${
                busca !== '' && ocorrencias.length === 0
                  ? 'text-[var(--color-live)]'
                  : 'text-[var(--color-fog-2)]'
              }`}
            >
              {ocorrencias.length === 0 ? '0' : `${atual + 1}/${ocorrencias.length}`}
            </span>
            <BotaoDeBusca
              marca="anterior"
              rotulo={t('editor.findPrev')}
              desligado={ocorrencias.length === 0}
              onClick={() => andar(true)}
            >
              ↑
            </BotaoDeBusca>
            <BotaoDeBusca
              marca="proxima"
              rotulo={t('editor.findNext')}
              desligado={ocorrencias.length === 0}
              onClick={() => andar(false)}
            >
              ↓
            </BotaoDeBusca>
            <Interruptor
              marca="find-all"
              ajudaId="editor.findAll"
              rotulo={t('editor.findAll')}
              aceso={todas}
              onClick={() => setTodas((v) => !v)}
              className="w-9"
            >
              ALL
            </Interruptor>
          </div>

          <div className="h-px bg-[var(--color-line)]" />

          {/* ── MUDE ESTAS COISAS ── */}
          <Passo
            marca="usar-troca"
            ligado={trocarLigado}
            rotulo={t('editor.replace')}
            onToggle={() => setTrocarLigado((v) => !v)}
          >
            <input
              data-troca-campo
              {...ajuda('editor.replace')}
              value={troca}
              placeholder={t('editor.replacePlaceholder')}
              aria-label={t('editor.replace')}
              disabled={!trocarLigado}
              onChange={(e) => setTroca(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  aplicar(e.shiftKey)
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  fecharBusca(true)
                }
              }}
              className={`${CAMPO} min-w-0 flex-1 disabled:opacity-35`}
            />
            {/*
              A seta que SOBE: leva o que está aqui para o campo de busca, e
              esvazia este.

              É a continuação do encadeamento. Trocado "agora" por "depois", a
              pergunta seguinte quase sempre é "e onde está o 'depois'?" — para
              conferir, pintar, ou trocar de novo. Sem ela é redigitar a palavra
              que se acabou de escrever, dois campos acima.

              Chapada e pequena de propósito: não é irmã das setas de navegar
              lá de cima, que andam entre achados. Esta move TEXTO.
            */}
            <button
              type="button"
              data-troca-sobe
              title={t('editor.replaceToFind')}
              aria-label={t('editor.replaceToFind')}
              disabled={!trocarLigado || troca === ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setBusca(troca)
                setTroca('')
                setAtual(0)
                campoBusca.current?.focus()
              }}
              className="grid h-[19px] w-[19px] flex-none place-items-center rounded border border-[var(--color-edge)] text-[11px] leading-none text-[var(--color-fog-2)] not-disabled:hover:bg-[var(--color-ink-3)] not-disabled:hover:text-[var(--color-fog-0)] disabled:opacity-25"
            >
              ↑
            </button>
          </Passo>

          <Passo
            marca="usar-cor"
            ligado={pintarLigado}
            /* rótulo PRÓPRIO, curto: `editor.color` é o do cabeçalho ("cor do
               texto selecionado") e quebrava em três linhas aqui dentro */
            rotulo={t('editor.paintWith')}
            onToggle={() => setPintarLigado((v) => !v)}
          >
            <SeletorDeCor
              marca="busca-cor"
              ajudaId="editor.color"
              rotulo={t('editor.color')}
              valor={corDaBusca ?? undefined}
              atalhos={coresRecentes}
              desligado={!pintarLigado}
              onCor={(cor) => {
                setCorDaBusca(cor)
                setPintarLigado(true)
              }}
              className="h-5 w-5 flex-none"
            />
            {/* TRÊS das quatro recentes, e não as quatro: aqui elas são atalho
                para o gesto de agora, não a caixa de tintas inteira — essa fica
                no cabeçalho e dentro do próprio seletor. Três cabem sem empurrar
                o SPEECH para fora, e a quarta é sempre a mais antiga. */}
            {coresRecentes.slice(0, 3).map((cor) => (
              <button
                key={cor}
                type="button"
                data-busca-cor-recente={cor}
                title={cor}
                aria-label={cor}
                disabled={!pintarLigado}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCorDaBusca(cor)}
                className={`h-[15px] w-[15px] flex-none rounded-full border transition-transform not-disabled:hover:scale-110 disabled:opacity-30 ${
                  corDaBusca === cor
                    ? 'border-[var(--color-fog-0)]'
                    : 'border-[var(--color-edge)]'
                }`}
                style={{ background: cor }}
              />
            ))}
            <button
              type="button"
              data-busca-cor-limpar
              title={t('editor.colorNone')}
              aria-label={t('editor.colorNone')}
              disabled={!pintarLigado}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCorDaBusca(null)}
              className={`grid h-[17px] w-[17px] flex-none place-items-center rounded-full border border-dashed text-[9px] leading-none disabled:opacity-30 ${
                corDaBusca === null
                  ? 'border-[var(--color-fog-0)] text-[var(--color-fog-0)]'
                  : 'border-[var(--color-fog-3)] text-[var(--color-fog-3)] hover:border-[var(--color-fog-1)] hover:text-[var(--color-fog-1)]'
              }`}
            >
              ×
            </button>
            <span className="flex-1" />
            <Interruptor
              marca="sobrescrever"
              ajudaId="editor.overwrite"
              rotulo={t('editor.overwrite')}
              aceso={sobrescrever}
              desligado={!pintarLigado}
              onClick={() => setSobrescrever((v) => !v)}
              className="w-[52px]"
            >
              SPEECH
            </Interruptor>
          </Passo>

          <div className="h-px bg-[var(--color-line)]" />

          {/* ── APLIQUE ── um lugar só que age, e ele diz em quantos vai agir */}
          <div className="flex items-center gap-1">
            <TeclaDeAplicar
              marca="aplicar"
              rotulo={t('editor.applyOne')}
              desligado={!podeAplicar}
              destaque
              /* o botão veste a cor que vai sair — antes de clicar, já se vê o
                 resultado. Só quando pintar está marcado E há cor escolhida:
                 a pontilhada TIRA a cor, e um botão vestido de nada não
                 existe */
              cor={pintarLigado && corDaBusca ? corDaBusca : undefined}
              onClick={() => aplicar(false)}
            >
              {t('editor.applyOne')}
            </TeclaDeAplicar>
            <TeclaDeAplicar
              marca="aplicar-todas"
              rotulo={t('editor.applyAll', { n: ocorrencias.length })}
              desligado={!podeAplicar}
              onClick={() => aplicar(true)}
            >
              {t('editor.applyAllShort', { n: ocorrencias.length })}
            </TeclaDeAplicar>
          </div>
        </div>
      ) : null}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-x-hidden overflow-y-auto"
        style={{ ...TYPE_SETTINGS, fontSize, scrollbarGutter: 'stable', ...caixaAlta }}
      >
        {highlighted}
        {'\n'}
      </pre>
      {/* A marca da leitura: uma faixa na linha que está sendo dita agora.
          Fica ENTRE o <pre> colorido e o textarea — por cima do texto pintado,
          por baixo da camada que recebe o clique — e não intercepta ponteiro
          nenhum, senão selecionar texto pararia de funcionar na linha marcada.
          A posição vem em coordenadas do conteúdo; o `- rolagem` traz para a
          tela. */}
      {/* O achado da busca: uma caixa em volta da palavra, não uma faixa de
          linha. A marca de leitura é faixa porque diz ONDE a leitura está; o
          achado precisa dizer QUAL palavra, e num parágrafo denso uma faixa
          não diria. Âmbar para não se confundir com o verde da leitura, que
          pode estar na tela ao mesmo tempo. */}
      {/* FIND ALL: as outras ocorrências, mais fracas que a atual. Mais fracas
          de propósito — todas com o mesmo peso e você perde de vista em qual
          está, que é a informação que o Enter usa */}
      {todas
        ? caixas.map((caixa, i) =>
            caixa && i !== atual ? (
              <div
                key={i}
                data-achado-todos={i}
                className="pointer-events-none absolute rounded-[2px]"
                style={{
                  top: caixa.top - rolagem,
                  left: caixa.left,
                  width: caixa.width,
                  height: caixa.height,
                  background: 'color-mix(in srgb, var(--color-warn) 12%, transparent)',
                  outline: '1px solid color-mix(in srgb, var(--color-warn) 35%, transparent)'
                }}
              />
            ) : null
          )
        : null}
      {achado ? (
        <div
          data-achado-busca
          className="pointer-events-none absolute rounded-[2px]"
          style={{
            top: achado.top - rolagem,
            left: achado.left,
            width: achado.width,
            height: achado.height,
            background: 'color-mix(in srgb, var(--color-warn) 30%, transparent)',
            outline: '1px solid var(--color-warn)'
          }}
        />
      ) : null}
      {marca ? (
        <div
          data-marca-leitura
          className="pointer-events-none absolute right-0 left-0"
          style={{
            top: marca.top - rolagem,
            height: marca.height,
            background: 'color-mix(in srgb, var(--color-go) 16%, transparent)',
            borderLeft: '3px solid var(--color-go)'
          }}
        />
      ) : null}
      <textarea
        ref={areaRef}
        {...ajuda('editor.script')}
        value={draft}
        onChange={onChange}
        onBlur={() => push(draft, 0)}
        /* Três portas para o mesmo aviso, e não é excesso.
           `onSelect` do React é sintetizado, não é o evento nativo: ele não
           dispara em toda forma de mexer na seleção. Quem depende dele para
           saber se há texto selecionado — o botão de apresentador — ficava
           apagado com o nome selecionado na frente do operador. Mouse e
           teclado soltos cobrem o resto. */
        onSelect={onCaretMove}
        onMouseUp={onCaretMove}
        onKeyUp={onCaretMove}
        onScroll={() => {
          if (preRef.current && areaRef.current) preRef.current.scrollTop = areaRef.current.scrollTop
          // só custa um render quando há marca para reposicionar; desligado, a
          // rolagem do editor não deve nada a este recurso
          if (marca) setRolagem(areaRef.current?.scrollTop ?? 0)
        }}
        /* rolar com a roda ou arrastando a barra é o operador procurando
           alguma coisa: o acompanhamento sai da frente por `RESPEITO_MS`. O
           `onScroll` sozinho não serviria para isto — ele também dispara na
           rolagem que o próprio acompanhamento faz, e o recurso se desligaria
           a si mesmo no primeiro salto */
        onWheel={() => {
          ultimoToque.current = Date.now()
        }}
        onPointerDown={() => {
          ultimoToque.current = Date.now()
        }}
        spellCheck={false}
        placeholder={t('editor.placeholder')}
        className="absolute inset-0 resize-none bg-transparent outline-none"
        style={{
          ...TYPE_SETTINGS,
          fontSize,
          color: 'transparent',
          caretColor: 'var(--color-fog-0)',
          userSelect: 'text',
          scrollbarGutter: 'stable',
          ...caixaAlta
        }}
      />
    </div>
  )
})
