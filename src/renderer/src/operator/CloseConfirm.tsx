import { useEffect } from 'react'
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[18vh]" onMouseDown={onCancel}>
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{ width: 420 }}
        className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-warn)]/40 bg-[var(--color-ink-1)]"
      >
        <div className="flex items-start gap-3 px-4 py-4">
          <span className="mt-0.5 flex-none text-[var(--color-warn)]">
            <Icon name="alert" size={20} />
          </span>
          <div>
            <div className="text-[13px] font-medium text-[var(--color-fog-0)]">A transmissão está no ar.</div>
            <div className="mt-1 text-[12px] leading-relaxed text-[var(--color-fog-1)]">
              Fechar o app agora apaga o texto na tela do apresentador.
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--color-line)] px-4 py-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-[var(--color-live)]/16 px-3 py-1.5 text-[12px] font-medium text-[var(--color-live)] hover:bg-[var(--color-live)]/24"
          >
            Encerrar a transmissão
          </button>
        </div>
      </div>
    </div>
  )
}
