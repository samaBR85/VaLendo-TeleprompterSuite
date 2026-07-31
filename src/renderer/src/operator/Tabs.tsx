import { useState } from 'react'
import type { Action } from '@shared/actions'
import type { AppState } from '@shared/types'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

interface Props {
  state: AppState
  dispatch: (action: Action) => void
}

export function Tabs({ state, dispatch }: Props): React.JSX.Element {
  const { t } = useT()
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {state.tabs.map((tab, index) => {
        const active = tab.id === state.activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => dispatch({ type: 'tab/activate', tabId: tab.id })}
            onDoubleClick={() => setEditing(tab.id)}
            title={`${tab.title} · Ctrl+${index === 9 ? 0 : index + 1}`}
            className={`group flex flex-none items-center gap-2 rounded-md border px-3 py-2 text-[13px] ${
              active
                ? 'border-[var(--color-line)] bg-[var(--color-ink-2)] text-[var(--color-fog-0)]'
                : 'border-transparent text-[var(--color-fog-2)] hover:bg-[var(--color-ink-2)]'
            }`}
          >
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: tab.color }} />
            {editing === tab.id ? (
              <input
                autoFocus
                defaultValue={tab.title}
                onBlur={(event) => {
                  dispatch({ type: 'tab/rename', tabId: tab.id, title: event.target.value })
                  setEditing(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') setEditing(null)
                }}
                className="w-28 bg-transparent outline-none"
              />
            ) : (
              <span className="max-w-[130px] truncate">{tab.title}</span>
            )}
            {state.tabs.length > 1 ? (
              <button
                type="button"
                aria-label={t('tabs.close', { title: tab.title })}
                onClick={(event) => {
                  event.stopPropagation()
                  dispatch({ type: 'tab/close', tabId: tab.id })
                }}
                className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              >
                <Icon name="close" size={16} />
              </button>
            ) : null}
          </div>
        )
      })}

      {state.tabs.length < 10 ? (
        <button
          type="button"
          aria-label={t('tabs.new')}
          title={t('tabs.new.hint')}
          onClick={() => dispatch({ type: 'tab/add' })}
          className="flex-none rounded-md p-2 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-2)] hover:text-[var(--color-fog-0)]"
        >
          <Icon name="plus" size={20} />
        </button>
      ) : (
        <span className="flex-none px-1 text-[13px] text-[var(--color-fog-2)]">{t('tabs.max')}</span>
      )}
    </div>
  )
}
