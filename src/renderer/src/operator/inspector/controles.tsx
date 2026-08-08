import { useState } from 'react'
import type { AjudaId } from '@shared/ajuda'
import { degrauDoValor } from '@shared/pesos'
import {
  apagarDigitoDoAlvo,
  bufferDoAlvoParaSegundos,
  empurrarDigitoDoAlvo,
  formatAlvo,
  segundosParaBufferDoAlvo
} from '@shared/pacing'
import type { Appearance } from '@shared/types'
import { ajuda } from '../../ui/ajuda'
import { Icon } from '../../ui/Icon'
import { SliderConsole } from '../../ui/console'

/**
 * Bloco de ajustes. Sem `label` quando o nome da aba já diz o que é ali —
 * repetir o nome logo abaixo da própria aba só gasta altura.
 */
export function Group({
  label,
  acao,
  aberto,
  onAberto,
  resumo,
  marca,
  ajudaId,
  children
}: {
  label?: string
  /** controle do grupo inteiro, encostado na direita do rótulo */
  acao?: React.ReactNode
  /**
   * Grupo que fecha. `undefined` é o caso comum — grupo fixo, como sempre foi.
   *
   * Existe porque a coluna rola: uma seção que você não usa hoje custa altura
   * de todas as que você usa. O gesto é o mesmo da Ajuda rápida da coluna
   * esquerda (cabeçalho clicável e setinha que gira), e o estado mora em
   * `maquina` pelo mesmo motivo — sobrevive a fechar o app e nunca entra no
   * `.valendo`.
   */
  aberto?: boolean
  onAberto?: (aberto: boolean) => void
  /** o que o cabeçalho continua dizendo com o grupo fechado */
  resumo?: React.ReactNode
  marca?: string
  ajudaId?: AjudaId
  children: React.ReactNode
}): React.JSX.Element {
  const colapsavel = aberto !== undefined

  return (
    <div className="border-b border-[var(--color-line)]/60 px-3 py-2.5">
      {label && colapsavel ? (
        <button
          type="button"
          {...(marca ? { [`data-${marca}`]: '' } : {})}
          {...(ajudaId ? ajuda(ajudaId) : {})}
          aria-expanded={aberto}
          onClick={() => onAberto?.(!aberto)}
          className="mb-1.5 flex w-full items-center gap-1.5 text-left text-[11px] font-medium tracking-wide text-[var(--color-fog-2)]"
        >
          {label}
          {/* fechado, o cabeçalho continua informando: sem isso a linha que ele
              ocupa não paga o próprio espaço */}
          {!aberto && resumo ? <span className="flex items-center gap-1">{resumo}</span> : null}
          {acao ? <span className="ml-auto flex items-center">{acao}</span> : null}
          <Icon
            name="down"
            size={11}
            className={`${acao ? '' : 'ml-auto'} flex-none text-[var(--color-fog-3)] transition-transform ${
              aberto ? '' : '-rotate-90'
            }`}
          />
        </button>
      ) : label ? (
        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium tracking-wide text-[var(--color-fog-2)]">
          {label}
          {acao ? <span className="ml-auto flex items-center">{acao}</span> : null}
        </div>
      ) : null}
      {colapsavel && !aberto ? null : <div className="flex flex-col gap-2">{children}</div>}
    </div>
  )
}

/** Slider do console: rótulo à esquerda, valor em rosa mono à direita. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  ajudaId,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  /** o controle que este slider é, para a Ajuda rápida e a tooltip */
  ajudaId: AjudaId
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="block" {...ajuda(ajudaId)}>
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
 * O controle de peso: anda pelos degraus reais da fonte, não por uma escala fixa.
 *
 * O slider mede em ÍNDICE, não em peso. Com passo fixo de 100 ele oferecia seis
 * paradas em qualquer fonte, e em Georgia três delas desenhavam a mesma coisa —
 * o operador arrastava, o número mudava, a tela não. Andando por índice, cada
 * passo é uma face diferente por construção.
 *
 * O peso GRAVADO no roteiro não é reescrito por causa disto. Um projeto antigo
 * com 500 numa fonte que não tem 500 continua com 500 no arquivo; a bolinha é
 * que pousa no degrau que desenha o que já está na tela.
 */
