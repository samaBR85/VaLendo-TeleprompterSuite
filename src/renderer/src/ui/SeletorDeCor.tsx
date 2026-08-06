import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'

/**
 * O seletor de cor do app inteiro.
 *
 * Substituiu o `input[type=color]` do sistema em todos os pontos, por dois
 * motivos práticos: aquele abre um diálogo do sistema operacional — modal,
 * grande, com a cara do Windows no meio de um console preto — e confirma a cor
 * enquanto se ARRASTA, não ao soltar. Aqui a cor é escolhida por CLIQUE num
 * quadrado, e clique é, por definição, no soltar: o problema do arrasto some
 * sem precisar de código para tratá-lo.
 *
 * **Sem opacidade**, e é decisão: texto meio transparente no vidro de um
 * teleprompter é texto mais difícil de ler, o oposto do que pintar uma palavra
 * quer dizer. Fora que a cor viaja como `#rrggbb` no projeto, e a alfa mudaria
 * o formato de todo arquivo já salvo.
 */

/** 12 matizes, do vermelho de volta ao vermelho. */
const MATIZES = Array.from({ length: 12 }, (_, i) => i * 30)

/**
 * Cinco luminosidades, da mais escura à mais clara.
 *
 * Nem 0% nem 100%: os dois extremos devolvem preto e branco em QUALQUER
 * matiz, e doze quadrados idênticos numa fileira não escolhem nada. Preto e
 * branco moram na fileira de cinzas, onde aparecem uma vez só.
 */
const LUMINOSIDADES = [30, 44, 57, 70, 83]

/** Onze cinzas, do preto ao branco. */
const CINZAS = Array.from({ length: 11 }, (_, i) => i * 10)

const LARGURA = 244
/** respiro entre o painel e a borda da tela, e entre ele e o botão */
const FOLGA = 8

