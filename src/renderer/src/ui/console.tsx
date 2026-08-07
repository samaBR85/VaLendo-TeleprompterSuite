import type { CSSProperties } from 'react'

/**
 * O kit de console: os componentes por cima dos materiais de `styles.css`.
 *
 * A maquete do redesenho desenha o app como uma mesa de operação — teclas com
 * relevo, poços afundados, mostradores de LCD, molduras com filete colorido.
 * Esses materiais vivem como classes `.k-*` no CSS (o desenho num lugar só);
 * aqui ficam os componentes que os compõem, para que Toolbar, Inspector,
 * gaveta e rodapé montem a mesma tecla em vez de cada um inventar a sua.
 *
 * A cor de um estado aceso viaja pela variável `--k-cor`: o kit decide o
 * DESENHO de "aceso", o ponto de uso decide a COR — rosa para escolha de
 * interface, vermelho para tela preta, verde para rede no ar.
 */

/** Espalha `--k-cor` num style sem brigar com o TypeScript a cada uso. */
function comCor(style: CSSProperties | undefined, cor: string | undefined): CSSProperties | undefined {
  if (!cor) return style
  return { ...style, '--k-cor': cor } as CSSProperties
}

interface TeclaProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** tecla com estado ligado: fundo e glifo tingidos de `cor` */
  acesa?: boolean
  cor?: string
  /** a variante do play: verde, com brilho vazando — só existe uma na mesa */
  play?: boolean
}

/** Uma tecla física: gradiente, aresta preta, fio de luz em cima. */
export function Tecla({ acesa, cor, play, className = '', style, children, ...rest }: TeclaProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`k-tecla ${play ? 'k-tecla-play' : ''} ${acesa ? 'k-tecla-acesa' : ''} ${className}`}
      style={comCor(style, cor)}
      {...rest}
    >
      {children}
    </button>
  )
}

interface PocoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** micro-caps ao lado do poço — PROJETO, ROTEIRO, SAÍDA */
  rotulo?: string
  /** cor do rótulo; o poço em si não muda de cor nunca */
  cor?: string
  /** variante mais funda, para teclas grandes (transporte, seletor de modo) */
  fundo?: boolean
}

/** A cama afundada onde um grupo de teclas assenta. */
export function Poco({ rotulo, cor, fundo, className = '', children, ...rest }: PocoProps): React.JSX.Element {
  const poco = <div className={`k-poco ${fundo ? 'k-poco-fundo' : ''} ${rotulo ? '' : className}`}>{children}</div>

  if (!rotulo) {
    return (
      <div className="contents" {...rest}>
        {poco}
      </div>
    )
  }

  return (
    <div className={`flex flex-none items-center gap-[7px] ${className}`} {...rest}>
      <span className="k-microcaps flex-none" style={{ color: cor ?? 'var(--color-fog-2)' }}>
        {rotulo}
      </span>
      {poco}
    </div>
  )
}

/** O vidro de um mostrador: tudo que é lido de relance mora dentro de um destes. */
export function Lcd({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={`k-lcd ${className}`} {...rest}>
      {children}
    </div>
  )
}

interface DigitoProps {
  valor: string
  rotulo: string
  /** sem cor é o branco esverdeado de LCD — o PPM da maquete */
  cor?: string
  tamanho?: number
  className?: string
}

/** Um dígito de mostrador: número mono grande, legenda micro-caps embaixo. */
export function Digito({ valor, rotulo, cor, tamanho = 26, className = '' }: DigitoProps): React.JSX.Element {
  return (
    <div className={`flex flex-none flex-col items-center justify-center ${className}`}>
      <div
        className="font-mono leading-none font-semibold tabular-nums"
        style={{ fontSize: tamanho, color: cor ?? '#e9f4ee' }}
      >
        {valor}
      </div>
      {/*
        `leading-none` no rótulo, e é o que centraliza o mostrador de verdade.

        A caixa do conjunto já era centrada — o flex faz isso —, mas a TINTA
        não: algarismo não tem descendente, então a quinta parte de baixo da
        caixa do número é sempre vazia, enquanto o rótulo trazia meio-leading
        sobrando embaixo. Somadas, essas duas folgas ficavam quase todas do
        mesmo lado, e o conjunto lia como se estivesse subido — 1,5px num
        mostrador de 38px, que é pouco de medir e muito de ver.

        Com a caixa do rótulo colada na sua própria letra, a folga que sobra
        embaixo (o descendente do rótulo) fica do tamanho da que sobra em cima
        (o vão acima do algarismo), e centrar a caixa passa a centrar a tinta.
      */}
      <div className="k-microcaps mt-1 leading-none text-[var(--color-lcd-label)]">{rotulo}</div>
    </div>
  )
}

