import { useT } from '../i18n'
import { Modal } from '../ui/Modal'
import { Wordmark, versionLabel } from '../ui/Wordmark'

const REPOSITORY = 'https://github.com/samaBR85/Valendo-TeleprompterSuite'
const LICENCA = 'https://www.gnu.org/licenses/gpl-3.0.html'

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

        {/* Aqui morava um parágrafo explicando o que o app faz.
            Saiu: quem abre o About já está DENTRO do app, e o subtítulo
            "A Teleprompter Suite" logo acima do nome já responde a pergunta.
            Texto de apresentação tem lugar — o site, o README —, e este não é
            um deles. O que esta caixa responde é outra coisa: qual versão, do
            que é feita, de quem é, e sob qual licença. */}

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
              {/* o dono continua `samaBR85` aqui: é o usuário do GitHub, e o
                  texto do link tem que bater com o endereço que ele abre */}
              samaBR85/Valendo-TeleprompterSuite
            </a>
          </div>
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.idea')}</span>
            <span className="text-[var(--color-fog-1)]">Aline</span>
          </div>
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.dev')}</span>
            <span className="text-[var(--color-fog-1)]">samaBR, com Claude Code</span>
          </div>
          {/* a GPL pede que um programa interativo mostre a licença a quem
              usa; aqui, com o link para o texto que vale */}
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.license')}</span>
            <a
              href={LICENCA}
              className="text-[var(--color-link)] hover:underline"
              onClick={(event) => {
                event.preventDefault()
                window.valendo.openExternal(LICENCA)
              }}
            >
              GPL-3.0-or-later
            </a>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-fog-2)]">{t('credits.freedom')}</p>
        </div>
      </div>
    </Modal>
  )
}
