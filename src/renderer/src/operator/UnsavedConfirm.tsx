import { useEffect } from 'react'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

interface Props {
  onCancel: () => void
  onSave: () => void
  onDiscard: () => void
  /** o que vai acontecer com o que não foi salvo — o padrão fala de "criar novo" */
  detalhe?: string
  /** rótulo do botão que segue em frente sem salvar */
  rotuloDescartar?: string
  /** rótulo do botão que salva antes de seguir */
  rotuloSalvar?: string
}

/**
 * Modal de "tem mudança não salva" — mesmo material do CloseConfirm (mesma
 * modal, o mesmo risco de perder trabalho), mas com três saídas em vez de
 * duas: quem chegou aqui pode ainda querer salvar o que tinha, não só cancelar
 * ou seguir sem salvar. `Cancelar` é o padrão (Escape e clique fora caem aqui
 * também) — a ação que descarta nunca deve ser a que dispara sem querer.
 *
 * Serve a DOIS caminhos: criar um projeto em branco por cima do que está
 * aberto (o caso original) e fechar o app. O título é o mesmo nos dois — o
 * fato é o mesmo —, e só o que vem depois muda, por isso os rótulos entram
 * por prop em vez de virarem um segundo componente quase igual a este.
 */
export function UnsavedConfirm({
  onCancel,
  onSave,
  onDiscard,
  detalhe,
  rotuloDescartar,
  rotuloSalvar
}: Props): React.JSX.Element {
  const { t } = useT()
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onMouseDown={onCancel}>
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 630 }}
        className="flex flex-col overflow-hidden rounded-[18px] border border-[var(--color-warn)]/40 bg-[var(--color-ink-1)]"
      >
        <div className="flex items-start gap-[18px] px-6 py-6">
          <span className="mt-[3px] flex-none text-[var(--color-warn)]">
            <Icon name="alert" size={30} />
          </span>
          <div>
            <div className="text-[19.5px] font-medium text-[var(--color-fog-0)]">{t('unsaved.title')}</div>
            <div className="mt-1.5 text-[18px] leading-relaxed text-[var(--color-fog-1)]">
              {detalhe ?? t('unsaved.detail')}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--color-line)] px-6 py-[18px]">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-md px-[18px] py-[9px] text-[18px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            {t('unsaved.cancel')}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md bg-[var(--color-live)]/16 px-[18px] py-[9px] text-[18px] font-medium text-[var(--color-live)] hover:bg-[var(--color-live)]/24"
          >
            {rotuloDescartar ?? t('unsaved.discard')}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-[var(--color-go)]/16 px-[18px] py-[9px] text-[18px] font-medium text-[var(--color-go)] hover:bg-[var(--color-go)]/24"
          >
            {rotuloSalvar ?? t('unsaved.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
