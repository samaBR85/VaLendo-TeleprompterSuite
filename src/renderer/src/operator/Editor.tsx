import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { insertBlock, type InsertKind } from '@shared/insertBlock'
import { coresDasLinhas, ehDeixa, type LinhaPintavel } from '@shared/apresentadores'
import { blocksFromText, caretFromAnchor, serializeBlocks, stripFormatting } from '@shared/text'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'
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
  { tab, fontSize, apresentadores, dispatch, onCaretMove, onPendenteChange, allCaps },
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
   * O botão da barra tira o foco do textarea antes do clique, mas o textarea
   * guarda a última seleção mesmo desfocado — então a inserção cai no ponto
   * onde o cursor estava, e o foco volta logo em seguida.
   */
  const insert = useCallback(
    (kind: InsertKind): void => {
      const area = areaRef.current
      if (!area) return

      const result = insertBlock(area.value, area.selectionStart, area.selectionEnd, kind)
      setDraft(result.text)
      push(result.text, 0)

      requestAnimationFrame(() => {
        area.focus()
        area.setSelectionRange(result.selectionStart, result.selectionEnd)
      })
    },
    [tab.id, dispatch]
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
    setDraft(limpo)
    push(limpo, 0)

    requestAnimationFrame(() => {
      if (!area) return
      area.focus()
      area.setSelectionRange(caret, caret)
    })
  }, [draft, tab.id, dispatch])

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

  useImperativeHandle(
    ref,
    () => ({ flush, insert, removerFormatacao, caret, selecao, mostrarAncora, limparMarca: () => setMarca(null) }),
    [flush, insert, removerFormatacao, caret, selecao, mostrarAncora]
  )

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    ultimoToque.current = Date.now()
    setDraft(event.target.value)
    push(event.target.value, 140)
  }

  const highlighted = useMemo(() => {
    const lines = draft.split('\n')

    /*
     * Quem fala, também no editor.
     *
     * A MESMA função da transmissão (`coresDasLinhas`), alimentada com as
     * linhas do editor em vez das compostas — é o que garante que a cor vista
     * digitando é a cor que o apresentador vai ler. Duas implementações
     * divergiriam no primeiro ajuste, e o editor viraria prévia mentirosa.
     *
     * A classificação repete as regexes daqui de baixo porque aqui ainda não
     * há blocos: o rascunho pode estar 140ms à frente do que o main conhece.
     */
    const pintaveis: LinhaPintavel[] = lines.map((line) => {
      const t = line.trim()
      const kind: BlockKind = /^\[[\s\S]*\]$/.test(t)
        ? 'direction'
        : /^#{1,6}\s+/.test(t)
          ? 'chapter'
          : 'speech'
      return { kind, text: line }
    })
    const deQuemFala = coresDasLinhas(pintaveis, apresentadores)

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
      return (
        <span key={index} style={{ color, ...realce }}>
          {line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      )
    })
  }, [draft, apresentadores])

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
