import { useEffect } from 'react'
import { Icon } from './Icon'

interface Props {
  title: string
  subtitle?: string
  width?: number
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, subtitle, width = 560, onClose, children }: Props): React.JSX.Element {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width }}
        className="flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-ink-1)]"
      >
        <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-3.5 py-2.5">
          <div>
            <div className="text-[13px] font-medium">{title}</div>
            {subtitle ? <div className="text-[11px] text-[var(--color-fog-2)]">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="ml-auto rounded p-1 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="close" size={14} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
