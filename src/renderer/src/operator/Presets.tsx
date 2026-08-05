import { useEffect, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { CORES_DE_PRESET, type Preset, type Presets } from '@shared/presets'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'
import { Icon } from '../ui/Icon'
import { Tecla } from '../ui/console'

/**
 * Os cinco presets de aparência, no rodapé dos Ajustes.
 *
 * Empilhados, e não lado a lado: a coluna tem pouco mais de 230px úteis, e
 * cinco botões em fila dariam 44px cada — cabe o número, cabe a cor, não cabe o
 * NOME. E o nome é o que vai importar daqui a dois meses, quando "o azul" não
 * quiser dizer nada. Empilhado cabem os três, e o número continua no mesmo
 * lugar de sempre para a mão achar sem ler.
 *
 * Guardar são DOIS passos deliberados — aperta SAVE PRESET, escolhe o lugar —
 * porque escrever por cima de um preset nomeado à mão não pode acontecer por
 * um clique torto. Aplicar é UM clique só, e a rede embaixo dele não é uma
 * janela de confirmação (confirmar coisa no meio de um programa trava a mão de
 * quem opera) e sim o desfazer: o reducer aplica aparência e apresentadores num
 * passo único de histórico, então um `Ctrl+Z` devolve os dois juntos.
 */
export function FileiraDePresets({
  presets,
  tabId,
  aberto,
  onAberto,
  dispatch
}: {
  presets: Presets
  tabId: string
  aberto: boolean
  onAberto: (aberto: boolean) => void
  dispatch: (action: Action) => void
}): React.JSX.Element {
  const { t } = useT()
  const [guardando, setGuardando] = useState(false)
  const [menu, setMenu] = useState<number | null>(null)
  const [renomeando, setRenomeando] = useState<number | null>(null)
  const [aplicado, setAplicado] = useState<number | null>(null)

  /** "Preset 3" enquanto ninguém batizou — no idioma do app, nunca em português fixo. */
  const nomeDe = (preset: Preset, lugar: number): string =>
    preset.nome || t('insp.presetN', { n: lugar + 1 })

  // Esc desfaz qualquer modo aberto. É a saída que a mão procura primeiro, e
  // sem ela o modo "guardar em qual" viraria uma armadilha: sair dele exigiria
  // clicar em algum lugar, e todo lugar ali dentro grava por cima de alguma coisa
  useEffect(() => {
    if (!guardando && menu === null) return
    const cancelar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        setGuardando(false)
        setMenu(null)
      }
    }
    const forade = (): void => setMenu(null)
    window.addEventListener('keydown', cancelar)
    window.addEventListener('mousedown', forade)
    return () => {
      window.removeEventListener('keydown', cancelar)
      window.removeEventListener('mousedown', forade)
    }
  }, [guardando, menu])

  // o aceso do "acabei de aplicar" apaga sozinho: é um recado do instante, não
  // um estado do preset — deixá-lo aceso mentiria assim que alguém mexesse num
  // slider e a aba deixasse de ser igual ao preset
  useEffect(() => {
    if (aplicado === null) return
    const timer = setTimeout(() => setAplicado(null), 4000)
    return () => clearTimeout(timer)
  }, [aplicado])

  const guardarEm = (lugar: number): void => {
    dispatch({ type: 'preset/guardar', lugar })
    setGuardando(false)
    // e já entra em renomear, como a aba duplicada faz: batizar é sempre a
    // próxima coisa que se quer fazer, e obrigar a um segundo gesto para isso
    // é o que faz todo preset acabar chamado "Preset 3"
    setRenomeando(lugar)
  }

  const aplicar = (lugar: number): void => {
    dispatch({ type: 'preset/aplicar', lugar, tabId })
    setAplicado(lugar)
  }

  const comEstrela = presets.padrao !== null ? presets.slots[presets.padrao] : null

  return (
    <div className="flex-none border-t border-[var(--color-edge)]" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        data-presets-toggle
        {...ajuda('insp.presetsToggle')}
        aria-expanded={aberto}
        onClick={() => onAberto(!aberto)}
        className="flex h-[26px] w-full items-center gap-1.5 px-2.5 text-left"
      >
        <span className="k-microcaps flex-none">{t('insp.presets')}</span>
        {/* fechado continua informando: sem isto a linha que ele ocupa não
            paga o próprio espaço */}
        {!aberto && comEstrela ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-[9px] text-[var(--color-warn)]">★</span>
            <span
              className="h-[7px] w-[7px] flex-none rounded-full"
              style={{ background: comEstrela.cor }}
            />
            <span className="truncate text-[10px] text-[var(--color-fog-2)]">
              {nomeDe(comEstrela, presets.padrao as number)}
            </span>
          </span>
        ) : null}
        <Icon
          name="down"
          size={11}
          className={`ml-auto flex-none text-[var(--color-fog-3)] transition-transform ${aberto ? '' : '-rotate-90'}`}
        />
      </button>

      {aberto ? (
        <div className="px-2.5 pt-0.5 pb-2.5">
          <div className="k-poco flex-col gap-[3px]">
            {presets.slots.map((preset, lugar) => (
              <LugarDePreset
                key={lugar}
                lugar={lugar}
                preset={preset}
                nome={preset ? nomeDe(preset, lugar) : ''}
                temEstrela={presets.padrao === lugar}
                guardando={guardando}
                aceso={aplicado === lugar}
                renomeando={renomeando === lugar}
                onRenomear={(nome) => {
                  dispatch({ type: 'preset/renomear', lugar, nome })
                  setRenomeando(null)
                }}
                onCancelarRenome={() => setRenomeando(null)}
                onClick={() => (guardando ? guardarEm(lugar) : preset ? aplicar(lugar) : undefined)}
                onMenu={() => setMenu(lugar)}
              />
            ))}
          </div>

          <Tecla
            data-preset-save
            {...ajuda('insp.presetSave')}
            title={guardando ? t('insp.presetCancel') : t('insp.presetSave')}
            acesa={guardando}
            cor="var(--color-go)"
            onClick={() => setGuardando((v) => !v)}
            className="mt-2 h-[30px] w-full rounded-md text-[11px] font-semibold tracking-[0.04em]"
          >
            {guardando ? t('insp.presetCancel') : t('insp.presetSave')}
          </Tecla>

          {guardando ? (
            <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-fog-3)]">
              {t('insp.presetOverwrite')}
            </p>
          ) : aplicado !== null ? (
            <p className="mt-1.5 text-[10px] leading-snug text-[var(--color-go)]">↩ {t('insp.presetUndo')}</p>
          ) : null}

          {menu !== null ? (
            <MenuDoPreset
              lugar={menu}
              cor={presets.slots[menu]?.cor ?? CORES_DE_PRESET[0]}
              temEstrela={presets.padrao === menu}
              onAplicar={() => {
                aplicar(menu)
                setMenu(null)
              }}
              onRenomear={() => {
                setRenomeando(menu)
                setMenu(null)
              }}
              onCor={(cor) => dispatch({ type: 'preset/cor', lugar: menu, cor })}
              onEstrela={() =>
                dispatch({ type: 'preset/padrao', lugar: presets.padrao === menu ? null : menu })
              }
              onApagar={() => {
                dispatch({ type: 'preset/apagar', lugar: menu })
                setMenu(null)
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function LugarDePreset({
  lugar,
  preset,
  nome,
  temEstrela,
  guardando,
  aceso,
  renomeando,
  onRenomear,
  onCancelarRenome,
  onClick,
  onMenu
}: {
  lugar: number
  preset: Preset | null
  nome: string
  temEstrela: boolean
  guardando: boolean
  aceso: boolean
  renomeando: boolean
  onRenomear: (nome: string) => void
  onCancelarRenome: () => void
  onClick: () => void
  onMenu: () => void
}): React.JSX.Element {
  const { t } = useT()
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renomeando) campo.current?.select()
  }, [renomeando])

  if (renomeando) {
    return (
      <input
        ref={campo}
        data-preset-rename={lugar}
        defaultValue={preset?.nome ?? ''}
        maxLength={24}
        placeholder={nome}
        onBlur={(e) => onRenomear(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onRenomear(e.currentTarget.value)
          // Esc larga o nome como estava — e não como o campo está agora
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancelarRenome()
          }
        }}
        className="h-[26px] rounded border border-[var(--color-accent)] bg-[var(--color-ink-0)] px-2 text-[11.5px] text-[var(--color-fog-0)] outline-none"
      />
    )
  }

  const vazio = preset === null
  const cor = preset?.cor ?? '#2e2e34'

  return (
    <button
      type="button"
      data-preset-slot={lugar}
      {...ajuda('insp.presetSlot')}
      // guardar num lugar vazio é legítimo; APLICAR um lugar vazio não é
      disabled={vazio && !guardando}
      title={vazio ? t('insp.presetEmptySlot', { n: lugar + 1 }) : nome}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        if (!vazio) onMenu()
      }}
      className={`flex h-[26px] items-center gap-[7px] rounded border px-[7px] text-left ${
        vazio
          ? 'border-dashed border-[#2e2e34] bg-transparent'
          : 'k-tecla border-[var(--color-edge)]'
      } ${guardando ? 'ring-1 ring-[var(--color-go)]/50' : ''} ${
        aceso ? 'k-tecla-acesa' : ''
      } disabled:cursor-default disabled:opacity-100`}
      style={aceso ? ({ '--k-cor': cor } as React.CSSProperties) : undefined}
    >
      <span className="w-[7px] flex-none text-center font-mono text-[10px] font-semibold text-[var(--color-fog-3)]">
        {lugar + 1}
      </span>
      <span className="h-2 w-2 flex-none rounded-full" style={{ background: cor }} />
      <span
        className={`min-w-0 flex-1 truncate text-[11.5px] ${
          vazio ? 'text-[var(--color-fog-3)] italic' : 'text-[var(--color-fog-05)]'
        }`}
      >
        {vazio ? t('insp.presetEmpty') : nome}
      </span>
      {temEstrela ? <span className="flex-none text-[10px] text-[var(--color-warn)]">★</span> : null}
    </button>
  )
}

