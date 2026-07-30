import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { insertBlock, type InsertKind } from '@shared/insertBlock'
import { serializeBlocks } from '@shared/text'
import type { Tab } from '@shared/types'

const TYPE_SETTINGS: React.CSSProperties = {
  margin: 0,
  border: 'none',
  padding: '14px 16px',
  fontFamily: '"Cascadia Mono", "SF Mono", Consolas, monospace',
  fontSize: 14,
  lineHeight: 1.75,
  letterSpacing: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  tabSize: 2
}

interface Props {
  tab: Tab
  dispatch: (action: Action) => void
}

export interface EditorHandle {
  /** manda agora, sem esperar o debounce, o que ainda estiver pendente. */
  flush: () => void
  /** insere capítulo ou direção no cursor, já com o miolo selecionado. */
  insert: (kind: InsertKind) => void
}

/**
 * Editor com realce por trás de um textarea de texto transparente.
 *
 * O parágrafo em [colchetes] e o título de capítulo precisam se distinguir num
 * relance, mas o operador não pode perder o comportamento nativo de digitação
 * — cursor, seleção, teclado do sistema. Um textarea transparente sobre um
 * `pre` colorido dá as duas coisas.
 */
export const Editor = forwardRef<EditorHandle, Props>(function Editor({ tab, dispatch }, ref) {
  const incoming = useMemo(() => serializeBlocks(tab.blocks), [tab.blocks])
  const [draft, setDraft] = useState(incoming)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const lastSent = useRef(incoming)
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

    // eco da nossa própria digitação: não reposiciona o cursor
    if (incoming === lastSent.current) return
    lastSent.current = incoming

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

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const send = (value: string): void => {
    lastSent.current = value
    dispatch({ type: 'text/set', tabId: tab.id, text: value })
  }

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

  useImperativeHandle(ref, () => ({ flush, insert }), [flush, insert])

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
      return (
        <span key={index} style={{ color }}>
          {line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      )
    })
  }, [draft])

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <pre
        ref={preRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={TYPE_SETTINGS}
      >
        {highlighted}
        {'\n'}
      </pre>
      <textarea
        ref={areaRef}
        value={draft}
        onChange={onChange}
        onBlur={() => push(draft, 0)}
        onScroll={() => {
          if (preRef.current && areaRef.current) preRef.current.scrollTop = areaRef.current.scrollTop
        }}
        spellCheck={false}
        placeholder="Cole ou digite o roteiro. Linha em branco separa parágrafos, [colchetes] marcam direções, § abre capítulo."
        className="absolute inset-0 resize-none bg-transparent outline-none"
        style={{ ...TYPE_SETTINGS, color: 'transparent', caretColor: 'var(--color-fog-0)', userSelect: 'text' }}
      />
    </div>
  )
})
