import { useEffect, useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { FONTE_EMBUTIDA, FONT_OPTIONS } from '@shared/defaults'
import {
  TIMER_POSITIONS,
  type AbaDosAjustes,
  type Appearance,
  type ColorPreset,
  type PreferenciasDaMaquina,
  type Tab
} from '@shared/types'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import type { AjudaId } from '@shared/ajuda'
import { linhasCandidatas, temParNoRoteiro } from '@shared/apresentadores'
import { larguraDoPainel } from '@shared/i18n'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'
import { Icon } from '../ui/Icon'
import { Ficha } from '../ui/console'
import { SeletorDeCor } from '../ui/SeletorDeCor'
import { SeletorDeFonte } from '../ui/SeletorDeFonte'
import type { Presets } from '@shared/presets'
import { FileiraDePresets, SecaoDoRodape } from './Presets'
import { ChipDeApresentador } from './inspector/ChipDeApresentador'
import { usePesosDaFonte } from './inspector/usePesosDaFonte'
import { AlvoField, AmostraDaSaida, Group, PesoDaFonte, Slider, Toggle, ToggleRow } from './inspector/controles'

interface Props {
  tab: Tab
  /* as paletas do CONTRASTE DE LEITURA — clássico, papel, âmbar…
     Chamavam-se `presets` e foram renomeadas quando os presets de APARÊNCIA
     chegaram ao rodapé deste mesmo painel: duas coisas com o mesmo nome no
     mesmo componente é um engano esperando acontecer. O campo do AppState
     continua `presets` — renomeá-lo mudaria o formato do .valendo por
     nada. */
  paletas: ColorPreset[]
  metrics: PrompterMetrics | null
  /** os cinco presets desta máquina — vêm do snapshot, não do AppState */
  presets: Presets
  /** conforto desta máquina: em qual aba o painel reabre */
  maquina: PreferenciasDaMaquina
  /**
   * Reaponta um apresentador para o nome selecionado no editor.
   *
   * Vem de fora porque quem sabe o que está selecionado é o editor, e ele mora
   * do outro lado da janela — o painel só sabe qual chip foi clicado.
   */
  onRelink?: (presenterId: string) => void
  dispatch: (action: Action) => void
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

/* As abas têm o nome escrito na cara, então perderam a tooltip: o que elas
   ganharam no lugar é o quadro da coluna, onde a frase inteira cabe sem
   esperar um segundo parado em cima. */
const AJUDA_DA_ABA: Record<AbaId, AjudaId> = {
  texto: 'insp.tabText',
  leitura: 'insp.tabReading',
  saida: 'insp.tabOutput'
}

export function Inspector({
  tab,
  paletas,
  metrics,
  presets,
  maquina,
  onRelink,
  dispatch
}: Props): React.JSX.Element {
  const { t, lang } = useT()
  const a = tab.appearance
  /* os degraus de peso desta fonte nesta máquina — ver `usePesosDaFonte` */
  const pesosDaFonte = usePesosDaFonte(a.fontFamily)
  /* as linhas que PODEM ser deixa, para saber se cada chip ainda tem par no
     roteiro. Recalcula com o texto, que é o que muda o par */
  const candidatas = useMemo(() => linhasCandidatas(tab.blocks), [tab.blocks])
  const patch = (value: Partial<Appearance>): void =>
    dispatch({ type: 'appearance/patch', tabId: tab.id, patch: value })

  /* a fonte sob o cursor no menu, para a amostra comparar sem se comprometer:
     percorrer as sete deixa de custar sete mudanças de estado — e sete passos
     de desfazer. Nada é gravado; fechar o menu devolve a tira à escolhida */
  const [fonteSobOMouse, setFonteSobOMouse] = useState<string | null>(null)

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
            {...ajuda(AJUDA_DA_ABA[item.id])}
            aria-pressed={aba === item.id}
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
        {/* a amostra vem ANTES do seletor, não depois: o menu de fontes abre
            para baixo e cobriria a própria amostra que deveria mostrar —
            passar o mouse pelas opções não teria o que revelar */}
        <AmostraDaSaida
          a={a}
          familia={fonteSobOMouse ?? a.fontFamily}
          nome={t(
            (FONT_OPTIONS.find((f) => f.value === (fonteSobOMouse ?? a.fontFamily)) ?? FONT_OPTIONS[0])
              .chave
          )}
        />
        {/* a família e a caixa alta na mesma fileira: as duas dizem com que
            LETRA a saída é desenhada, e a segunda cabe num "AA" ao lado sem
            gastar uma linha do painel */}
        <div className="flex items-stretch gap-1.5">
          <SeletorDeFonte
            opcoes={FONT_OPTIONS}
            valor={a.fontFamily}
            padrao={FONTE_EMBUTIDA}
            rotulo={t('insp.font')}
            ajudaId="insp.font"
            direcao="baixo"
            marca="data-fonte-da-saida"
            classeCaixa="relative min-w-0 flex-1"
            classeGatilho="flex w-full items-center gap-1 rounded-md border border-[var(--color-edge)] bg-[#212126] px-2 py-1.5 text-[11px] text-[var(--color-fog-05)]"
            nomeDa={(chave) => t(chave)}
            onEscolher={(fontFamily) => patch({ fontFamily })}
            aoPassar={setFonteSobOMouse}
          />
          {/* independente do "AA" do cabeçalho da Edição: aquele pinta o
              editor, este pinta a SAÍDA. Cada um dono de uma superfície —
              mexer num nunca move o outro */}
          <Ficha
            ativa={a.allCaps}
            {...ajuda('insp.allCaps')}
            title={t('insp.allCaps')}
            aria-label={t('insp.allCaps')}
            aria-pressed={a.allCaps}
            onClick={() => patch({ allCaps: !a.allCaps })}
            className="flex-none px-2.5 text-[11px] font-bold tracking-[0.06em]"
          >
            AA
          </Ficha>
        </div>
        <Slider
          ajudaId="insp.body"
          label={t('insp.body')}
          value={a.fontSize}
          min={16}
          max={260}
          suffix="px"
          onChange={(fontSize) => patch({ fontSize })}
        />
        <PesoDaFonte
          valor={a.fontWeight}
          degraus={pesosDaFonte}
          rotulo={t('insp.weight')}
          avisoDeFaceUnica={t('insp.weightOneFace')}
          onChange={(fontWeight) => patch({ fontWeight })}
        />
        <Slider
          ajudaId="insp.lineHeight"
          label={t('insp.lineHeight')}
          value={a.lineHeight}
          min={1}
          max={2.4}
          step={0.05}
          onChange={(lineHeight) => patch({ lineHeight })}
        />
        <Slider
          ajudaId="insp.letterSpacing"
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
                {...ajuda('insp.align')}
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
          <label className="flex flex-1 items-center gap-1.5" {...ajuda('insp.textColor')}>
            <SeletorDeCor
              valor={a.textColor}
              rotulo={t('insp.textColor')}
              onCor={(textColor) => patch({ textColor })}
              onPrever={(textColor) => textColor && patch({ textColor })}
            />
            <span className="text-[var(--color-fog-1)]">{t('insp.textColor')}</span>
          </label>
          <label className="flex flex-1 items-center gap-1.5" {...ajuda('insp.bgColor')}>
            <SeletorDeCor
              valor={a.bgColor}
              rotulo={t('insp.bgColor')}
              onCor={(bgColor) => patch({ bgColor })}
              onPrever={(bgColor) => bgColor && patch({ bgColor })}
            />
            <span className="text-[var(--color-fog-1)]">{t('insp.bgColor')}</span>
          </label>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] tracking-[0.14em] text-[var(--color-fog-3)] uppercase">
            {t('insp.contrast')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {paletas.map((preset) => {
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
                  {...ajuda('insp.preset')}
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
          {...ajuda('insp.invert')}
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
        {/* A MARGEM vem primeiro, e a posição depois.
            A posição desliza o texto dentro da folga que a margem abriu: com
            margem zero não há folga, e arrastar a posição não faz nada. Na
            ordem inversa, o operador mexia no controle de cima e via a tela
            parada — e um controle que não responde ensina que não funciona. */}
        <Slider
          ajudaId="insp.margin"
          label={t('insp.margin')}
          value={a.marginPct}
          min={0}
          max={35}
          suffix="%"
          onChange={(marginPct) => patch({ marginPct })}
        />
        {/* ímã: arrastar perto do centro gruda em 50% exato — é o ponto que
            já era o comportamento de sempre, antes deste slider existir, e
            errar por 1-2% dele não abre diferença visível nenhuma */}
        <Slider
          ajudaId="insp.position"
          label={t('insp.position')}
          value={a.positionPct}
          min={0}
          max={100}
          suffix="%"
          onChange={(value) => patch({ positionPct: Math.abs(value - 50) <= 4 ? 50 : value })}
        />
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
          ajudaId="insp.minWords"
          label={t('insp.minWords')}
          value={a.minWords}
          min={1}
          max={16}
          onChange={(minWords) => patch(minWords > a.maxWords ? { minWords, maxWords: minWords } : { minWords })}
        />
        <Slider
          ajudaId="insp.maxWords"
          label={t('insp.maxWords')}
          value={a.maxWords}
          min={1}
          max={16}
          onChange={(maxWords) => patch(maxWords < a.minWords ? { maxWords, minWords: maxWords } : { maxWords })}
        />
        {/* A faixa vai de 10 a 90 para que 50% seja o meio do TRILHO e o meio
            da TELA ao mesmo tempo. Ia até 70, e nessa escala o meio do curso
            caía em 40%: a bolinha no centro do controle mostrava a marca fora
            do centro do vidro, e as duas coisas que deveriam concordar não
            concordavam.

            O ímã de 50%, como o da posição, gruda a até quatro pontos do
            centro. Acertar 50 no olho custava um vai e vem de 49 e 51 que não
            muda nada no vidro. O 90 é o extremo honesto de quem quer ver quase
            só o que já passou — pouco usado, mas de quem escolher */}
        <Slider
          ajudaId="insp.readingMark"
          label={t('insp.readingMark')}
          value={a.readingLinePct * 100}
          min={10}
          max={90}
          suffix="%"
          onChange={(value) => patch({ readingLinePct: (Math.abs(value - 50) <= 4 ? 50 : value) / 100 })}
        />
        {/* na prévia a linha aparece sempre; isto decide só a transmissão */}
        {/* rótulo curto porque o painel tem 214px: "Mostrar a linha na
            transmissão" ficava cortado no meio, e rótulo cortado é rótulo que
            não informa */}
        <ToggleRow
          ajudaId="insp.markOnOutput"
          label={t('insp.markOnOutput')}
          active={a.readingMarkOnOutput}
          onClick={() => patch({ readingMarkOnOutput: !a.readingMarkOnOutput })}
        />
        <ToggleRow
          ajudaId="insp.focusDim"
          label={t('insp.focusDim')}
          active={a.focusDim}
          onClick={() => patch({ focusDim: !a.focusDim })}
        />
        {/* Só aparece com o esmaecimento ligado: um controle de "quanto" sem
            nada para medir é um controle que não faz nada, e desligado o valor
            fica guardado esperando — não some. */}
        {a.focusDim ? (
          <Slider
            ajudaId="insp.focusDimPct"
            label={t('insp.focusDimAmount')}
            value={a.focusDimPct}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => patch({ focusDimPct: value })}
          />
        ) : null}
      </Group>

      <Group label={t('insp.rhythm')}>
        <ToggleRow
          ajudaId="insp.uniform"
          label={t('insp.uniform')}
          active={a.uniformSpeed}
          onClick={() => patch({ uniformSpeed: !a.uniformSpeed })}
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
            {...ajuda('insp.wrappingFix')}
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
              ajudaId="insp.clockElapsed"
              label={t('insp.clock.elapsed')}
              active={a.timers.elapsed}
              onClick={() => patch({ timers: { ...a.timers, elapsed: !a.timers.elapsed } })}
            />
          </div>
          <div {...ajuda('insp.clockElapsedColor')}>
            <SeletorDeCor
              valor={a.timers.elapsedColor}
              rotulo={t('insp.clock.elapsedColor')}
              onCor={(cor) => patch({ timers: { ...a.timers, elapsedColor: cor } })}
              onPrever={(cor) => cor && patch({ timers: { ...a.timers, elapsedColor: cor } })}
              className="h-7 w-7"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Toggle
              ajudaId="insp.clockRemaining"
              label={t('insp.clock.remaining')}
              active={a.timers.remaining}
              onClick={() => patch({ timers: { ...a.timers, remaining: !a.timers.remaining } })}
            />
          </div>
          <div {...ajuda('insp.clockRemainingColor')}>
            <SeletorDeCor
              valor={a.timers.remainingColor}
              rotulo={t('insp.clock.remainingColor')}
              onCor={(cor) => patch({ timers: { ...a.timers, remainingColor: cor } })}
              onPrever={(cor) => cor && patch({ timers: { ...a.timers, remainingColor: cor } })}
              className="h-7 w-7"
            />
          </div>
        </div>

        {a.timers.elapsed || a.timers.remaining ? (
          <>
            {/* fórmula, cronômetro ou independente: a escolha muda o que
                "decorrido" e "restante" significam, então vem antes de tudo o
                resto */}
            <div className="flex gap-1.5">
              {(
                [
                  ['palavras', t('insp.clock.modeWords'), 'insp.clockModeWords'],
                  ['cronometro', t('insp.clock.modeStopwatch'), 'insp.clockModeStopwatch'],
                  ['livre', t('insp.clock.modeFree'), 'insp.clockModeFree']
                ] as const
              ).map(([mode, rotulo, ajudaId]) => (
                <Ficha
                  key={mode}
                  data-clock-mode={mode}
                  {...ajuda(ajudaId)}
                  ativa={a.timers.mode === mode}
                  onClick={() => patch({ timers: { ...a.timers, mode } })}
                  className="flex-1 px-1 py-1.5 text-[11px]"
                >
                  {rotulo}
                </Ficha>
              ))}
            </div>

            {a.timers.mode === 'cronometro' || a.timers.mode === 'livre' ? (
              <label className="block" {...ajuda('insp.clockTarget')}>
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
                    {...ajuda('insp.clockPosition')}
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
              ajudaId="insp.clockSize"
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
        <Toggle
          ajudaId="insp.mirrorH"
          label={t('insp.mirrorH')}
          active={a.mirrorX}
          onClick={() => patch({ mirrorX: !a.mirrorX })}
        />
        <Toggle
          ajudaId="insp.mirrorV"
          label={t('insp.mirrorV')}
          active={a.mirrorY}
          onClick={() => patch({ mirrorY: !a.mirrorY })}
        />
        <div className="flex gap-1.5">
          {([0, 90, 180, 270] as const).map((rotation) => (
            <Ficha
              key={rotation}
              ativa={a.rotation === rotation}
              {...ajuda('insp.rotation')}
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

      {/* Apresentadores e Presets: as duas tiras do rodapé, na MESMA casca.
          Antes esta seção era um grupo da área que rola e a outra uma tira
          colada no fundo — com as duas fechadas sobrava um buraco de duzentos
          pixels entre elas. Saindo do mesmo componente, elas encostam uma na
          outra e não têm como divergir de novo.

          Só aparece depois que existe alguém: uma seção vazia seria uma tira
          pedindo para ser preenchida sem dizer como. */}
      {tab.apresentadores.length > 0 ? (
        <SecaoDoRodape
          marca="apresentadores-toggle"
          ajudaId="insp.presentersToggle"
          rotulo={t('insp.presenters')}
          aberto={maquina.apresentadoresAberto}
          onAberto={(apresentadoresAberto) =>
            dispatch({ type: 'maquina/patch', patch: { apresentadoresAberto } })
          }
          resumo={tab.apresentadores.map((quem) => (
            <span
              key={quem.id}
              className="h-2 w-2 flex-none rounded-full"
              style={{ background: quem.cor }}
              title={quem.nome}
            />
          ))}
          acao={
            /* GLOBAL: esconde o nome de TODOS na saída, e trava os
               interruptores individuais enquanto manda — o mesmo desenho do
               OVERLAY dos cartões, para o operador não ter de aprender duas
               gramáticas de "global x individual" no mesmo app. */
            <button
              type="button"
              data-esconder-global
              {...ajuda('insp.presenterHideAll')}
              title={t('insp.presenterHideAll')}
              aria-pressed={a.ocultarApresentadores}
              onClick={() => patch({ ocultarApresentadores: !a.ocultarApresentadores })}
              className={`flex-none rounded-[4px] px-1 py-0.5 text-[8px] font-bold tracking-[0.04em] transition-colors ${
                a.ocultarApresentadores
                  ? 'bg-[var(--color-accent)] text-[#1c1020]'
                  : 'border border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
              }`}
            >
              {t('insp.presenterHideAll.key')}
            </button>
          }
        >
          <div className="flex flex-col gap-2">
          {tab.apresentadores.map((quem) => (
            <ChipDeApresentador
              key={quem.id}
              quem={quem}
              /* o par se perde quando o nome muda no roteiro — é o chip que
                 acusa, senão a cor sumiria sem explicação */
              orfao={!temParNoRoteiro(candidatas, quem)}
              onCor={(cor) => dispatch({ type: 'presenter/color', tabId: tab.id, presenterId: quem.id, cor })}
              /* o histórico funde passos seguidos do mesmo rótulo, e o rótulo
                 aqui é fixo por apresentador: arrastar pela paleta inteira vira
                 UM passo de desfazer, não setenta */
              onPrever={(cor) =>
                cor && dispatch({ type: 'presenter/color', tabId: tab.id, presenterId: quem.id, cor })
              }
              global={a.ocultarApresentadores}
              onRenomear={(nome) =>
                dispatch({ type: 'presenter/rewrite', tabId: tab.id, presenterId: quem.id, nome })
              }
              onOcultar={() =>
                dispatch({
                  type: 'presenter/hidden',
                  tabId: tab.id,
                  presenterId: quem.id,
                  oculto: !(quem.oculto ?? false)
                })
              }
              onRelink={onRelink ? () => onRelink(quem.id) : undefined}
              onRemover={() => dispatch({ type: 'presenter/remove', tabId: tab.id, presenterId: quem.id })}
            />
          ))}
          </div>
        </SecaoDoRodape>
      ) : null}

      {/* fora das abas, no rodapé: um preset vale para o painel inteiro — dentro
          de uma delas, pareceria guardar só aquele pedaço */}
      <FileiraDePresets
        presets={presets}
        tabId={tab.id}
        aberto={maquina.presetsAberto}
        onAberto={(presetsAberto) => dispatch({ type: 'maquina/patch', patch: { presetsAberto } })}
        dispatch={dispatch}
      />
    </aside>
  )
}
