import { useEffect, useMemo, useState } from 'react'
import type { Action } from '@shared/actions'
import { FONT_OPTIONS } from '@shared/defaults'
import { PESOS, degrauDoValor, pesosQueDesenham } from '@shared/pesos'
import {
  apagarDigitoDoAlvo,
  bufferDoAlvoParaSegundos,
  empurrarDigitoDoAlvo,
  formatAlvo,
  segundosParaBufferDoAlvo
} from '@shared/pacing'
import {
  TIMER_POSITIONS,
  type Apresentador,
  type AbaDosAjustes,
  type Appearance,
  type ColorPreset,
  type PreferenciasDaMaquina,
  type Tab
} from '@shared/types'
import type { PrompterMetrics } from '../prompter/PrompterCanvas'
import type { AjudaId } from '@shared/ajuda'
import { CORES_DE_APRESENTADOR, linhasCandidatas, temParNoRoteiro } from '@shared/apresentadores'
import { larguraDoPainel } from '@shared/i18n'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'
import { Icon } from '../ui/Icon'
import { Ficha, SliderConsole } from '../ui/console'
import { SeletorDeCor } from '../ui/SeletorDeCor'
import type { Presets } from '@shared/presets'
import { FileiraDePresets, SecaoDoRodape } from './Presets'

/**
 * O chip de um apresentador: a cor que ele pinta, o nome como está no roteiro,
 * e o que fazer quando o par se perde.
 *
 * O seletor de cor é o próprio `input[type=color]` do sistema — o mesmo que já
 * escolhe texto e fundo logo acima. Inventar uma paleta própria aqui daria
 * duas gramáticas de cor no mesmo painel.
 */
function ChipDeApresentador({
  quem,
  orfao,
  global,
  onCor,
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
        rotulo={t('insp.presenterColor', { nome: quem.nome })}
        onCor={onCor}
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

/**
 * Bloco de ajustes. Sem `label` quando o nome da aba já diz o que é ali —
 * repetir o nome logo abaixo da própria aba só gasta altura.
 */
function Group({
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

/** Slider do console: rótulo à esquerda, valor em rosa mono à direita. */
function Slider({
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
 * Os degraus de peso que ESTA fonte desenha, medidos no próprio navegador.
 *
 * A régua é `measureText`: se dois pesos produzem a mesma largura, produzem a
 * mesma face — quem agrupa é `pesosQueDesenham`, que é puro e tem teste. A
 * medição precisa acontecer aqui porque só a tela sabe quais faces a máquina
 * tem instaladas, e a resposta muda de computador para computador: o mesmo
 * projeto, no Mac do cliente, pode ter mais ou menos degraus que aqui.
 *
 * A fonte embutida é variável e devolve os seis sempre; as do sistema devolvem
 * o que a máquina tiver.
 */
function usePesosDaFonte(fontFamily: string): number[] {
  const [degraus, setDegraus] = useState<number[]>(() => [...PESOS])

  useEffect(() => {
    let vivo = true

    const medir = (): void => {
      const contexto = document.createElement('canvas').getContext('2d')
      if (!contexto || !vivo) return
      // uma frase, e não uma letra: numa palavra só, duas faces diferentes
      // podem calhar de somar a mesma largura
      const amostra = 'Boa noite, e bem-vindos ao programa'
      setDegraus(
        pesosQueDesenham((peso) => {
          contexto.font = `${peso} 64px ${fontFamily}`
          return contexto.measureText(amostra).width
        })
      )
    }

    /*
     * Esperar a fonte chegar antes de medir.
     *
     * A embutida vem de um arquivo, e medir antes de ele carregar mede a
     * RESERVA do sistema. Foi o que aconteceu na primeira versão disto: o
     * controle nascia com cinco degraus — os do Segoe UI, que é a reserva —
     * numa fonte que tem seis. Pedir o carregamento peso a peso é o que
     * garante que a face medida é a que vai para a tela.
     */
    void Promise.all(PESOS.map((peso) => document.fonts.load(`${peso} 64px ${fontFamily}`)))
      .then(medir)
      .catch(medir)

    return () => {
      vivo = false
    }
  }, [fontFamily])

  return degraus
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
function PesoDaFonte({
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
function ToggleRow({
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

function Toggle({
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
        {/* a família e a caixa alta na mesma fileira: as duas dizem com que
            LETRA a saída é desenhada, e a segunda cabe num "AA" ao lado sem
            gastar uma linha do painel */}
        <div className="flex items-stretch gap-1.5">
          <select
            {...ajuda('insp.font')}
            value={a.fontFamily}
            onChange={(event) => patch({ fontFamily: event.target.value })}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-edge)] bg-[#212126] px-2 py-1.5 text-[11px] text-[var(--color-fog-05)]"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.chave)}
              </option>
            ))}
          </select>
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
            />
            <span className="text-[var(--color-fog-1)]">{t('insp.textColor')}</span>
          </label>
          <label className="flex flex-1 items-center gap-1.5" {...ajuda('insp.bgColor')}>
            <SeletorDeCor
              valor={a.bgColor}
              rotulo={t('insp.bgColor')}
              onCor={(bgColor) => patch({ bgColor })}
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
        <Slider
          ajudaId="insp.margin"
          label={t('insp.margin')}
          value={a.marginPct}
          min={0}
          max={35}
          suffix="%"
          onChange={(marginPct) => patch({ marginPct })}
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
        <Slider
          ajudaId="insp.readingMark"
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
