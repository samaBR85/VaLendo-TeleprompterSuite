import { useEffect, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
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

/**
 * Editor com realce por trás de um textarea de texto transparente.
 *
 * O parágrafo em [colchetes] e o título de capítulo precisam se distinguir num
 * relance, mas o operador não pode perder o comportamento nativo de digitação
 * — cursor, seleção, teclado do sistema. Um textarea transparente sobre um
 * `pre` colorido dá as duas coisas.
 */
export function Editor({ tab, dispatch }: Props): React.JSX.Element {
  const incoming = useMemo(() => serializeBlocks(tab.blocks), [tab.blocks])
  const [draft, setDraft] = useState(incoming)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const lastSent = useRef(incoming)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // adota o texto do main só quando ele difere do que nós mandamos — assim o
  // eco da nossa própria digitação não reposiciona o cursor, mas desfazer,
  // refazer e troca de aba entram na hora
  useEffect(() => {
    if (incoming === lastSent.current) return
    lastSent.current = incoming
    const caret = areaRef.current?.selectionStart ?? 0
    setDraft(incoming)
    requestAnimationFrame(() => {
      const area = areaRef.current
      if (!area) return
      const position = Math.min(caret, incoming.length)
      area.setSelectionRange(position, position)
    })
  }, [incoming])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const push = (value: string, delay: number): void => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      lastSent.current = value
      dispatch({ type: 'text/set', tabId: tab.id, text: value })
    }, delay)
  }

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
}
