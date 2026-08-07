import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AjudaId } from '@shared/ajuda'
import { PALETA_CURTA, legivelNo } from '@shared/paleta'
import { useT } from '../i18n'
import { ajuda } from './ajuda'
import { useOpcoesDeCor } from './opcoesDeCor'

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
  onPrever,
  onLimpar,
  desligado,
  rotulo,
  marca,
  ajudaId,
  miolo,
  className = 'h-6 w-8'
}: {
  valor?: string
  /** cores de acesso rápido desta tela — apresentadores têm as suas, marcas as delas */
  atalhos?: string[]
  onCor: (cor: string) => void
  /**
   * Aplica a cor PROVISORIAMENTE, enquanto o botão está pressionado.
   *
   * Sem isto o seletor é o de sempre: clicou, escolheu. Com isto ele ganha o
   * que faltava — DESISTIR. Pressionar aplica na hora, arrastar pela paleta
   * troca ao vivo, soltar confirma, e soltar fora da paleta devolve a cor que
   * estava antes da pressão.
   *
   * Recebe `undefined` quando o que se está devolvendo é "sem cor" — o estado
   * de um trecho que nunca foi pintado.
   */
  onPrever?: (cor: string | undefined) => void
  /** quando existe, aparece a bolinha pontilhada que TIRA a cor em vez de trocá-la */
  onLimpar?: () => void
  desligado?: boolean
  rotulo: string
  marca?: string
  /** id da Ajuda rápida — o quadro da coluna explica o seletor ao passar o mouse */
  ajudaId?: AjudaId
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

  /*
   * A pressão: a cor que estava antes dela, guardada para a desistência.
   *
   * Num `ref` e não num `useState` porque ela é lida dentro de escutas do
   * `window` — um estado daria o valor do render em que a escuta foi criada, e
   * a desistência devolveria uma cor velha. E a marca de "estou pressionando" é
   * o próprio objeto ser não-nulo: `anterior` pode legitimamente ser
   * `undefined` (trecho sem cor), então ele não serve de bandeira.
   */
  const pressao = useRef<{ anterior: string | undefined } | null>(null)

  const pressionar = (cor: string): void => {
    if (!onPrever) return
    pressao.current = { anterior: valor }
    onPrever(cor)
  }
  const arrastarSobre = (cor: string): void => {
    if (onPrever && pressao.current) onPrever(cor)
  }
  const soltarSobre = (cor: string): void => {
    if (!pressao.current) return
    pressao.current = null
    escolher(cor)
  }

  /*
   * Soltou fora de qualquer quadrado: desiste e devolve.
   *
   * Na fase de CAPTURA, e conferindo se o alvo é um quadrado: soltar em cima de
   * um deles é confirmação, e quem confirma é o próprio quadrado. Sem essa
   * conferência esta escuta corria antes dele e desfazia a escolha no instante
   * em que ela era feita.
   */
  useLayoutEffect(() => {
    if (!aberto || !onPrever) return
    const desistir = (evento: PointerEvent): void => {
      if (!pressao.current) return
      if ((evento.target as HTMLElement | null)?.closest('[data-cor]')) return
      onPrever(pressao.current.anterior)
      pressao.current = null
    }
    window.addEventListener('pointerup', desistir, true)
    window.addEventListener('pointercancel', desistir, true)
    return () => {
      window.removeEventListener('pointerup', desistir, true)
      window.removeEventListener('pointercancel', desistir, true)
    }
  }, [aberto, onPrever])

  /* fechar o painel com uma pressão em curso (Escape, clique fora) também
     devolve: o painel some, e a cor provisória não pode ficar */
  useLayoutEffect(() => {
    if (aberto || !pressao.current) return
    onPrever?.(pressao.current.anterior)
    pressao.current = null
  }, [aberto, onPrever])

  /* empacotado uma vez: os quadrados da grade e os atalhos do rodapé recebem
     o mesmo trio, e `undefined` quando o ponto de uso não pediu prévia */
  const previa = onPrever
    ? { pressionar, arrastar: arrastarSobre, soltar: soltarSobre }
    : undefined

  const opcoes = useOpcoesDeCor()

  /*
   * O que fica apagado, e por que apagado em vez de proibido.
   *
   * A cor que não alcança 7:1 no fundo de agora continua clicável: o app avisa,
   * não manda. Há motivo legítimo para escolher uma cor fraca — casar com a
   * arte de um canal, marcar uma anotação que não é para ser lida de longe — e
   * um seletor que bloqueia obriga a desligar o aviso inteiro para atender ao
   * caso raro.
   */
  const apagado = (cor: string): string =>
    opcoes.contraste && !legivelNo(cor, opcoes.fundo) ? '0.22' : '1'

  const gradiente = 'conic-gradient(#e5484d,#f0b429,#46d17f,#12a594,#6aa8ff,#9d5bd2,#d6409f,#e5484d)'

  return (
    <>
      <button
        ref={botao}
        type="button"
        {...(marca ? { [`data-${marca}`]: '' } : {})}
        {...(ajudaId ? ajuda(ajudaId) : {})}
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
              {/* sem folga entre os quadrados, e o arredondamento só na moldura:
                  separados, eles liam como retalho em vez de paleta */}
              {opcoes.curta ? (
                /* quatro por fileira, e maiores: são oito, e cada uma é uma
                   escolha de verdade — espremê-las no tamanho da grade
                   desperdiçaria o espaço que sobrou */
                <div className="grid grid-cols-4 gap-1.5">
                  {PALETA_CURTA.map((cor) => (
                    <Quadrado
                      key={cor}
                      cor={cor}
                      valor={valor}
                      onCor={escolher}
                      previa={previa}
                      opacidade={apagado(cor)}
                      alto
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded border border-[var(--color-edge)]">
                  <div className="grid grid-cols-11">
                    {CINZAS.map((l) => (
                      <Quadrado
                        key={`c${l}`}
                        cor={hsl(0, 0, l)}
                        valor={valor}
                        onCor={escolher}
                        previa={previa}
                        opacidade={apagado(hsl(0, 0, l))}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-12">
                    {LUMINOSIDADES.map((l) =>
                      MATIZES.map((h) => (
                        <Quadrado
                          key={`${h}-${l}`}
                          cor={hsl(h, 82, l)}
                          valor={valor}
                          onCor={escolher}
                          previa={previa}
                          opacidade={apagado(hsl(h, 82, l))}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* O rodapé: os atalhos desta tela à esquerda, o código hex à
                  direita. A amostra grande que morava no TOPO saiu — o próprio
                  gatilho na barra já mostra a cor de agora, e ver o mesmo
                  quadrado duas vezes a meio centímetro de distância não
                  informava nada. O hex fica: quem casa uma marca com a arte de
                  um canal precisa LER o valor, não só apontar. */}
              <div className="mt-2 flex items-center gap-2">
                  {atalhos?.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      data-cor={cor}
                      aria-label={cor}
                      {...gestosDoQuadrado(cor, escolher, previa)}
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
                      className="grid h-[18px] w-[18px] place-items-center rounded-full border border-dashed border-[var(--color-fog-3)] text-[9px] text-[var(--color-fog-3)] hover:border-[var(--color-fog-1)] hover:text-[var(--color-fog-1)]"
                    >
                      ×
                    </button>
                  ) : null}
                <span className="ml-auto font-mono text-[11px] tracking-wide text-[var(--color-fog-2)] uppercase">
                  {valor ?? '—'}
                </span>
              </div>

              {/*
                A segunda fileira do rodapé: as duas chaves da paleta.

                Aqui e não no topo porque as duas são AJUSTE do seletor, não
                escolha de cor — quem abriu o painel veio pegar uma cor, e o
                que decide como a paleta se comporta fica onde já moram os
                atalhos e o código hexadecimal.
              */}
              <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--color-edge)] pt-2">
                <button
                  type="button"
                  data-paleta-curta
                  {...ajuda('color.short')}
                  aria-pressed={opcoes.curta}
                  onClick={() => opcoes.onCurta(!opcoes.curta)}
                  className={`rounded-[5px] border px-2 py-1 text-[10px] tracking-[0.04em] ${
                    opcoes.curta
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent-soft)]'
                      : 'border-[var(--color-edge)] text-[var(--color-fog-2)] hover:text-[var(--color-fog-0)]'
                  }`}
                >
                  {t('color.short')}
                </button>
                <button
                  type="button"
                  data-filtro-contraste
                  {...ajuda('color.contrast')}
                  aria-pressed={opcoes.contraste}
                  onClick={() => opcoes.onContraste(!opcoes.contraste)}
                  className={`ml-auto flex items-center gap-1.5 rounded-[5px] border px-2 py-1 text-[10px] tracking-[0.04em] ${
                    opcoes.contraste
                      ? 'border-[var(--color-go)] bg-[var(--color-go)]/12 text-[var(--color-go)]'
                      : 'border-[var(--color-edge)] text-[var(--color-fog-3)] hover:text-[var(--color-fog-1)]'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full border border-[var(--color-edge)]"
                    style={{ background: opcoes.fundo }}
                  />
                  {t('color.contrast')}
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

/**
 * Os gestos de um quadrado da paleta, com e sem prévia.
 *
 * Sem prévia é o de sempre: um `onClick`. Com prévia, quem confirma é o
 * `pointerup`, e não o clique — arrastar de um quadrado até outro faz o
 * navegador disparar o `click` no PAI dos dois, e a escolha se perderia
 * justamente no gesto que este recurso existe para permitir.
 *
 * O `onClick` fica assim mesmo, para o teclado: um botão acionado por Enter ou
 * espaço dispara clique sem ponteiro nenhum, e `detail === 0` é como se
 * reconhece esse caso — é o discriminador padrão, não um truque.
 */
function gestosDoQuadrado(
  cor: string,
  onCor: (cor: string) => void,
  previa?: {
    pressionar: (cor: string) => void
    arrastar: (cor: string) => void
    soltar: (cor: string) => void
  }
): React.ComponentProps<'button'> {
  if (!previa) return { onClick: () => onCor(cor) }
  return {
    onPointerDown: () => previa.pressionar(cor),
    onPointerEnter: () => previa.arrastar(cor),
    onPointerUp: () => previa.soltar(cor),
    onClick: (evento) => {
      if (evento.detail === 0) onCor(cor)
    }
  }
}

function Quadrado({
  cor,
  valor,
  onCor,
  previa,
  opacidade = '1',
  alto
}: {
  cor: string
  valor?: string
  onCor: (cor: string) => void
  previa?: Parameters<typeof gestosDoQuadrado>[2]
  /** apagado quando o filtro de contraste reprova a cor no fundo de agora */
  opacidade?: string
  /** na paleta curta os quadrados são maiores: são oito, e há espaço */
  alto?: boolean
}): React.JSX.Element {
  const atual = valor?.toLowerCase() === cor.toLowerCase()
  return (
    <button
      type="button"
      data-cor={cor}
      aria-label={cor}
      {...gestosDoQuadrado(cor, onCor, previa)}
      /* o realce é para DENTRO (`inset`): uma borda para fora empurraria os
         vizinhos e a grade inteira tremeria ao passar o mouse */
      className={`w-full ${alto ? 'h-7 rounded-[5px]' : 'aspect-square'} ${
        atual ? 'outline outline-2 -outline-offset-2 outline-white' : 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-white/70'
      }`}
      style={{ background: cor, opacity: opacidade }}
    />
  )
}