function hsl(h: number, s: number, l: number): string {
  // guardado como hex porque é o que o resto do app grava no projeto
  const a = (s * Math.min(l, 100 - l)) / 100
  const canal = (n: number): string => {
    const k = (n + h / 30) % 12
    const cor = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round((255 * cor) / 100)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(0)}${canal(8)}${canal(4)}`
}

export function SeletorDeCor({
  valor,
  atalhos,
  onCor,
  onLimpar,
  desligado,
  rotulo,
  marca,
  miolo,
  className = 'h-6 w-8'
}: {
  valor?: string
  /** cores de acesso rápido desta tela — apresentadores têm as suas, marcas as delas */
  atalhos?: string[]
  onCor: (cor: string) => void
  /** quando existe, aparece a bolinha pontilhada que TIRA a cor em vez de trocá-la */
  onLimpar?: () => void
  desligado?: boolean
  rotulo: string
  marca?: string
  className?: string
  /**
   * A cor vai num quadrado DENTRO do botão, e não no botão inteiro.
   *
   * É o que faz o seletor virar uma tecla igual às vizinhas onde ele entra
   * numa fila de ferramentas: lá o botão precisa ter a mesma altura das
   * outras (folga + 14px), e um retângulo de cor daquele tamanho pesaria mais
   * que os ícones ao lado. Sem `miolo`, a cor toma o botão todo — que é o
   * certo nos lugares onde ele é uma amostra, não uma tecla.
   */
  miolo?: string
}): React.JSX.Element {
  const { t } = useT()
  const [aberto, setAberto] = useState(false)
  const [caixa, setCaixa] = useState<{ left: number; top: number } | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)

  /*
   * O painel é filho do BODY, não do botão, e a posição é calculada à mão.
   *
   * Filho do botão ele herdava o `overflow: hidden` da barra em que o botão
   * mora, e era cortado ao meio no cabeçalho do editor. E, mesmo sem corte,
   * `absolute` não sabe onde termina a tela: no chip de apresentador, lá no pé
   * da coluna, ele abria para baixo e metade ficava fora da janela.
   *
   * Aqui a conta é feita depois de medir o painel de verdade: se não couber
   * abaixo do botão, ele vira para cima; se passar da direita, encosta na
   * borda. Medir antes de mostrar é o que evita o salto de um quadro com ele
   * no lugar errado.
   */
  useLayoutEffect(() => {
    if (!aberto) return setCaixa(null)
    const gatilho = botao.current?.getBoundingClientRect()
    const alturaDoPainel = painel.current?.offsetHeight ?? 240
    if (!gatilho) return

    const left = Math.min(Math.max(FOLGA, gatilho.left), window.innerWidth - LARGURA - FOLGA)
    const cabeAbaixo = gatilho.bottom + FOLGA + alturaDoPainel <= window.innerHeight - FOLGA
    const top = cabeAbaixo
      ? gatilho.bottom + FOLGA
      : Math.max(FOLGA, gatilho.top - FOLGA - alturaDoPainel)

    setCaixa({ left, top })
  }, [aberto])

  useLayoutEffect(() => {
    if (!aberto) return
    const fechar = (evento: MouseEvent): void => {
      const alvo = evento.target as Node
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false)
    }
    const escapar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') setAberto(false)
    }
    // `true`: pega o clique na fase de captura, antes de qualquer painel que
    // feche sozinho no mousedown e leve este junto
    window.addEventListener('mousedown', fechar, true)
    window.addEventListener('keydown', escapar)
    window.addEventListener('resize', () => setAberto(false))
    return () => {
      window.removeEventListener('mousedown', fechar, true)
      window.removeEventListener('keydown', escapar)
    }
  }, [aberto])

  const escolher = (cor: string): void => {
    onCor(cor)
    setAberto(false)
  }

  const gradiente = 'conic-gradient(#e5484d,#f0b429,#46d17f,#12a594,#6aa8ff,#9d5bd2,#d6409f,#e5484d)'

  return (
    <>
      <button
        ref={botao}
        type="button"
        {...(marca ? { [`data-${marca}`]: '' } : {})}
        title={rotulo}
        aria-label={rotulo}
        aria-expanded={aberto}
        disabled={desligado}
        onClick={() => setAberto((v) => !v)}
        className={
          miolo
            ? `grid flex-none place-items-center disabled:opacity-30 ${className}`
            : `flex-none rounded border border-[var(--color-edge)] disabled:opacity-30 ${className}`
        }
        style={miolo ? undefined : { background: valor ?? gradiente }}
      >
        {miolo ? <span className={miolo} style={{ background: valor ?? gradiente }} /> : null}
      </button>

      {aberto
        ? createPortal(
            <div
              ref={painel}
              data-seletor-de-cor
              /* invisível até a posição estar calculada: sem isto o painel
                 pisca por um quadro no canto de cima da tela */
              style={{
                position: 'fixed',
                left: caixa?.left ?? -9999,
                top: caixa?.top ?? -9999,
                width: LARGURA,
                visibility: caixa ? 'visible' : 'hidden'
              }}
              className="z-[100] rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] p-2 shadow-[0_12px_36px_rgba(0,0,0,.7)]"
            >
              {/* a cor de agora, à esquerda, e o código dela — quem trabalha com
                  marca de canal precisa poder LER o valor, não só apontar */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-6 w-6 flex-none rounded border border-[var(--color-edge)]"
                  style={{ background: valor ?? gradiente }}
                />
                <span className="font-mono text-[11px] tracking-wide text-[var(--color-fog-2)] uppercase">
                  {valor ?? '—'}
                </span>
              </div>

              {/* sem folga entre os quadrados, e o arredondamento só na moldura:
                  separados, eles liam como retalho em vez de paleta */}
              <div className="overflow-hidden rounded border border-[var(--color-edge)]">
                <div className="grid grid-cols-11">
                  {CINZAS.map((l) => (
                    <Quadrado key={`c${l}`} cor={hsl(0, 0, l)} valor={valor} onCor={escolher} />
                  ))}
                </div>
                <div className="grid grid-cols-12">
                  {LUMINOSIDADES.map((l) =>
                    MATIZES.map((h) => (
                      <Quadrado key={`${h}-${l}`} cor={hsl(h, 82, l)} valor={valor} onCor={escolher} />
                    ))
                  )}
                </div>
              </div>

              {atalhos?.length || onLimpar ? (
                <div className="mt-2 flex items-center gap-2">
                  {atalhos?.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      data-cor={cor}
                      aria-label={cor}
                      onClick={() => escolher(cor)}
                      className="h-[18px] w-[18px] rounded-full border border-[var(--color-edge)] transition-transform hover:scale-110"
                      style={{ background: cor }}
                    />
                  ))}
                  {onLimpar ? (
                    <button
                      type="button"
                      data-cor-limpar
                      title={t('editor.colorNone')}
                      aria-label={t('editor.colorNone')}
                      onClick={() => {
                        onLimpar()
                        setAberto(false)
                      }}
                      className="ml-auto grid h-[18px] w-[18px] place-items-center rounded-full border border-dashed border-[var(--color-fog-3)] text-[9px] text-[var(--color-fog-3)] hover:border-[var(--color-fog-1)] hover:text-[var(--color-fog-1)]"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

function Quadrado({
  cor,
  valor,
  onCor
}: {
  cor: string
  valor?: string
  onCor: (cor: string) => void
}): React.JSX.Element {
  const atual = valor?.toLowerCase() === cor.toLowerCase()
  return (
    <button
      type="button"
      data-cor={cor}
      aria-label={cor}
      onClick={() => onCor(cor)}
      /* o realce é para DENTRO (`inset`): uma borda para fora empurraria os
         vizinhos e a grade inteira tremeria ao passar o mouse */
      className={`aspect-square w-full ${
        atual ? 'outline outline-2 -outline-offset-2 outline-white' : 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-white/70'
      }`}
      style={{ background: cor }}
    />
  )
}
