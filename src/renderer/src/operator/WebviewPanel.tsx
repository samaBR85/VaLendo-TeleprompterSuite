import { useState } from 'react'
import type { Action } from '@shared/actions'
import type { WebviewInfo } from '@shared/api'
import { Icon } from '../ui/Icon'

interface Props {
  info: WebviewInfo
  enabled: boolean
  dispatch: (action: Action) => void
  onClose: () => void
}

/**
 * A página da rede local: quem está na gravação acompanha a leitura pelo
 * próprio telefone, sem nenhum programa instalado.
 */
export function WebviewPanel({ info, enabled, dispatch, onClose }: Props): React.JSX.Element {
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiar = (url: string): void => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiado(url)
      setTimeout(() => setCopiado(null), 2_000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        data-webview-panel
        onClick={(event) => event.stopPropagation()}
        className="w-[440px] rounded-xl border border-[var(--color-line)] bg-[var(--color-ink-1)] p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Icon name="webview" size={18} />
          <h2 className="text-[15px] text-[var(--color-fog-0)]">Ver na rede</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="ml-auto text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <p className="mb-4 text-[12px] leading-relaxed text-[var(--color-fog-1)]">
          Quem estiver no mesmo wi-fi abre o endereço no navegador e acompanha a leitura ao vivo,
          igualzinho ao que o apresentador está vendo. Não precisa instalar nada.
        </p>

        <button
          type="button"
          data-webview-toggle
          onClick={() => dispatch({ type: 'webview/set', enabled: !enabled })}
          className={`mb-4 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${
            enabled
              ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/12 text-[var(--color-go)]'
              : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
          }`}
        >
          <span>{enabled ? 'No ar na rede local' : 'Publicar na rede local'}</span>
          <span
            className={`h-2.5 w-2.5 flex-none rounded-full ${
              enabled ? 'bg-[var(--color-go)]' : 'border border-[var(--color-line)]'
            }`}
          />
        </button>

        {info.error ? (
          <p className="mb-3 rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2 text-[11px] text-[var(--color-warn)]">
            {info.error}
          </p>
        ) : null}

        {enabled && !info.error ? (
          info.addresses.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] text-[var(--color-fog-2)]">
                {info.addresses.length > 1
                  ? 'Esta máquina está em mais de uma rede — use o endereço da rede em que o telefone está:'
                  : 'Digite no navegador do telefone:'}
              </div>
              {info.addresses.map((address) => {
                const url = `http://${address}:${info.port}`
                return (
                  <button
                    key={address}
                    type="button"
                    data-webview-url
                    onClick={() => copiar(url)}
                    title="Copiar"
                    className="flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] px-3 py-2 text-left font-mono text-[15px] text-[var(--color-fog-0)] hover:bg-[var(--color-ink-3)]"
                  >
                    {url}
                    <span className="ml-auto text-[10px] text-[var(--color-fog-2)]">
                      {copiado === url ? 'copiado' : 'copiar'}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-warn)]">
              Esta máquina não está em nenhuma rede. Conecte o cabo ou o wi-fi.
            </p>
          )
        ) : null}

        {/* dito uma vez, sem alarde: é uma página aberta, e quem tem o endereço lê */}
        <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          Enquanto estiver ligado, qualquer pessoa na mesma rede que souber o endereço consegue ler o
          roteiro — não há senha. Só a aba que está no ar é publicada; as outras não saem daqui.
        </p>
      </div>
    </div>
  )
}