export function PesoDaFonte({
  valor,
  degraus,
  rotulo,
  avisoDeFaceUnica,
  onChange
}: {
  valor: number
  degraus: number[]
  rotulo: string
  avisoDeFaceUnica: string
  onChange: (peso: number) => void
}): React.JSX.Element {
  const pousado = degrauDoValor(valor, degraus)
  const indice = Math.max(0, degraus.indexOf(pousado))
  const umaFaceSo = degraus.length < 2

  return (
    <label className="block" {...ajuda('insp.weight')} title={umaFaceSo ? avisoDeFaceUnica : undefined}>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="text-[var(--color-fog-2)]">{rotulo}</span>
        <span className="font-mono text-[11px] font-semibold text-[var(--color-accent)]">{pousado}</span>
      </div>
      <SliderConsole
        value={indice}
        min={0}
        max={Math.max(0, degraus.length - 1)}
        step={1}
        disabled={umaFaceSo}
        onValue={(i) => onChange(degraus[i] ?? valor)}
        className="w-full"
      />
      {umaFaceSo ? (
        <span className="mt-1 block text-[10px] leading-tight text-[var(--color-fog-3)]">{avisoDeFaceUnica}</span>
      ) : null}
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
export function AlvoField({
  value,
  onChange
}: {
  value: number
  onChange: (seconds: number) => void
}): React.JSX.Element {
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
      {...ajuda('insp.clockTarget')}
      value={formatAlvo(bufferDoAlvoParaSegundos(digitos))}
      onChange={() => {}}
      onKeyDown={onKeyDown}
      onFocus={() => setBuffer(segundosParaBufferDoAlvo(value))}
      onBlur={() => setBuffer(null)}
      className="w-full rounded-md border border-[var(--color-edge)] bg-[#212126] px-2 py-1 text-right text-[13px] tabular-nums text-[var(--color-fog-0)] outline-none focus:border-[var(--color-accent)]"
    />
  )
}

/*
 * Aqui morava o "?" — uma explicação que só aparecia ao passar o mouse.
 *
 * Ele resolvia um problema real: um painel de 214px não aguenta as frases
 * escritas por baixo de cada controle sem virar bula. Mas a Ajuda rápida
 * passou a fazer isso melhor: apontar o controle mostra a explicação inteira,
 * sem esperar o balão nascer e sem caber num balão. Os três "?" que existiam
 * saíram, e o que cada um dizia foi para lá — inclusive o do vidro, que
 * avisava que espelho e giro valem só na tela do apresentador.
 */

/**
 * Uma linha de toggle dentro de um grupo.
 *
 * Já teve um "?" ao lado, com o espaço dele reservado para as bolinhas de
 * estado ficarem na mesma coluna tivesse ou não dica. Os dois "?" que existiam
 * saíram: a Ajuda rápida explica cada interruptor por inteiro, e um ícone que
 * repete o que o quadro já diz é ruído numa coluna de 214px. Sem dica nenhuma,
 * todas as linhas têm a mesma largura sozinhas — o espaço reservado deixou de
 * ter função.
 */
export function ToggleRow({
  label,
  active,
  onClick,
  ajudaId
}: {
  label: string
  active: boolean
  onClick: () => void
  ajudaId: AjudaId
}): React.JSX.Element {
  return <Toggle label={label} active={active} ajudaId={ajudaId} onClick={onClick} />
}

export function Toggle({
  label,
  active,
  ajudaId,
  onClick
}: {
  label: string
  active: boolean
  ajudaId: AjudaId
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
      {...ajuda(ajudaId)}
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

/**
 * A amostra: um rótulo só, na própria fonte, no estado de AGORA.
 *
 * O painel de Ajustes é cinza sobre cinza; a saída é branco puro sobre preto
 * puro. Nesse contraste o traço incha — o branco invade o preto —, e é por isso
 * que um peso parece certo aqui no painel e pesado demais no vidro. A tira
 * devolve a luz certa para julgar: ela usa as cores REAIS da saída, e acompanha
 * se o operador trocá-las.
 *
 * Um estado por vez, e não uma escada dos pesos disponíveis: se dois degraus do
 * controle de peso saírem idênticos, é porque a fonte não tem aquelas faces, e
 * a tira mostra isso acontecendo em vez de explicar.
 *
 * `letterSpacing` entra sem conta nenhuma porque o valor da saída já é em `em`
 * — proporcional ao corpo por construção, aqui e no palco.
 *
 * O ALINHAMENTO entra também. Ele tinha ficado de fora junto com entrelinha e
 * margem, e não devia: os outros dois precisam de várias linhas para
 * acontecer, mas alinhar precisa só de LARGURA — e a tira ocupa a fileira
 * inteira do painel. Escolher Centro e ver o nome continuar encostado na
 * esquerda era a amostra desmentindo o controle logo abaixo dela.
 *
 * Entrelinha continua fora, e agora por um motivo que se pode dizer inteiro:
 * com uma linha só não há entre o que medir. Ela aparece em tamanho real, com
 * o roteiro de verdade, no painel de Transmissão ao lado.
 *
 * Fica no painel e não dentro do menu: um menu aberto tapa os sliders, e uma
 * amostra que só existisse com ele aberto nunca veria o arrasto que precisa
 * refletir.
 *
 * O ESPELHO não entra: `mirrorX` nasce ligado, mas já não vale para a prévia
 * nem para a página da rede, e um nome de fonte ao contrário não se lê.
 */
export function AmostraDaSaida({
  a,
  familia,
  nome
}: {
  a: Appearance
  familia: string
  nome: string
}): React.JSX.Element {
  return (
    <div
      data-fonte-amostra
      className="truncate rounded-md border border-[var(--color-edge)] px-2.5 py-2 text-[17px] leading-none"
      style={{
        background: a.bgColor,
        color: a.textColor,
        fontFamily: familia,
        fontWeight: a.fontWeight,
        letterSpacing: `${a.letterSpacing}em`,
        textTransform: a.allCaps ? 'uppercase' : 'none',
        textAlign: a.align
      }}
    >
      {nome}
    </div>
  )
}
