import { useEffect, useState } from 'react'
import type { Action } from '@shared/actions'
import { FONT_OPTIONS } from '@shared/defaults'
import {
  apagarDigitoDoAlvo,
  bufferDoAlvoParaSegundos,
  empurrarDigitoDoAlvo,
  formatAlvo,
  segundosParaBufferDoAlvo
} from '@shared/pacing'
import {
  TIMER_POSITIONS,
  type AbaDosAjustes,
  type Appearance,
  type ColorPreset,
  type PreferenciasDaMaquina,
  type Tab
} from '@shared/types'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import { larguraDoPainel, type Chave } from '@shared/i18n'
import { useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { Ficha, SliderConsole, Tecla } from '../ui/console'

interface Props {
  tab: Tab
  presets: ColorPreset[]
  metrics: PrompterMetrics | null
  /** o operador já gravou um padrão próprio? */
  customDefaults: boolean
  /** conforto desta máquina: em qual aba o painel reabre */
  maquina: PreferenciasDaMaquina
  dispatch: (action: Action) => void
}

/**
 * Bloco de ajustes. Sem `label` quando o nome da aba já diz o que é ali —
 * repetir o nome logo abaixo da própria aba só gasta altura.
 */
function Group({
  label,
  hint,
  children
}: {
  label?: string
  /** explicação do grupo inteiro, só visível ao passar o mouse no rótulo */
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="border-b border-[var(--color-line)]/60 px-3 py-2.5">
      {label ? (
        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium tracking-wide text-[var(--color-fog-2)]">
          {label}
          {hint ? <Hint text={hint} /> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

type AbaId = AbaDosAjustes

/**
 * Três abas em vez de uma pilha de 1500px.
 *
 * O corte é por assunto, não por tipo de controle: "Texto" é a cara do texto
 * (fonte e cor juntas — trocar o corpo e trocar o fundo é a mesma decisão de
 * legibilidade); "Leitura" é como ele se comporta enquanto sobe; "Saída" é o
 * que só existe na tela do apresentador — relógios, espelho e giro.
 */
const ABAS: { id: AbaId; rotulo: 'insp.tab.text' | 'insp.tab.reading' | 'insp.tab.output' }[] = [
  { id: 'texto', rotulo: 'insp.tab.text' },
  { id: 'leitura', rotulo: 'insp.tab.reading' },
  { id: 'saida', rotulo: 'insp.tab.output' }
]

/** Slider do console: rótulo à esquerda, valor em rosa mono à direita. */
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
        <span className="text-[var(--color-fog-2)]">{label}</span>
        <span className="font-mono text-[11px] font-semibold text-[var(--color-accent)]">
          {step < 1 ? value.toFixed(2) : Math.round(value)}
          {suffix}
        </span>
      </div>
      <SliderConsole value={value} min={min} max={max} step={step} onValue={onChange} className="w-full" />
    </label>
  )
}

/**
 * Campo de horário digitado como numa calculadora: cada dígito entra pela
 * direita e empurra os que já estavam lá, com os ":" no lugar certo sozinhos.
 * Arrastar um slider para achar "3 minutos e 20" é lento e impreciso demais
 * para um número que o operador já sabe de cabeça — aqui ele só digita
 * "320" e o campo vira "03:20".
 *
 * O buffer de dígitos (não o valor já calculado) é o que edita: assim
 * apagar remove o último dígito que a pessoa digitou, e não a última casa
 * numérica do valor arredondado.
 */
function AlvoField({ value, onChange }: { value: number; onChange: (seconds: number) => void }): React.JSX.Element {
  const [buffer, setBuffer] = useState<string | null>(null)
  const digitos = buffer ?? segundosParaBufferDoAlvo(value)

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault()
      const proximo = empurrarDigitoDoAlvo(digitos, event.key)
      setBuffer(proximo)
      onChange(bufferDoAlvoParaSegundos(proximo))
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      const proximo = apagarDigitoDoAlvo(digitos)
      setBuffer(proximo)
      onChange(bufferDoAlvoParaSegundos(proximo))
    } else if (event.key === 'Enter') {
      event.currentTarget.blur()
    } else if (event.key !== 'Tab') {
      // nenhuma outra tecla escreve no campo — letra, ponto, colar: só dígito
      // e apagar mexem no buffer, o resto é ignorado em silêncio
      event.preventDefault()
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      data-clock-target
      value={formatAlvo(bufferDoAlvoParaSegundos(digitos))}
      onChange={() => {}}
      onKeyDown={onKeyDown}
      onFocus={() => setBuffer(segundosParaBufferDoAlvo(value))}
      onBlur={() => setBuffer(null)}
      className="w-full rounded-md border border-[var(--color-edge)] bg-[#212126] px-2 py-1 text-right text-[13px] tabular-nums text-[var(--color-fog-0)] outline-none focus:border-[var(--color-accent)]"
    />
  )
}

/**
 * Explicação que só aparece ao passar o mouse.
 *
 * Antes, cada uma dessas frases ficava escrita por baixo do controle o tempo
 * todo — e um painel de 214px de largura não aguenta muitas delas sem parecer
 * uma bula. Quem já sabe o que o controle faz nunca lê aquilo de novo; quem
 * não sabe, lê uma vez e pronto. Cabe melhor num "?" que só fala quando
 * perguntado.
 */
function Hint({ text }: { text: string }): React.JSX.Element {
  return (
    <span title={text} className="flex-none cursor-help text-[var(--color-fog-2)]">
      <Icon name="info" size={12} />
    </span>
  )
}

/**
 * Uma linha de toggle dentro de um grupo — sempre com a mesma largura,
 * tenha ou não uma dica ao lado.
 *
 * Sem o espaço reservado do placeholder, um toggle com dica ficava mais
 * estreito que o vizinho sem dica (o ícone "?" e o respiro antes dele saíam
 * da largura do botão), e as bolinhas de estado acabavam em colunas
 * diferentes — a régua vertical que devia alinhá-las quebrava.
 */
function ToggleRow({
  label,
  active,
  onClick,
  hint
}: {
  label: string
  active: boolean
  onClick: () => void
  hint?: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <Toggle label={label} active={active} onClick={onClick} />
      </div>
      {hint ? <Hint text={hint} /> : <span className="w-3 flex-none" />}
    </div>
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
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-accent-soft)]'
          : 'border-[var(--color-edge)] bg-[#212126] text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)]'
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`h-2.5 w-2.5 flex-none rounded-full ${
          active ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-fog-3)]'
        }`}
      />
    </button>
  )
}

