import { useMemo, useState } from 'react'
import { COMMANDS, formatBinding, parseBinding } from '@shared/commands'
import { Modal } from '../ui/Modal'

interface Props {
  keymap: Map<string, string>
  onRun: (commandId: string) => void
  onClose: () => void
}

const DIACRITICS = /\p{Diacritic}/gu

/** Busca sem acento: "aparencia" precisa achar "Aparência". */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
}

export function CommandPalette({ keymap, onRun, onClose }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const isMac = window.valendo.platform === 'darwin'

  const results = useMemo(() => {
    const needle = normalize(query)
    const visible = COMMANDS.filter((command) => !command.hidden)
    if (!needle) return visible
    return visible.filter(
      (command) => normalize(command.label).includes(needle) || normalize(command.group).includes(needle)
    )
  }, [query])

  const index = Math.min(cursor, Math.max(0, results.length - 1))
  const selected = results[index]

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (event.key === 'Enter' && selected) {
      event.preventDefault()
      onRun(selected.id)
      onClose()
    }
  }

  return (
    <Modal title="Paleta de comandos" subtitle="Tudo que o app faz, sem tirar a mão do teclado" onClose={onClose}>
      <input
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setCursor(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Digite para filtrar"
        className="border-b border-[var(--color-line)] bg-transparent px-3.5 py-2.5 text-[13px] outline-none"
      />

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {results.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-[11px] text-[var(--color-fog-2)]">
            Nenhum comando com esse nome
          </div>
        ) : (
          results.map((command, position) => {
            const binding = parseBinding(keymap.get(command.id) ?? command.defaultBinding)
            return (
              <button
                key={command.id}
                type="button"
                onMouseEnter={() => setCursor(position)}
                onClick={() => {
                  onRun(command.id)
                  onClose()
                }}
                className={`flex w-full items-center gap-3 px-3.5 py-1.5 text-left text-[12px] ${
                  position === index ? 'bg-[var(--color-ink-3)]' : ''
                }`}
              >
                <span className="w-[86px] flex-none text-[11px] text-[var(--color-fog-2)]">{command.group}</span>
                <span className="flex-1 truncate">{command.label}</span>
                {binding ? (
                  <kbd className="flex-none rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] text-[var(--color-fog-1)]">
                    {formatBinding(binding, isMac)}
                  </kbd>
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </Modal>
  )
}
