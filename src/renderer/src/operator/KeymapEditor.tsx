import { useEffect, useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import {
  COMMANDS,
  COMMANDS_BY_ID,
  type CommandGroup,
  findConflicts,
  formatBinding,
  parseBinding,
  serializeBinding
} from '@shared/commands'
import { useT } from '../i18n'
import { Modal } from '../ui/Modal'
import { bindingFromEvent } from './keys'

interface Props {
  keymap: Map<string, string>
  overrides: Record<string, string>
  dispatch: (action: Action) => void
  onClose: () => void
}

export function KeymapEditor({ keymap, overrides, dispatch, onClose }: Props): React.JSX.Element {
  const { t, tc } = useT()
  const [capturing, setCapturing] = useState<string | null>(null)
  const isMac = window.valendo.platform === 'darwin'

  const conflicts = useMemo(() => {
    const bySignature = findConflicts(keymap)
    const perCommand = new Map<string, string[]>()
    for (const ids of bySignature.values()) {
      for (const id of ids) {
        perCommand.set(
          id,
          ids.filter((other) => other !== id)
        )
      }
    }
    return perCommand
  }, [keymap])

  // enquanto captura, o teclado inteiro pertence a este diálogo: qualquer
  // combinação precisa poder ser gravada, inclusive as que já são atalho
  useEffect(() => {
    if (!capturing) return

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setCapturing(null)
        return
      }

      const binding = bindingFromEvent(event, isMac)
      if (!binding) return

      dispatch({ type: 'keymap/set', commandId: capturing, binding: serializeBinding(binding) })
      setCapturing(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capturing, dispatch, isMac])

  const groups = useMemo(() => {
    const map = new Map<CommandGroup, typeof COMMANDS>()
    for (const command of COMMANDS) {
      const list = map.get(command.group) ?? []
      list.push(command)
      map.set(command.group, list)
    }
    return [...map]
  }, [])

  return (
    <Modal
      title={t('keymap.title')}
      subtitle={t('keymap.subtitle')}
      width={620}
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map(([group, commands]) => (
          <section key={group}>
            <div className="sticky top-0 bg-[var(--color-ink-1)] px-3.5 pt-3 pb-1 text-[11px] font-medium text-[var(--color-fog-2)]">
              {t(`group.${group}`)}
            </div>
            {commands.map((command) => {
              const text = keymap.get(command.id) ?? command.defaultBinding
              const binding = parseBinding(text)
              const clash = conflicts.get(command.id)
              const custom = overrides[command.id] !== undefined

              return (
                <div key={command.id} className="flex items-center gap-3 px-3.5 py-1">
                  <span className="flex-1 truncate text-[12px]">{tc(command.id)}</span>

                  {clash?.length ? (
                    <span
                      title={clash.map((id) => (COMMANDS_BY_ID.has(id) ? tc(id) : id)).join(', ')}
                      className="flex-none rounded bg-[var(--color-live)]/16 px-1.5 py-0.5 text-[10px] text-[var(--color-live)]"
                    >
                      {t('keymap.conflict')}
                    </span>
                  ) : null}

                  {custom ? (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'keymap/set', commandId: command.id, binding: null })}
                      className="flex-none text-[10px] text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
                    >
                      {t('keymap.default')}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setCapturing(command.id)}
                    className={`w-[132px] flex-none rounded border px-2 py-1 text-[10px] ${
                      capturing === command.id
                        ? 'border-[var(--color-go)] text-[var(--color-go)]'
                        : clash?.length
                          ? 'border-[var(--color-live)]/50 text-[var(--color-fog-0)]'
                          : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
                    }`}
                  >
                    {capturing === command.id ? t('keymap.press') : binding ? formatBinding(binding, isMac) : text}
                  </button>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </Modal>
  )
}
