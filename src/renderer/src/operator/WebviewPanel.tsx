import { useState } from 'react'
import type { Action } from '@shared/actions'
import type { WebviewInfo } from '@shared/api'
import { mbPorMinuto, perfilPorId, PERFIS_DA_REDE, type PerfilDeRede } from '@shared/proxy'
import type { Chave } from '@shared/i18n'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { QrCode } from '../ui/QrCode'

interface Props {
  info: WebviewInfo
  enabled: boolean
  /** peso do vídeo servido à rede — a tela do apresentador não é afetada */
  videoPerfil: PerfilDeRede
  dispatch: (action: Action) => void
  onClose: () => void
}

/**
 * A página da rede local: quem está na gravação acompanha a leitura pelo
 * próprio telefone, sem nenhum programa instalado.
 */
export function WebviewPanel({ info, enabled, videoPerfil, dispatch, onClose }: Props): React.JSX.Element {
  const { t } = useT()
  const [copiado, setCopiado] = useState<string | null>(null)
  const perfilAtual = perfilPorId(videoPerfil)

  // "no ar" é o que está acontecendo, não o que foi pedido: com a porta
  // ocupada, o botão verde seria mentira
  const noAr = enabled && info.running && !info.error

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
          {/* verde, a mesma cor da tecla da rede no poço AR e do rótulo de
              publicar aqui embaixo — o painel inteiro fala de uma coisa só */}
          <Icon name="webview" size={18} className="text-[var(--color-go)]" />
          <h2 className="text-[15px] text-[var(--color-fog-0)]">{t('web.title')}</h2>
          <button
            type="button"
            aria-label={t('app.close')}
            onClick={onClose}
            className="ml-auto text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <p className="mb-4 text-[12px] leading-relaxed text-[var(--color-fog-1)]">
          {t('web.intro')}
        </p>

        <button
          type="button"
          data-webview-toggle
          onClick={() => dispatch({ type: 'webview/set', enabled: !enabled })}
          className={`mb-4 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-[13px] transition-colors ${
            noAr
              ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/12 text-[var(--color-go)]'
              : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
          }`}
        >
          {/* verde nos DOIS estados: é o rótulo do que este botão publica, e o
              verde é a cor do "no ar" em todo o app. Quem diz se está ligado
              continua sendo a moldura tingida e o ponto à direita — o texto
              apagado em cinza fazia o botão parecer indisponível */}
          <span className="text-[var(--color-go)]">{noAr ? t('web.live') : t('web.publish')}</span>
          <span
            className={`h-2.5 w-2.5 flex-none rounded-full ${
              noAr ? 'bg-[var(--color-go)]' : 'border border-[var(--color-line)]'
            }`}
          />
        </button>

        {/* o peso do vídeo mora aqui, e não nos ajustes de saída, porque é
            assunto da rede: a tela do apresentador recebe sempre o original */}
        <div className="mb-4">
          <div className="mb-1.5 text-[11px] text-[var(--color-fog-2)]">{t('web.videoWeight')}</div>
          <div className="flex flex-wrap gap-1.5">
            {PERFIS_DA_REDE.map((id) => {
              const perfil = perfilPorId(id)
              const escolhido = videoPerfil === id
              return (
                <button
                  key={id}
                  type="button"
                  data-web-perfil={id}
                  title={
                    perfil
                      ? `${perfil.largura}×${perfil.altura} · ${perfil.kbps} kbps · ${mbPorMinuto(perfil).toFixed(1)} MB/min`
                      : t('web.videoOriginalHint')
                  }
                  onClick={() => dispatch({ type: 'webview/videoPerfil', perfil: id })}
                  className={`rounded-md border px-2.5 py-1 text-[11px] ${
                    escolhido
                      ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/12 text-[var(--color-go)]'
                      : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
                  }`}
                >
                  {t(`web.quality.${id}` as Chave)}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--color-fog-2)]">
            {perfilAtual
              ? t('web.videoWeightDetail', {
                  tamanho: `${perfilAtual.largura}×${perfilAtual.altura}`,
                  mb: mbPorMinuto(perfilAtual).toFixed(1)
                })
              : t('web.videoOriginalHint')}
          </p>
        </div>

        {info.error ? (
          <p className="mb-3 rounded-md border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2 text-[11px] text-[var(--color-warn)]">
            {info.error}
          </p>
        ) : null}

        {noAr ? (
          info.addresses.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] text-[var(--color-fog-2)]">
                {info.addresses.length > 1
                  ? t('web.multiNet')
                  : t('web.pointCamera')}
              </div>
              {info.addresses.map((address) => {
                const url = `http://${address}:${info.port}`
                return (
                  <div
                    key={address}
                    className="flex items-center gap-3 rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] p-2.5"
                  >
                    <QrCode text={url} size={104} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="font-mono text-[15px] break-all text-[var(--color-fog-0)]">{url}</span>
                      <button
                        type="button"
                        data-webview-url
                        onClick={() => copiar(url)}
                        className="self-start rounded border border-[var(--color-line)] px-2 py-1 text-[11px] text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
                      >
                        {copiado === url ? t('web.copied') : t('web.copy')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-warn)]">
              {t('web.noNetwork')}
            </p>
          )
        ) : null}

        {/* dito uma vez, sem alarde: é uma página aberta, e quem tem o endereço lê */}
        <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {t('web.warning')}
        </p>
      </div>
    </div>
  )
}