export function Inspector({ tab, presets, metrics, customDefaults, maquina, dispatch }: Props): React.JSX.Element {
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

  // em qual aba o painel reabre: conforto desta máquina, junto das outras
  // preferências locais — nunca entra no .valendo
  const aba = maquina.abaDosAjustes
  const setAba = (abaDosAjustes: AbaId): void => dispatch({ type: 'maquina/patch', patch: { abaDosAjustes } })

  // alemão e francês crescem ~35% sobre o português, e oito rótulos daqui
  // cortavam nos 214px. Alargar só nesses dois sai mais barato que encurtar a
  // tradução até virar telegrama
  return (
    <aside
      data-inspector
      style={{ width: larguraDoPainel(lang) }}
      className="flex flex-none flex-col border-l border-[var(--color-edge)] bg-[#17171a]"
    >
      {/* o filete rosa é a assinatura dos Ajustes, como o âmbar é da Edição:
          a aba ativa fica tingida do mesmo rosa, sem relevo — ficha, não tecla */}
      <div
        data-inspector-abas
        className="flex flex-none border-b border-[var(--color-edge)]"
        style={{ background: 'linear-gradient(#212125, #1a1a1d)', borderTop: '2px solid var(--color-accent)' }}
      >
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-aba={item.id}
            aria-pressed={aba === item.id}
            title={`${t(item.rotulo)} — ${t(`${item.rotulo}.hint` as Chave)}`}
            onClick={() => setAba(item.id)}
            className={`flex-1 py-[7px] text-center text-[11px] transition-colors ${
              aba === item.id
                ? 'bg-[var(--color-accent)]/10 font-semibold text-[var(--color-accent-soft)]'
                : 'font-medium text-[var(--color-fog-2)] hover:text-[var(--color-fog-1)]'
            }`}
          >
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
          className="w-full rounded-md border border-[var(--color-edge)] bg-[#212126] px-2 py-1.5 text-[11px] text-[var(--color-fog-05)]"
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
        {/* `min-w-0` + `truncate`: sem eles, um item flex nunca encolhe abaixo
            do próprio texto, e a fileira inteira transbordava o painel — era o
            "Direita" saindo pela borda direita. O rótulo mais longo dos seis
            idiomas era o "Centralizado" do português, que também encurtou.
            O truncar é rede de segurança para uma tradução futura, não o
            comportamento esperado: o nome inteiro fica no `title`. */}
        <div className="flex gap-1.5">
          {(['left', 'center', 'right'] as const).map((align) => {
            const rotulo = {
              left: t('insp.alignLeft'),
              center: t('insp.alignCenter'),
              right: t('insp.alignRight')
            }[align]
            return (
              <Ficha
                key={align}
                ativa={a.align === align}
                title={rotulo}
                onClick={() => patch({ align })}
                className="min-w-0 flex-1 truncate px-1.5 py-1.5 text-[11px]"
              >
                {rotulo}
              </Ficha>
            )
          })}
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

        <div>
          <div className="mb-1.5 text-[10px] tracking-[0.14em] text-[var(--color-fog-3)] uppercase">
            {t('insp.contrast')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              /* qual paleta está valendo agora — comparado pelo par de cores,
                 e não por um id guardado: o operador pode ter mexido no
                 seletor de cor à mão depois de escolher um preset, e aí
                 nenhum deles está valendo mesmo */
              const valendo =
                preset.textColor.toUpperCase() === a.textColor.toUpperCase() &&
                preset.bgColor.toUpperCase() === a.bgColor.toUpperCase()
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-preset={preset.id}
                  aria-pressed={valendo}
                  title={preset.name}
                  onClick={() => dispatch({ type: 'appearance/preset', tabId: tab.id, presetId: preset.id })}
                  className={`h-9 w-11 rounded-md border transition-colors ${
                    valendo ? 'border-[var(--color-accent)]' : 'border-[var(--color-ink-4)]'
                  }`}
                  style={{ background: preset.bgColor, color: preset.textColor }}
                >
                  <span className="text-[13px] font-bold">Aa</span>
                </button>
              )
            })}
          </div>
        </div>

        <Ficha
          onClick={() => dispatch({ type: 'appearance/invert', tabId: tab.id })}
          className="flex w-full items-center justify-center gap-1.5 py-1.5 text-[11px]"
        >
          <Icon name="contrast" size={14} />
          {t('insp.invert')}
        </Ficha>
      </Group>
        </>
      ) : null}

      {aba === 'leitura' ? (
        <>
      <Group>
        {/* ímã: arrastar perto do centro gruda em 50% exato — é o ponto que
            já era o comportamento de sempre, antes deste slider existir, e
            errar por 1-2% dele não abre diferença visível nenhuma */}
        <Slider
          label={t('insp.position')}
          value={a.positionPct}
          min={0}
          max={100}
          suffix="%"
          onChange={(value) => patch({ positionPct: Math.abs(value - 50) <= 4 ? 50 : value })}
        />
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
        <ToggleRow
          label={t('insp.markOnOutput')}
          active={a.readingMarkOnOutput}
          onClick={() => patch({ readingMarkOnOutput: !a.readingMarkOnOutput })}
          hint={a.readingMarkOnOutput ? t('insp.markOn.yes') : t('insp.markOn.no')}
        />
        <ToggleRow label={t('insp.focusDim')} active={a.focusDim} onClick={() => patch({ focusDim: !a.focusDim })} />
      </Group>

      <Group label={t('insp.rhythm')}>
        <ToggleRow
          label={t('insp.uniform')}
          active={a.uniformSpeed}
          onClick={() => patch({ uniformSpeed: !a.uniformSpeed })}
          hint={a.uniformSpeed ? t('insp.uniform.yes') : t('insp.uniform.no')}
        />
      </Group>

      {/* mora aqui, e não mais fixo fora das abas: dobra de linha é assunto
          de ritmo de leitura — min/max palavras por linha, corpo da fonte —,
          que é exatamente o que esta aba já reúne */}
      {metrics?.wrapping ? (
        <div className="flex-none border-t border-[var(--color-line)]/60 bg-[var(--color-warn)]/10 px-3 py-2.5">
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
            {/* fórmula, cronômetro ou independente: a escolha muda o que
                "decorrido" e "restante" significam, então vem antes de tudo o
                resto */}
            <div className="flex gap-1.5">
              {(
                [
                  ['palavras', t('insp.clock.modeWords'), t('insp.clock.modeWords.hint')],
                  ['cronometro', t('insp.clock.modeStopwatch'), t('insp.clock.modeStopwatch.hint')],
                  ['livre', t('insp.clock.modeFree'), t('insp.clock.modeFree.hint')]
                ] as const
              ).map(([mode, rotulo, dica]) => (
                <Ficha
                  key={mode}
                  data-clock-mode={mode}
                  title={dica}
                  ativa={a.timers.mode === mode}
                  onClick={() => patch({ timers: { ...a.timers, mode } })}
                  className="flex-1 px-1 py-1.5 text-[11px]"
                >
                  {rotulo}
                </Ficha>
              ))}
            </div>

            {a.timers.mode === 'cronometro' || a.timers.mode === 'livre' ? (
              <label className="block">
                <div className="mb-1 text-[11px] text-[var(--color-fog-1)]">{t('insp.clock.target')}</div>
                <AlvoField
                  value={a.timers.targetSeconds}
                  onChange={(targetSeconds) => patch({ timers: { ...a.timers, targetSeconds } })}
                />
              </label>
            ) : null}

            {/* grade de 3x3 com a forma da própria saída: escolher onde o
                relógio fica apontando o lugar é mais direto que ler rótulos */}
            <div>
              <div className="mb-1.5 text-[11px] text-[var(--color-fog-1)]">{t('insp.clock.position')}</div>
              {/* estreita de propósito: as células são quadradas, então ocupar
                  a largura toda do painel custava ~190px de altura só para
                  apontar um canto */}
              <div className="grid w-[104px] grid-cols-3 gap-1 rounded-md border border-[var(--color-edge)] bg-[#141416] p-1">
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
                        ? 'bg-[var(--color-accent)]'
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

      <Group label={t('insp.glass')} hint={t('insp.glass.hint')}>
        <Toggle label={t('insp.mirrorH')} active={a.mirrorX} onClick={() => patch({ mirrorX: !a.mirrorX })} />
        <Toggle label={t('insp.mirrorV')} active={a.mirrorY} onClick={() => patch({ mirrorY: !a.mirrorY })} />
        <div className="flex gap-1.5">
          {([0, 90, 180, 270] as const).map((rotation) => (
            <Ficha
              key={rotation}
              ativa={a.rotation === rotation}
              onClick={() => patch({ rotation })}
              className="flex-1 py-1.5 text-[11px]"
            >
              {rotation}°
            </Ficha>
          ))}
        </div>
      </Group>
        </>
      ) : null}
      </div>

      {/* fora das abas, no rodapé: guardar o padrão vale para o painel inteiro,
          não para a aba que está aberta — dentro de uma delas, pareceria
          guardar só aquele pedaço */}
      <div className="flex flex-none items-center gap-2 border-t border-[var(--color-edge)] p-2.5">
        <Tecla
          data-save-defaults
          title={customDefaults ? t('insp.defaults.custom') : t('insp.defaults.factory')}
          acesa={salvou}
          cor="var(--color-go)"
          onClick={() => {
            dispatch({ type: 'defaults/save' })
            setSalvou(true)
          }}
          className="h-[30px] min-w-0 flex-1 rounded-md text-[11px] font-semibold"
        >
          <span className="max-w-full truncate">{salvou ? t('insp.saved') : t('insp.saveDefaults')}</span>
        </Tecla>
        {customDefaults ? (
          <Tecla
            data-reset-defaults
            title={t('insp.defaults.reset')}
            aria-label={t('insp.defaults.reset')}
            onClick={() => dispatch({ type: 'defaults/reset' })}
            className="h-[30px] w-[30px] flex-none rounded-md"
          >
            <Icon name="restart" size={13} />
          </Tecla>
        ) : null}
      </div>
    </aside>
  )
}
