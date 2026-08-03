import { useEffect } from 'react'
import { LANGS, type Lang } from '@shared/i18n'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

interface Props {
  /** o idioma em vigor — já vem detectado do sistema, então quase sempre está certo */
  lang: Lang
  /** trocar aqui reescreve a amostra na hora; ver a ação `estreia/language` */
  onLang: (lang: Lang) => void
  /** começar com o editor em branco */
  onNovo: () => void
  /** ficar com o roteiro de demonstração que já está na tela */
  onDemo: () => void
  /** abrir um .valendo salvo */
  onAbrir: () => void
}

/**
 * As boas-vindas da primeira abertura — o único momento em que este modal
 * aparece na vida da instalação.
 *
 * Existe por duas razões que se resolvem no mesmo lugar. A primeira é o idioma:
 * o app adivinha pelo Windows e acerta quase sempre, mas "quase" não serve para
 * quem opera em outra língua que a do computador do estúdio, e trocar depois
 * não desfaz a primeira impressão de abrir num idioma estrangeiro. A segunda é
 * que hoje o app abre direto num roteiro de demonstração, sem dizer que é
 * demonstração — quem instala não sabe se aquilo é dele, se pode apagar, nem
 * onde estaria o próprio roteiro.
 *
 * Escapar por Escape ou clicando fora vale como DEMO, nunca como "em branco":
 * uma tela vazia é o resultado mais assustador dos três, e não pode ser o que
 * acontece por acidente.
 */
export function Welcome({ lang, onLang, onNovo, onDemo, onAbrir }: Props): React.JSX.Element {
  const { t } = useT()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onDemo()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onDemo])

  return (
    <div
      data-welcome
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onMouseDown={onDemo}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 620 }}
        className="flex flex-col overflow-hidden rounded-[16px] border border-[var(--color-line)] bg-[var(--color-ink-1)]"
      >
        <div className="px-[26px] pt-[24px] pb-[20px]">
          <div className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-[var(--color-fog-0)]">
            {t('welcome.title')}
          </div>
          <div className="mt-[9px] text-[14.5px] leading-relaxed text-[var(--color-fog-1)]">
            {t('welcome.subtitle')}
          </div>

          <div className="mt-[22px] text-[10.5px] font-semibold tracking-[0.14em] text-[var(--color-fog-2)] uppercase">
            {t('welcome.language')}
          </div>
          {/* cada idioma escrito no próprio idioma: quem não lê o daqui precisa se achar */}
          <div className="mt-[9px] flex flex-wrap gap-[7px]">
            {LANGS.map((idioma) => (
              <button
                key={idioma.id}
                type="button"
                data-welcome-lang={idioma.id}
                aria-pressed={idioma.id === lang}
                onClick={() => onLang(idioma.id)}
                className={
                  idioma.id === lang
                    ? 'rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)]/16 px-[12px] py-[7px] text-[13.5px] font-medium text-[var(--color-fog-0)]'
                    : 'rounded-md border border-[var(--color-line)] px-[12px] py-[7px] text-[13.5px] text-[var(--color-fog-1)] hover:border-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]'
                }
              >
                {idioma.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[10px] border-t border-[var(--color-line)] bg-[var(--color-ink-0)] px-[26px] py-[20px]">
          <Caminho
            icone="project"
            data="novo"
            titulo={t('welcome.new')}
            detalhe={t('welcome.newHint')}
            onClick={onNovo}
          />
          <Caminho
            icone="play"
            data="demo"
            titulo={t('welcome.demo')}
            detalhe={t('welcome.demoHint')}
            destaque
            onClick={onDemo}
          />
          <Caminho
            icone="projectOpen"
            data="abrir"
            titulo={t('welcome.open')}
            detalhe={t('welcome.openHint')}
            onClick={onAbrir}
          />
        </div>
      </div>
    </div>
  )
}

function Caminho({
  icone,
  data,
  titulo,
  detalhe,
  destaque,
  onClick
}: {
  icone: React.ComponentProps<typeof Icon>['name']
  data: string
  titulo: string
  detalhe: string
  destaque?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      data-welcome-acao={data}
      autoFocus={destaque}
      onClick={onClick}
      className={
        'flex flex-col items-start gap-[7px] rounded-[10px] border px-[14px] py-[13px] text-left ' +
        (destaque
          ? 'border-[var(--color-go)]/45 bg-[var(--color-go)]/12 hover:bg-[var(--color-go)]/20'
          : 'border-[var(--color-line)] hover:border-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)]')
      }
    >
      <span className={destaque ? 'text-[var(--color-go)]' : 'text-[var(--color-fog-2)]'}>
        <Icon name={icone} size={18} />
      </span>
      <span
        className={
          'text-[14px] font-medium ' + (destaque ? 'text-[var(--color-go)]' : 'text-[var(--color-fog-0)]')
        }
      >
        {titulo}
      </span>
      <span className="text-[12px] leading-snug text-[var(--color-fog-2)]">{detalhe}</span>
    </button>
  )
}
