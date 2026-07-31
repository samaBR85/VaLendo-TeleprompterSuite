import { useEffect, useState } from 'react'
import type { Action } from '@shared/actions'
import { FONT_OPTIONS } from '@shared/defaults'
import { TIMER_POSITIONS, type Appearance, type ColorPreset, type Tab } from '@shared/types'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { Icon, type IconName } from '../ui/Icon'

interface Props {
  tab: Tab
  presets: ColorPreset[]
  metrics: PrompterMetrics | null
  /** o operador já gravou um padrão próprio? */
  customDefaults: boolean
  dispatch: (action: Action) => void
}

/**
 * Bloco de ajustes. Sem `label` quando o nome da aba já diz o que é ali —
 * repetir o nome logo abaixo da própria aba só gasta altura.
 */
function Group({ label, children }: { label?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="border-b border-[var(--color-line)]/60 px-3 py-2.5">
      {label ? (
        <div className="mb-1.5 text-[11px] font-medium tracking-wide text-[var(--color-fog-2)]">{label}</div>
      ) : null}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

type AbaId = 'texto' | 'leitura' | 'saida'

/**
 * Três abas em vez de uma pilha de 1500px.
 *
 * O corte é por assunto, não por tipo de controle: "Texto" é a cara do texto
 * (fonte e cor juntas — trocar o corpo e trocar o fundo é a mesma decisão de
 * legibilidade); "Leitura" é como ele se comporta enquanto sobe; "Saída" é o
 * que só existe na tela do apresentador — relógios, espelho e giro.
 */
const ABAS: { id: AbaId; label: string; icon: IconName; hint: string }[] = [
  { id: 'texto', label: 'Texto', icon: 'text', hint: 'fonte, corpo, alinhamento e cores' },
  { id: 'leitura', label: 'Leitura', icon: 'readingLine', hint: 'margem, palavras por linha, marca de leitura e ritmo' },
  { id: 'saida', label: 'Saída', icon: 'monitor', hint: 'relógios, espelho e giro da tela do apresentador' }
]

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

export function Inspector({ tab, presets, metrics, customDefaults, dispatch }: Props): React.JSX.Element {
  const a = tab.appearance
  const patch = (value: Partial<Appearance>): void =>
    dispatch({ type: 'appearance/patch', tabId: tab.id, patch: value })

  // salvar o padrão quando já havia um não muda nada na tela; sem esta
  // confirmação o operador não teria como saber se o clique pegou
  const [salvou, setSalvou] = useState(false)
  useEffect(() => {
    if (!salvou) return
    const timer = setTimeout(() => setSalvou(false), 2_400)
    return () => clearTimeout(timer)
  }, [salvou])

  const [aba, setAba] = useState<AbaId>('texto')

  return (
    <aside className="flex w-[214px] flex-none flex-col border-l border-[var(--color-line)] bg-[var(--color-ink-1)]">
      {/* o aviso fica FORA das abas, fixo: ele fala do estado de agora, e numa
          aba qualquer ele passaria despercebido justamente quando importa.
          Dobra de linha é silenciosa e estraga a leitura — o apresentador
          combinou 7 palavras por linha e recebe 4 e 3 */}
      {metrics?.wrapping ? (
        <div className="flex-none border-b border-[var(--color-line)]/60 bg-[var(--color-warn)]/10 px-3 py-2.5">
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

      <div data-inspector-abas className="flex flex-none border-b border-[var(--color-line)] bg-[var(--color-ink-2)]">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-aba={item.id}
            aria-pressed={aba === item.id}
            title={`${item.label} — ${item.hint}`}
            onClick={() => setAba(item.id)}
            className={`flex flex-1 flex-col items-center gap-1 border-b-2 px-1 pt-2 pb-1.5 text-[10px] transition-colors ${
              aba === item.id
                ? 'border-[var(--color-go)] bg-[var(--color-ink-1)] text-[var(--color-fog-0)]'
                : 'border-transparent text-[var(--color-fog-2)] hover:text-[var(--color-fog-1)]'
            }`}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </div>

      <div data-inspector-corpo className="min-h-0 flex-1 overflow-y-auto">
      {aba === 'texto' ? (
        <>
      <Group>
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
      </Group>

      {/* cor mora junto da fonte: trocar o corpo e trocar o fundo são a mesma
          decisão de legibilidade, e separá-las obrigava a ir e voltar */}
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
        </>
      ) : null}

      {aba === 'leitura' ? (
        <>
      <Group>
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
        {/* na prévia a linha aparece sempre; isto decide só a transmissão */}
        {/* rótulo curto porque o painel tem 214px: "Mostrar a linha na
            transmissão" ficava cortado no meio, e rótulo cortado é rótulo que
            não informa */}
        <Toggle
          label="Linha na transmissão"
          active={a.readingMarkOnOutput}
          onClick={() => patch({ readingMarkOnOutput: !a.readingMarkOnOutput })}
        />
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {a.readingMarkOnOutput ? 'O apresentador também vê a linha.' : 'A linha fica só na sua prévia.'}
        </div>
        <Toggle label="Esmaecer bordas" active={a.focusDim} onClick={() => patch({ focusDim: !a.focusDim })} />
      </Group>

      <Group label="Ritmo">
        <Toggle
          label="Velocidade constante"
          active={a.uniformSpeed}
          onClick={() => patch({ uniformSpeed: !a.uniformSpeed })}
        />
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {a.uniformSpeed
            ? 'Mesmo ritmo do começo ao fim.'
            : 'Linha com mais palavras demora mais para passar.'}
        </div>
      </Group>
        </>
      ) : null}

      {aba === 'saida' ? (
        <>
      {/* relógio é coisa que só existe na tela do apresentador, como o espelho
          e o giro — por isso mora aqui, e não junto das cores do texto */}
      <Group label="Relógios">
        {/* a cor fica junto do próprio relógio: separada, dava para trocar a
            do decorrido achando que era a do restante */}
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Toggle
              label="Tempo decorrido"
              active={a.timers.elapsed}
              onClick={() => patch({ timers: { ...a.timers, elapsed: !a.timers.elapsed } })}
            />
          </div>
          <input
            type="color"
            aria-label="Cor do tempo decorrido"
            value={a.timers.elapsedColor}
            onChange={(event) => patch({ timers: { ...a.timers, elapsedColor: event.target.value } })}
            className="h-7 w-7 flex-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Toggle
              label="Tempo restante"
              active={a.timers.remaining}
              onClick={() => patch({ timers: { ...a.timers, remaining: !a.timers.remaining } })}
            />
          </div>
          <input
            type="color"
            aria-label="Cor do tempo restante"
            value={a.timers.remainingColor}
            onChange={(event) => patch({ timers: { ...a.timers, remainingColor: event.target.value } })}
            className="h-7 w-7 flex-none"
          />
        </div>

        {a.timers.elapsed || a.timers.remaining ? (
          <>
            {/* grade de 3x3 com a forma da própria saída: escolher onde o
                relógio fica apontando o lugar é mais direto que ler rótulos */}
            <div>
              <div className="mb-1.5 text-[11px] text-[var(--color-fog-1)]">Posição</div>
              {/* estreita de propósito: as células são quadradas, então ocupar
                  a largura toda do painel custava ~190px de altura só para
                  apontar um canto */}
              <div className="grid w-[104px] grid-cols-3 gap-1 rounded-md border border-[var(--color-line)] p-1">
                {TIMER_POSITIONS.flat().map((position) => (
                  <button
                    key={position}
                    type="button"
                    aria-label={`Posição ${position}`}
                    aria-pressed={a.timers.position === position}
                    data-position={position}
                    onClick={() => patch({ timers: { ...a.timers, position } })}
                    className={`aspect-square rounded-sm transition-colors ${
                      a.timers.position === position
                        ? 'bg-[var(--color-go)]'
                        : 'bg-[var(--color-ink-3)] hover:bg-[var(--color-fog-2)]'
                    }`}
                  />
                ))}
              </div>
            </div>

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

      <Group label="Compensação do vidro">
        {/* sem este aviso, ligar espelhar e ver a prévia não mudar parece
            defeito — quando é justamente o certo acontecendo. O rótulo do
            grupo já diz o "porquê", então aqui basta o "onde vale" */}
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          Só na tela do apresentador. A prévia e a rede seguem sem espelho, para dar leitura.
        </div>
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
        </>
      ) : null}
      </div>

      {/* fora das abas, no rodapé: guardar o padrão vale para o painel inteiro,
          não para a aba que está aberta — dentro de uma delas, pareceria
          guardar só aquele pedaço */}
      <div className="flex flex-none items-center gap-2 border-t border-[var(--color-line)] px-3 py-2">
        <button
          type="button"
          data-save-defaults
          title={
            customDefaults
              ? 'Aba nova nasce com os seus ajustes e a sua velocidade.'
              : 'Aba nova nasce com o padrão de fábrica. As outras abas não mudam.'
          }
          onClick={() => {
            dispatch({ type: 'defaults/save' })
            setSalvou(true)
          }}
          className={`min-w-0 flex-1 truncate rounded-md border py-1.5 text-[11px] transition-colors ${
            salvou
              ? 'border-[var(--color-go)]/50 bg-[var(--color-go)]/12 text-[var(--color-go)]'
              : 'border-[var(--color-line)] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
          }`}
        >
          {salvou ? 'Guardado' : 'Salvar como padrão'}
        </button>
        {customDefaults ? (
          <button
            type="button"
            data-reset-defaults
            title="Voltar ao padrão de fábrica"
            aria-label="Voltar ao padrão de fábrica"
            onClick={() => dispatch({ type: 'defaults/reset' })}
            className="flex-none rounded-md border border-[var(--color-line)] p-1.5 text-[var(--color-fog-2)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
          >
            <Icon name="restart" size={13} />
          </button>
        ) : null}
      </div>
    </aside>
  )
}