interface CabecalhoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** a assinatura da seção: âmbar=Edição, vermelho=Saída, roxo=Cards, rosa=Ajustes */
  cor?: string
  /** cabeçalho de seção da coluna (tique colorido), em vez de filete no topo */
  tique?: boolean
  /** ponto de estado antes do título, fundido na cor da seção — o da Saída */
  ponto?: boolean
  titulo: string
  detalhe?: React.ReactNode
  acao?: React.ReactNode
}

/**
 * Cabeçalho de painel com moldura: gradiente tingido + filete da cor no topo.
 * Na variante `tique` (seções da coluna esquerda) o gradiente fica neutro e a
 * cor vira só a barrinha — a coluna inteira é uma seção, não quatro painéis.
 */
export function CabecalhoDePainel({
  cor,
  tique,
  ponto,
  titulo,
  detalhe,
  acao,
  className = '',
  style,
  children,
  ...rest
}: CabecalhoProps): React.JSX.Element {
  return (
    <div className={`k-cabecalho ${className}`} style={comCor(style, tique ? undefined : cor)} {...rest}>
      {tique && cor ? <span className="h-3 w-[3px] flex-none rounded-sm" style={{ background: cor }} /> : null}
      {ponto && cor ? (
        <span
          className="h-[7px] w-[7px] flex-none rounded-full"
          style={{ background: `color-mix(in srgb, ${cor} 30%, #1a1a1a)`, boxShadow: 'inset 0 0 3px #000' }}
        />
      ) : null}
      <span className={tique ? 'text-[11px] font-semibold text-[var(--color-fog-05)]' : 'k-cabecalho-titulo'}>
        {titulo}
      </span>
      {/* `flex-none` e sem quebra: o detalhe era o que cedia quando o painel
          apertava, porque as teclas ao lado são todas `flex-none` e ele não.
          O resultado era "83 palavras · 1:54" virando duas linhas espremidas
          enquanto as bolinhas de cor seguiam inteiras — o oposto da ordem de
          importância. Quem cede agora são as bolinhas, uma a uma (ver
          `k-cabecalho` no styles.css). */}
      {detalhe ? (
        <span
          data-cabecalho-detalhe
          className="flex-none text-[10px] whitespace-nowrap text-[var(--color-fog-3)]"
        >
          {detalhe}
        </span>
      ) : null}
      {children}
      {acao ? <span className="ml-auto flex items-center gap-1">{acao}</span> : null}
    </div>
  )
}

interface FichaProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ativa?: boolean
  cor?: string
}

/** A ficha de escolher: chip plano — opção, não tecla. */
export function Ficha({ ativa, cor, className = '', style, children, ...rest }: FichaProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`k-ficha ${ativa ? 'k-ficha-ativa' : ''} ${className}`}
      style={comCor(style, cor)}
      {...rest}
    >
      {children}
    </button>
  )
}

interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'> {
  value: number
  min: number
  max: number
  step?: number
  cor?: string
  /** escala de card de vídeo: trilho de 3px, polegar de 9px */
  mini?: boolean
  onValue: (value: number) => void
}

/**
 * O slider do console: trilho preenchido até o valor, polegar prateado.
 * O CSS não sabe o valor do range — o preenchimento viaja na variável
 * `--fill`, calculada aqui, que o trilho usa como parada do gradiente.
 */
export function SliderConsole({
  value,
  min,
  max,
  step,
  cor,
  mini,
  className = '',
  style,
  onValue,
  ...rest
}: SliderProps): React.JSX.Element {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onValue(Number(event.target.value))}
      className={`k-slider ${mini ? 'k-slider-mini' : ''} ${className}`}
      style={{ ...comCor(style, cor), '--fill': `${fill}%` } as CSSProperties}
      {...rest}
    />
  )
}
