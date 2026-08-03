import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { insertBlock, type InsertKind } from '@shared/insertBlock'
import { blocksFromText, serializeBlocks, stripFormatting } from '@shared/text'
import { useT } from '../i18n'
import type { Tab } from '@shared/types'

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
}

export interface EditorHandle {
  /** manda agora, sem esperar o debounce, o que ainda estiver pendente. */
  flush: () => void
  /** insere capítulo ou direção no cursor, já com o miolo selecionado. */
  insert: (kind: InsertKind) => void
  /** tira a marcação do roteiro inteiro: sem capítulos, sem direções. */
  removerFormatacao: () => void
  /** o texto atual do rascunho e onde o cursor está nele — para o "Go To". */
  caret: () => { text: string; position: number }
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
  { tab, fontSize, dispatch, onCaretMove },
  ref
) {
  const { t } = useT()
  const incoming = useMemo(() => serializeBlocks(tab.blocks), [tab.blocks])
  const [draft, setDraft] = useState(incoming)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
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
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      pendingValue.current = null
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

  useImperativeHandle(
    ref,
    () => ({ flush, insert, removerFormatacao, caret }),
    [flush, insert, removerFormatacao, caret]
  )

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setDraft(event.target.value)
    push(event.target.value, 140)
  }

  const highlighted = useMemo(() => {
    const lines = draft.split('\n')
    return lines.map((line, index) => {
      const trimmed = line.trim()
      const isDirection = /^\[[\s\S]*\]$/.test(trimmed)
      const isChapter = /^(#{1,6}|§)\s+/.test(trimmed)
      const color = isDirection
        ? 'var(--color-link)'
        : isChapter
          ? 'var(--color-warn)'
          : 'var(--color-fog-0)'
      /*
       * Direção ganha fundo e barra à esquerda — mas só pintura.
       *
       * Nada de `padding` ou `border` aqui: este `<pre>` é uma camada
       * colorida por cima de um `textarea` transparente, e os dois precisam
       * quebrar linha exatamente no mesmo lugar. Qualquer coisa que ocupe
       * espaço empurra os glifos de um e não do outro, e o cursor passa a
       * cair ao lado da letra que se está vendo. `background` e
       * `box-shadow` pintam sem ocupar espaço nenhum.
       */
      const realce = isDirection
        ? {
            background: 'color-mix(in srgb, var(--color-link) 9%, transparent)',
            boxShadow: 'inset 2px 0 0 var(--color-link)'
          }
        : undefined
      return (
        <span key={index} style={{ color, ...realce }}>
          {line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      )
    })
  }, [draft])

  // `scrollbar-gutter: stable` nos dois: sem isso, um roteiro comprido o
  // bastante para precisar de rolagem reserva os 13px da barra só no textarea
  // (que rola de verdade) e não no <pre> (que só é panorâmico por baixo dele)
  // — os dois passam a quebrar linha em pontos diferentes, e selecionar texto
  // revela o textarea real desalinhado por baixo do texto colorido.
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-x-hidden overflow-y-auto"
        style={{ ...TYPE_SETTINGS, fontSize, scrollbarGutter: 'stable' }}
      >
        {highlighted}
        {'\n'}
      </pre>
      <textarea
        ref={areaRef}
        value={draft}
        onChange={onChange}
        onBlur={() => push(draft, 0)}
        onSelect={onCaretMove}
        onScroll={() => {
          if (preRef.current && areaRef.current) preRef.current.scrollTop = areaRef.current.scrollTop
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
          scrollbarGutter: 'stable'
        }}
      />
    </div>
  )
})
