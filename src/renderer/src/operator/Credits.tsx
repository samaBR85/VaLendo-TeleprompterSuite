import { useT } from '../i18n'
import { Modal } from '../ui/Modal'
import { Wordmark, versionLabel } from '../ui/Wordmark'

const REPOSITORY = 'https://github.com/samaBR85/VaLendo-TeleprompterSuite'

const STACK = [
  ['Electron', 'credits.role.electron'],
  ['React + TypeScript', 'credits.role.react'],
  ['Vite + Tailwind', 'credits.role.vite'],
  ['Immer', 'credits.role.immer'],
  ['mammoth · pdf.js', 'credits.role.import']
] as const

interface Props {
  onClose: () => void
}

export function Credits({ onClose }: Props): React.JSX.Element {
  const { t } = useT()
  return (
    <Modal title={t('app.credits')} width={480} onClose={onClose}>
      <div className="overflow-y-auto px-4 py-4">
        <div className="flex items-end justify-between">
          <Wordmark size={30} />
          <span className="text-[11px] text-[var(--color-fog-2)]">{versionLabel()}</span>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-[var(--color-fog-1)]">
          {t('credits.about')}
        </p>

        <div className="mt-4 border-t border-[var(--color-line)]/60 pt-3">
          <div className="mb-2 text-[11px] font-medium text-[var(--color-fog-2)]">{t('credits.builtWith')}</div>
          {STACK.map(([name, role]) => (
            <div key={name} className="flex gap-2 py-0.5 text-[11px]">
              <span className="w-[128px] flex-none text-[var(--color-fog-0)]">{name}</span>
              <span className="text-[var(--color-fog-2)]">{t(role)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-[var(--color-line)]/60 pt-3 text-[11px]">
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.repo')}</span>
            <a
              href={REPOSITORY}
              className="text-[var(--color-link)] hover:underline"
              onClick={(event) => {
                event.preventDefault()
                window.valendo.openExternal(REPOSITORY)
              }}
            >
              samaBR85/VaLendo-TeleprompterSuite
            </a>
          </div>
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.idea')}</span>
            <span className="text-[var(--color-fog-1)]">Aline</span>
          </div>
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.dev')}</span>
            <span className="text-[var(--color-fog-1)]">samaBR85, com Claude Code</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
