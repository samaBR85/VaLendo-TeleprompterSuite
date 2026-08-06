import { useT } from '../i18n'
import { Modal } from '../ui/Modal'
import { Wordmark, versionLabel } from '../ui/Wordmark'

const REPOSITORY = 'https://github.com/samaBR85/Valendo-TeleprompterSuite'
const LICENCA = 'https://www.gnu.org/licenses/gpl-3.0.html'
const INTER = 'https://github.com/rsms/inter'

const STACK = [
  ['Electron', 'credits.role.electron'],
  ['React + TypeScript', 'credits.role.react'],
  ['Vite + Tailwind', 'credits.role.vite'],
  ['Immer', 'credits.role.immer'],
  ['mammoth · pdf.js', 'credits.role.import']
] as const

const RELEASES = 'https://github.com/samaBR85/Valendo-TeleprompterSuite/releases/latest'

interface Props {
  /** versão anunciada no GitHub, quando é mais nova que esta */
  atualizacao: string | null
  onClose: () => void
}

export function Credits({ atualizacao, onClose }: Props): React.JSX.Element {
  const { t } = useT()
  return (
    <Modal title={t('app.credits')} width={480} onClose={onClose}>
      <div className="overflow-y-auto px-4 py-4">
        <div className="flex items-end justify-between">
          <Wordmark size={30} />
          <span className="text-[11px] text-[var(--color-fog-2)]">{versionLabel()}</span>
        </div>

        {/* A versão nova aparece aqui, e SÓ quando existe.
            Aqui porque é onde a pergunta nasce: quem abriu esta caixa está
            querendo saber de versão. E o app não baixa nada — o link leva à
            página, e quem decide instalar é a pessoa. */}
        {atualizacao ? (
          <a
            href={RELEASES}
            onClick={(event) => {
              event.preventDefault()
              window.valendo.openExternal(RELEASES)
            }}
            className="mt-3 flex items-center gap-2 rounded-md border border-[var(--color-go)]/40 bg-[var(--color-go)]/10 px-3 py-2 text-[12px] text-[var(--color-go)] hover:bg-[var(--color-go)]/16"
          >
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-go)]" />
            {t('app.updateAvailable', { versao: atualizacao })}
          </a>
        ) : null}

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
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.dev')}</span>
            {/* O VALOR também vem do dicionário, e não só o rótulo: ele tem uma
                palavra de ligação dentro — "com", "with", "mit" —, e escrita
                aqui ela vazava em português para os seis idiomas. Nome próprio
                não se traduz; conjunção sim. */}
            <span className="text-[var(--color-fog-1)]">{t('credits.devValue')}</span>
          </div>
          <div className="flex gap-2 py-0.5">
            {/* "QA" fica em QA nos seis idiomas, como `app.assets` e o rótulo
                OVERLAY: é o nome do ofício, e traduzir viraria uma sigla que
                ninguém do meio usa. O "e" entre os dois nomes, esse muda. */}
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.qa')}</span>
            <span className="text-[var(--color-fog-1)]">{t('credits.qaValue')}</span>
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
          {/* a fonte do prompter vai EMBUTIDA no app, e a OFL pede que o aviso
              de direitos viaje com ela; o texto completo está no instalador,
              em `resources/Inter-LICENSE.txt` */}
          <div className="flex gap-2 py-0.5">
            <span className="w-[128px] flex-none text-[var(--color-fog-2)]">{t('credits.font')}</span>
            <a
              href={INTER}
              className="text-[var(--color-link)] hover:underline"
              onClick={(event) => {
                event.preventDefault()
                window.valendo.openExternal(INTER)
              }}
            >
              Inter · SIL OFL 1.1
            </a>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-fog-2)]">{t('credits.freedom')}</p>
        </div>
      </div>
    </Modal>
  )
}
