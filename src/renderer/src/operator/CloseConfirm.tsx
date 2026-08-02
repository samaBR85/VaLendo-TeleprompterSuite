import { useEffect } from 'react'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'

interface Props {
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Modal do próprio app para o pedido de fechar com a transmissão no ar — em
 * vez do diálogo nativo do sistema, que quebra a identidade visual do resto
 * do app. `Cancelar` é o padrão (Escape e clique fora caem aqui também): a
 * ação de risco nunca deve ser a que dispara sem querer.
 */
export function CloseConfirm({ onCancel, onConfirm }: Props): React.JSX.Element {
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
    // `items-center`, sem o `pt-[18vh]` de antes: aquele padding fixo prendia
    // a modal perto do topo em vez do centro de verdade da tela
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
            <div className="text-[19.5px] font-medium text-[var(--color-fog-0)]">{t('close.title')}</div>
            <div className="mt-1.5 text-[18px] leading-relaxed text-[var(--color-fog-1)]">
              {t('close.detail')}
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
            {t('close.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-[var(--color-live)]/16 px-[18px] py-[9px] text-[18px] font-medium text-[var(--color-live)] hover:bg-[var(--color-live)]/24"
          >
            {t('close.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