/** Mesmo desenho do menu das abas: os presets herdaram o gesto delas de propósito. */
function MenuDoPreset({
  lugar,
  cor,
  temEstrela,
  onAplicar,
  onRenomear,
  onCor,
  onEstrela,
  onApagar
}: {
  lugar: number
  cor: string
  temEstrela: boolean
  onAplicar: () => void
  onRenomear: () => void
  onCor: (cor: string) => void
  onEstrela: () => void
  onApagar: () => void
}): React.JSX.Element {
  const { t } = useT()
  return (
    <div
      data-preset-menu={lugar}
      className="mt-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] p-1 shadow-[0_8px_24px_rgba(0,0,0,.55)]"
    >
      <Item marca="aplicar" rotulo={t('insp.presetApply')} onClick={onAplicar} />
      <Item marca="renomear" rotulo={t('insp.presetRename')} onClick={onRenomear} />
      <Item
        marca="estrela"
        rotulo={t('insp.presetStar')}
        marcado={temEstrela}
        onClick={onEstrela}
      />
      <div className="my-1 h-px bg-[var(--color-edge)]" />
      <div className="flex gap-1.5 px-2 py-1">
        {CORES_DE_PRESET.map((opcao) => (
          <button
            key={opcao}
            type="button"
            data-preset-cor={opcao}
            aria-label={opcao}
            onClick={() => onCor(opcao)}
            className={`h-[15px] w-[15px] rounded-full border border-[var(--color-edge)] ${
              opcao.toLowerCase() === cor.toLowerCase() ? 'ring-2 ring-[var(--color-fog-0)]' : ''
            }`}
            style={{ background: opcao }}
          />
        ))}
      </div>
      <div className="my-1 h-px bg-[var(--color-edge)]" />
      <Item marca="apagar" rotulo={t('insp.presetDelete')} perigo onClick={onApagar} />
    </div>
  )
}

function Item({
  marca,
  rotulo,
  marcado,
  perigo,
  onClick
}: {
  marca: string
  rotulo: string
  marcado?: boolean
  perigo?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      data-preset-menu-item={marca}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11.5px] hover:bg-[var(--color-ink-3)] ${
        perigo ? 'text-[#ff8a80]' : 'text-[var(--color-fog-05)] hover:text-[var(--color-fog-0)]'
      }`}
    >
      <span className="flex-1">{rotulo}</span>
      {marcado ? <span className="flex-none text-[10px] text-[var(--color-warn)]">★</span> : null}
    </button>
  )
}
