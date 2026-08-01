import { useEffect, useState } from 'react'
import type { Action } from '@shared/actions'
import { FONT_OPTIONS } from '@shared/defaults'
import { TIMER_POSITIONS, type Appearance, type ColorPreset, type Tab } from '@shared/types'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { larguraDoPainel, type Chave } from '@shared/i18n'
import { useT } from '../i18n'
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
const ABAS: { id: AbaId; icon: IconName; rotulo: 'insp.tab.text' | 'insp.tab.reading' | 'insp.tab.output' }[] = [
  { id: 'texto', icon: 'text', rotulo: 'insp.tab.text' },
  { id: 'leitura', icon: 'readingLine', rotulo: 'insp.tab.reading' },
  { id: 'saida', icon: 'monitor', rotulo: 'insp.tab.output' }
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
    // `w-full` não é redundante: num <button>, `width:auto` encolhe no
    // conteúdo (controles de formulário se dimensionam assim), e `flex` não
    // muda isso. Os toggles soltos no grupo só pareciam inteiros porque o
    // `flex-col` de fora os esticava; dentro das linhas dos relógios, cada um
    // fica num div comum e saía com a largura do próprio rótulo — dois botões
    // de tamanhos diferentes, com as bolinhas em colunas diferentes
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
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
  const { t, lang } = useT()
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

  // alemão e francês crescem ~35% sobre o português, e oito rótulos daqui
  // cortavam nos 214px. Alargar só nesses dois sai mais barato que encurtar a
  // tradução até virar telegrama
  return (
    <aside
      data-inspector
      style={{ width: larguraDoPainel(lang) }}
      className="flex flex-none flex-col border-l border-[var(--color-line)] bg-[var(--color-ink-1)]"
    >
      {/* o aviso fica FORA das abas, fixo: ele fala do estado de agora, e numa
          aba qualquer ele passaria despercebido justamente quando importa.
          Dobra de linha é silenciosa e estraga a leitura — o apresentador
          combinou 7 palavras por linha e recebe 4 e 3 */}
      {metrics?.wrapping ? (
        <div className="flex-none border-b border-[var(--color-line)]/60 bg-[var(--color-warn)]/10 px-3 py-2.5">
          <div className="text-[11px] text-[var(--color-warn)]">{t('insp.wrapping')}</div>
          <div className="mt-0.5 text-[11px] text-[var(--color-fog-2)]">
            {t('insp.wrapping.detail', { words: a.maxWords, size: a.fontSize })}
          </div>
          <button
            type="button"
            onClick={() => patch({ fontSize: metrics.fitFontSize })}
            className="mt-1.5 w-full rounded-md border border-[var(--color-warn)]/50 py-1 text-[11px] text-[var(--color-warn)] hover:bg-[var(--color-warn)]/12"
          >
            {t('insp.wrapping.fix', { size: metrics.fitFontSize })}
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
            title={`${t(item.rotulo)} — ${t(`${item.rotulo}.hint` as Chave)}`}
            onClick={() => setAba(item.id)}
            className={`flex flex-1 flex-col items-center gap-1 border-b-2 px-1 pt-2 pb-1.5 text-[10px] transition-colors ${
              aba === item.id
                ? 'border-[var(--color-go)] bg-[var(--color-ink-1)] text-[var(--color-fog-0)]'
                : 'border-transparent text-[var(--color-fog-2)] hover:text-[var(--color-fog-1)]'
            }`}
          >
            <Icon name={item.icon} size={15} />
            {t(item.rotulo)}
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
        <Slider label={t('insp.body')} value={a.fontSize} min={16} max={260} suffix="px" onChange={(fontSize) => patch({ fontSize })} />
        <Slider label={t('insp.weight')} value={a.fontWeight} min={300} max={800} step={100} onChange={(fontWeight) => patch({ fontWeight })} />
        <Slider label={t('insp.lineHeight')} value={a.lineHeight} min={1} max={2.4} step={0.05} onChange={(lineHeight) => patch({ lineHeight })} />
        <Slider
          label={t('insp.letterSpacing')}
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
              {align === 'left' ? t('insp.alignLeft') : t('insp.alignCenter')}
            </button>
          ))}
        </div>
      </Group>

      {/* cor mora junto da fonte: trocar o corpo e trocar o fundo são a mesma
          decisão de legibilidade, e separá-las obrigava a ir e voltar */}
      <Group label={t('insp.colors')}>
        <div className="flex items-center gap-2 text-[11px]">
          <label className="flex flex-1 items-center gap-1.5">
            <input
              type="color"
              value={a.textColor}
              onChange={(event) => patch({ textColor: event.target.value })}
              className="h-6 w-8"
            />
            <span className="text-[var(--color-fog-1)]">{t('insp.textColor')}</span>
          </label>
          <label className="flex flex-1 items-center gap-1.5">
            <input
              type="color"
              value={a.bgColor}
              onChange={(event) => patch({ bgColor: event.target.value })}
              className="h-6 w-8"
            />
            <span className="text-[var(--color-fog-1)]">{t('insp.bgColor')}</span>
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
          {t('insp.invert')}
        </button>
      </Group>
        </>
      ) : null}

      {aba === 'leitura' ? (
        <>
      <Group>
        <Slider label={t('insp.margin')} value={a.marginPct} min={0} max={35} suffix="%" onChange={(marginPct) => patch({ marginPct })} />
        {/*
          As duas faixas vão de 1 a 16 inteiras, sem uma restringir a outra —
          amarrar o piso do "máximo" ao valor do "mínimo" (como era antes)
          fazia a régua do slider mudar de tamanho a cada ajuste, e quando os
          dois ficavam iguais, o cabo ficava preso na ponta de uma régua de
          largura zero: por isso o pedido de "começar do 1" não tinha efeito
          visível nenhum. A composição do texto já tolera min > max sozinha
          (`normalizeRule` em senseLines.ts) — o que falta aqui é só manter a
          leitura óbvia arrastando a outra ponta junto quando precisa, e não
          impedir o gesto.
        */}
        <Slider
          label={t('insp.minWords')}
          value={a.minWords}
          min={1}
          max={16}
          onChange={(minWords) => patch(minWords > a.maxWords ? { minWords, maxWords: minWords } : { minWords })}
        />
        <Slider
          label={t('insp.maxWords')}
          value={a.maxWords}
          min={1}
          max={16}
          onChange={(maxWords) => patch(maxWords < a.minWords ? { maxWords, minWords: maxWords } : { maxWords })}
        />
        <Slider
          label={t('insp.readingMark')}
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
          label={t('insp.markOnOutput')}
          active={a.readingMarkOnOutput}
          onClick={() => patch({ readingMarkOnOutput: !a.readingMarkOnOutput })}
        />
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {a.readingMarkOnOutput ? t('insp.markOn.yes') : t('insp.markOn.no')}
        </div>
        <Toggle label={t('insp.focusDim')} active={a.focusDim} onClick={() => patch({ focusDim: !a.focusDim })} />
      </Group>

      <Group label={t('insp.rhythm')}>
        <Toggle
          label={t('insp.uniform')}
          active={a.uniformSpeed}
          onClick={() => patch({ uniformSpeed: !a.uniformSpeed })}
        />
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {a.uniformSpeed
            ? t('insp.uniform.yes')
            : t('insp.uniform.no')}
        </div>
      </Group>
        </>
      ) : null}

      {aba === 'saida' ? (
        <>
      {/* relógio é coisa que só existe na tela do apresentador, como o espelho
          e o giro — por isso mora aqui, e não junto das cores do texto */}
      <Group label={t('insp.clocks')}>
        {/* a cor fica junto do próprio relógio: separada, dava para trocar a
            do decorrido achando que era a do restante */}
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Toggle
              label={t('insp.clock.elapsed')}
              active={a.timers.elapsed}
              onClick={() => patch({ timers: { ...a.timers, elapsed: !a.timers.elapsed } })}
            />
          </div>
          <input
            type="color"
            aria-label={t('insp.clock.elapsedColor')}
            value={a.timers.elapsedColor}
            onChange={(event) => patch({ timers: { ...a.timers, elapsedColor: event.target.value } })}
            className="h-7 w-7 flex-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Toggle
              label={t('insp.clock.remaining')}
              active={a.timers.remaining}
              onClick={() => patch({ timers: { ...a.timers, remaining: !a.timers.remaining } })}
            />
          </div>
          <input
            type="color"
            aria-label={t('insp.clock.remainingColor')}
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
              <div className="mb-1.5 text-[11px] text-[var(--color-fog-1)]">{t('insp.clock.position')}</div>
              {/* estreita de propósito: as células são quadradas, então ocupar
                  a largura toda do painel custava ~190px de altura só para
                  apontar um canto */}
              <div className="grid w-[104px] grid-cols-3 gap-1 rounded-md border border-[var(--color-line)] p-1">
                {TIMER_POSITIONS.flat().map((position) => (
                  <button
                    key={position}
                    type="button"
                    aria-label={t('insp.clock.positionOf', { pos: position })}
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
              label={t('insp.clock.size')}
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

      <Group label={t('insp.glass')}>
        {/* sem este aviso, ligar espelhar e ver a prévia não mudar parece
            defeito — quando é justamente o certo acontecendo. O rótulo do
            grupo já diz o "porquê", então aqui basta o "onde vale" */}
        <div className="text-[11px] leading-relaxed text-[var(--color-fog-2)]">
          {t('insp.glass.hint')}
        </div>
        <Toggle label={t('insp.mirrorH')} active={a.mirrorX} onClick={() => patch({ mirrorX: !a.mirrorX })} />
        <Toggle label={t('insp.mirrorV')} active={a.mirrorY} onClick={() => patch({ mirrorY: !a.mirrorY })} />
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
              ? t('insp.defaults.custom')
              : t('insp.defaults.factory')
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
          {salvou ? t('insp.saved') : t('insp.saveDefaults')}
        </button>
        {customDefaults ? (
          <button
            type="button"
            data-reset-defaults
            title={t('insp.defaults.reset')}
            aria-label={t('insp.defaults.reset')}
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
