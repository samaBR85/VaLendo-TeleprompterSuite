import { useState } from 'react'
import type { Apresentador } from '@shared/types'
import { CORES_DE_APRESENTADOR } from '@shared/apresentadores'
import { useT } from '../../i18n'
import { ajuda } from '../../ui/ajuda'
import { Icon } from '../../ui/Icon'
import { Ficha } from '../../ui/console'
import { SeletorDeCor } from '../../ui/SeletorDeCor'

/**
 * O chip de um apresentador: a cor que ele pinta, o nome como está no roteiro,
 * e o que fazer quando o par se perde.
 *
 * O seletor de cor é o próprio `input[type=color]` do sistema — o mesmo que já
 * escolhe texto e fundo logo acima. Inventar uma paleta própria aqui daria
 * duas gramáticas de cor no mesmo painel.
 */
export function ChipDeApresentador({
  quem,
  orfao,
  global,
  onCor,
  onPrever,
  onOcultar,
  onRenomear,
  onRelink,
  onRemover
}: {
  quem: Apresentador
  orfao: boolean
  /** o GLOBAL está mandando: este interruptor mostra o forçado e trava */
  global: boolean
  onCor: (cor: string) => void
  /* a prévia da cor do apresentador tinge as falas dele no editor e no vidro
     enquanto o botão está pressionado — ver `onPrever` em `SeletorDeCor` */
  onPrever: (cor: string | undefined) => void
  onOcultar: () => void
  onRenomear: (nome: string) => void
  onRelink?: () => void
  onRemover: () => void
}): React.JSX.Element {
  const { t } = useT()
  /* renomear no lugar, sem modal: o campo nasce com o nome atual selecionado,
     Enter confirma e Esc desiste. Perder o foco também confirma — desistir por
     descuido é mais raro que confirmar por descuido, e o Ctrl+Z devolve */
  const [editando, setEditando] = useState<string | null>(null)
  return (
    <div
      data-apresentador-chip={quem.id}
      className="flex items-center gap-1.5 rounded-md border px-1.5 py-1"
      style={{
        borderColor: orfao ? 'var(--color-warn)' : 'var(--color-edge)',
        background: orfao ? 'color-mix(in srgb, var(--color-warn) 10%, transparent)' : '#212126'
      }}
    >
      <SeletorDeCor
        valor={quem.cor}
        atalhos={CORES_DE_APRESENTADOR}
        ajudaId="insp.presenterColor"
        rotulo={t('insp.presenterColor', { nome: quem.nome })}
        onCor={onCor}
        onPrever={onPrever}
        className="h-5 w-5"
      />
      {editando === null ? (
        <span
          {...ajuda('insp.presenterRename')}
          title={t('insp.presenterRename')}
          onDoubleClick={() => setEditando(quem.nome)}
          className="min-w-0 flex-1 cursor-text truncate text-[11px]"
          style={{ color: orfao ? 'var(--color-warn)' : quem.cor }}
        >
          {quem.nome}
        </span>
      ) : (
        <input
          autoFocus
          data-apresentador-nome={quem.id}
          value={editando}
          onChange={(event) => setEditando(event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            /* Esc desiste ANTES de perder o foco, senão o `onBlur` confirmaria
               justamente o que a pessoa acabou de recusar */
            if (event.key === 'Escape') {
              setEditando(null)
              event.currentTarget.blur()
            }
          }}
          onBlur={() => {
            if (editando !== null) onRenomear(editando)
            setEditando(null)
          }}
          className="min-w-0 flex-1 rounded border border-[var(--color-accent)] bg-[var(--color-ink-2)] px-1 text-[11px] outline-none"
          style={{ color: quem.cor }}
        />
      )}
      {/* esconder SÓ este nome na saída. Travado enquanto o GLOBAL manda:
          editá-lo não mudaria nada, e deixá-lo clicável sugeriria o contrário */}
      <button
        type="button"
        data-esconder-apresentador={quem.id}
        {...ajuda('insp.presenterHide')}
        title={t('insp.presenterHide')}
        aria-pressed={global || (quem.oculto ?? false)}
        disabled={global}
        onClick={onOcultar}
        className={`flex-none rounded-[4px] px-1 py-0.5 text-[8px] font-bold tracking-[0.04em] transition-colors ${
          global
            ? 'cursor-not-allowed bg-[var(--color-accent)] text-[#1c1020]'
            : quem.oculto
              ? 'bg-[var(--color-accent)] text-[#1c1020]'
              : 'border border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
        }`}
      >
        {t('insp.presenterHideAll.key')}
      </button>
      {orfao ? (
        <>
          <span className="flex-none text-[9px] text-[var(--color-warn)]" title={t('insp.presenterOrphan')}>
            <Icon name="alert" size={11} />
          </span>
          {/* RELINK: aponta o MESMO apresentador para o nome agora selecionado
              no editor. Mantém id e cor, então tudo que já estava pintado
              continua pintado — corrigir "HARI" para "HARI OLIVEIRA" no
              roteiro deixa de custar remover e criar de novo. */}
          <Ficha
            {...ajuda('insp.presenterRelink')}
            disabled={!onRelink}
            onClick={onRelink}
            className="flex-none px-1.5 py-0.5 text-[9px] font-bold tracking-[0.04em] disabled:opacity-30"
          >
            {t('insp.presenterRelink.key')}
          </Ficha>
        </>
      ) : null}
      <button
        type="button"
        {...ajuda('insp.presenterRemove')}
        aria-label={t('insp.presenterRemove')}
        onClick={onRemover}
        className="flex-none rounded p-0.5 text-[var(--color-fog-3)] hover:bg-[var(--color-live)]/12 hover:text-[var(--color-live)]"
      >
        <Icon name="close" size={10} />
      </button>
    </div>
  )
}
