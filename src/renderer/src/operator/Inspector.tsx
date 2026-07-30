import type { Action } from '@shared/actions'
import { FONT_OPTIONS } from '@shared/defaults'
import type { Appearance, ColorPreset, Tab } from '@shared/types'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { Icon } from '../ui/Icon'

interface Props {
  tab: Tab
  presets: ColorPreset[]
  metrics: PrompterMetrics | null
  dispatch: (action: Action) => void
}

function Group({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="border-b border-[var(--color-line)]/60 px-3 py-3">
      <div className="mb-2 text-[11px] font-medium tracking-wide text-[var(--color-fog-2)]">{label}</div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="text-[var(--color-fog-1)]">{label}</span>
        <span className="text-[var(--color-fog-0)]">
          {step < 1 ? value.toFixed(2) : Math.round(value)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Toggle({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
        active
          ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/12 text-[var(--color-go)]'
          : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`h-2.5 w-2.5 flex-none rounded-full ${
          active ? 'bg-[var(--color-go)]' : 'border border-[var(--color-line)]'
        }`}
      />
    </button>
  )
}

export function Inspector({ tab, presets, metrics, dispatch }: Props): React.JSX.Element {
  const a = tab.appearance
  const patch = (value: Partial<Appearance>): void =>
    dispatch({ type: 'appearance/patch', tabId: tab.id, patch: value })

  return (
    <aside className="flex w-[214px] flex-none flex-col overflow-y-auto border-l border-[var(--color-line)] bg-[var(--color-ink-1)]">
      {/* dobra de linha é silenciosa e estraga a leitura: o apresentador
          combinou 7 palavras por linha e recebe 4 e 3 */}
      {metrics?.wrapping ? (
        <div className="border-b border-[var(--color-line)]/60 bg-[var(--color-warn)]/10 px-3 py-2.5">
          <div className="text-[11px] text-[var(--color-warn)]">As linhas estão dobrando</div>
          <div className="mt-0.5 text-[11px] text-[var(--color-fog-2)]">
            Não cabem {a.maxWords} palavras na largura desta saída com {a.fontSize}px.
          </div>
          <button
            type="button"
            onClick={() => patch({ fontSize: metrics.fitFontSize })}
            className="mt-1.5 w-full rounded-md border border-[var(--color-warn)]/50 py-1 text-[11px] text-[var(--color-warn)] hover:bg-[var(--color-warn)]/12"
          >
            Ajustar corpo para {metrics.fitFontSize}px
          </button>
        </div>
      ) : null}

      <Group label="Tipografia">
        <select
          value={a.fontFamily}
          onChange={(event) => patch({ fontFamily: event.target.value })}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] px-2 py-1.5 text-[11px]"
        >
          {FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Slider label="Corpo" value={a.fontSize} min={16} max={260} suffix="px" onChange={(fontSize) => patch({ fontSize })} />
        <Slider label="Peso" value={a.fontWeight} min={300} max={800} step={100} onChange={(fontWeight) => patch({ fontWeight })} />
        <Slider label="Entrelinha" value={a.lineHeight} min={1} max={2.4} step={0.05} onChange={(lineHeight) => patch({ lineHeight })} />
        <Slider
          label="Entre letras"
          value={a.letterSpacing}
          min={-0.04}
          max={0.16}
          step={0.01}
          suffix="em"
          onChange={(letterSpacing) => patch({ letterSpacing })}
        />
      </Group>

      <Group label="Ritmo">
        <Toggle
          label="Velocidade constante"
          active={a.uniformSpeed}
          onClick={() => patch({ uniformSpeed: !a.uniformSpeed })}
        />
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {a.uniformSpeed
            ? 'O texto sobe sempre no mesmo ritmo, do começo ao fim.'
            : 'A velocidade oscila: linha com mais palavras demora mais para passar.'}
        </div>
      </Group>

      <Group label="Composição">
        <Slider label="Margem" value={a.marginPct} min={0} max={35} suffix="%" onChange={(marginPct) => patch({ marginPct })} />
        <Slider label="Mínimo por linha" value={a.minWords} min={1} max={a.maxWords} onChange={(minWords) => patch({ minWords })} />
        <Slider label="Máximo por linha" value={a.maxWords} min={a.minWords} max={16} onChange={(maxWords) => patch({ maxWords })} />
        <Slider
          label="Marca de leitura"
          value={a.readingLinePct * 100}
          min={10}
          max={70}
          suffix="%"
          onChange={(value) => patch({ readingLinePct: value / 100 })}
        />
        <div className="flex gap-1.5">
          {(['left', 'center'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => patch({ align })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] ${
                a.align === align
                  ? 'border-[var(--color-fog-1)] text-[var(--color-fog-0)]'
                  : 'border-[var(--color-line)] text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)]'
              }`}
            >
              {align === 'left' ? 'À esquerda' : 'Centralizado'}
            </button>
          ))}
        </div>
        <Toggle label="Esmaecer bordas" active={a.focusDim} onClick={() => patch({ focusDim: !a.focusDim })} />
      </Group>

      <Group label="Cores">
        <div className="flex items-center gap-2 text-[11px]">
          <label className="flex flex-1 items-center gap-1.5">
            <input
              type="color"
              value={a.textColor}
              onChange={(event) => patch({ textColor: event.target.value })}
              className="h-6 w-8"
            />
            <span className="text-[var(--color-fog-1)]">Texto</span>
          </label>
          <label className="flex flex-1 items-center gap-1.5">
            <input
              type="color"
              value={a.bgColor}
              onChange={(event) => patch({ bgColor: event.target.value })}
              className="h-6 w-8"
            />
            <span className="text-[var(--color-fog-1)]">Fundo</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              onClick={() => dispatch({ type: 'appearance/preset', tabId: tab.id, presetId: preset.id })}
              className="h-7 w-7 rounded-md border border-[var(--color-line)]"
              style={{ background: preset.bgColor, color: preset.textColor }}
            >
              <span className="text-[11px]">Aa</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'appearance/invert', tabId: tab.id })}
          className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--color-line)] py-1.5 text-[11px] hover:bg-[var(--color-ink-3)]"
        >
          <Icon name="contrast" size={14} />
          Inverter cores
        </button>
      </Group>

      <Group label="Relógios na transmissão">
        <Toggle
          label="Tempo decorrido"
          active={a.timers.elapsed}
          onClick={() => patch({ timers: { ...a.timers, elapsed: !a.timers.elapsed } })}
        />
        <Toggle
          label="Tempo restante"
          active={a.timers.remaining}
          onClick={() => patch({ timers: { ...a.timers, remaining: !a.timers.remaining } })}
        />

        {a.timers.elapsed || a.timers.remaining ? (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['topLeft', 'Sup. esq.'],
                  ['topRight', 'Sup. dir.'],
                  ['bottomLeft', 'Inf. esq.'],
                  ['bottomRight', 'Inf. dir.']
                ] as const
              ).map(([corner, label]) => (
                <button
                  key={corner}
                  type="button"
                  onClick={() => patch({ timers: { ...a.timers, corner } })}
                  className={`rounded-md border px-2 py-1.5 text-[11px] ${
                    a.timers.corner === corner
                      ? 'border-[var(--color-fog-1)] text-[var(--color-fog-0)]'
                      : 'border-[var(--color-line)] text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="color"
                value={a.timers.color}
                onChange={(event) => patch({ timers: { ...a.timers, color: event.target.value } })}
                className="h-6 w-8"
              />
              <span className="text-[var(--color-fog-1)]">Cor do relógio</span>
            </label>

            <Slider
              label="Tamanho"
              value={a.timers.sizePct}
              min={1.5}
              max={10}
              step={0.5}
              suffix="%"
              onChange={(sizePct) => patch({ timers: { ...a.timers, sizePct } })}
            />
          </>
        ) : null}
      </Group>

      <Group label="Saída">
        <Toggle label="Espelhar horizontal" active={a.mirrorX} onClick={() => patch({ mirrorX: !a.mirrorX })} />
        <Toggle label="Espelhar vertical" active={a.mirrorY} onClick={() => patch({ mirrorY: !a.mirrorY })} />
        <div className="flex gap-1.5">
          {([0, 90, 180, 270] as const).map((rotation) => (
            <button
              key={rotation}
              type="button"
              onClick={() => patch({ rotation })}
              className={`flex-1 rounded-md border py-1.5 text-[11px] ${
                a.rotation === rotation
                  ? 'border-[var(--color-fog-1)] text-[var(--color-fog-0)]'
                  : 'border-[var(--color-line)] text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)]'
              }`}
            >
              {rotation}°
            </button>
          ))}
        </div>
      </Group>
    </aside>
  )
}
