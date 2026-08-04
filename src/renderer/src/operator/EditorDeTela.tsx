import { useLayoutEffect, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import type { Chave } from '@shared/i18n'
import {
  alinhamentoDoRecado,
  ANGULO_PADRAO,
  animacaoDoFundo,
  ANIMACOES,
  CORPO_MAX,
  CORPO_MIN,
  FADE_MAX,
  FADE_MIN,
  FORCA_MAX,
  FORCA_MIN,
  FREQ_MAX,
  FREQ_MIN,
  type AlinhamentoDoRecado,
  type AnimacaoDeFundo,
  type PosicaoDoRecado
} from '@shared/tela'
import type { Cartao } from '@shared/types'
import { useT } from '../i18n'
import { TelaDoCartao } from '../prompter/PrompterCanvas'
import { Ficha, SliderConsole } from '../ui/console'
import { Icon, type IconName } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { ajuda } from '../ui/ajuda'

type CartaoDeTela = Extract<Cartao, { kind: 'tela' }>

const LARGURA = 400

/*
 * A prévia ENCOLHE para os controles caberem, em vez de ter altura fixa.
 *
 * A primeira versão tinha um número escrito aqui, escolhido para caber. Não
 * cabia: a altura útil é uma fração da janela do app, e ela varia com o tamanho
 * da janela E com a escala da interface — a 125% a mesma janela oferece 80%
 * dos pixels em CSS. Um número que serve numa máquina rola na outra.
 *
 * Agora a altura é calculada do espaço que sobra e a largura sai dela pelo
 * 16:9: com folga o quadro cresce, sem folga ele diminui, e a proporção não
 * muda em nenhum dos casos. 16:9 de verdade importa porque o recado se
 * posiciona no topo, no meio ou no pé — num quadro achatado, o "pé" fica num
 * lugar que não é o pé da tela do apresentador.
 *
 * O piso é 96 — ainda maior que o ladrilho de 90 da gaveta, e é o número que
 * faz a janela caber inteira mesmo no caso mais apertado que dá para montar
 * aqui: uma janela de 760 com a interface a 125%, que sobra 600 pixels em
 * CSS. A rolagem continua no código como último recurso; nos tamanhos que
 * existem de verdade ela não aparece.
 */
const PREVIA_MINIMA = 96
/*
 * O teto é o 16:9 da largura disponível.
 *
 * Sem ele, o quadro — que tira a largura da ALTURA para manter a proporção —
 * cresceria mais largo que a janela numa tela alta, e o `max-width` cortaria
 * só a largura: o 16:9 se perderia sem nada avisar, porque o desenho de
 * dentro é absoluto e preenche a caixa que existir.
 */
const PREVIA_MAXIMA = Math.round(((LARGURA - 24) * 9) / 16)

/*
 * Quanto da altura da janela esta modal ocupa, e o respiro do corpo (padding
 * de cima e de baixo mais o vão entre a prévia e os controles).
 *
 * 84 em vez dos 70 que o `Modal` usa por padrão. Os 70 servem para as modais
 * que são LISTAS — rolar uma lista é o esperado. Aqui rolar tira metade dos
 * ajustes da tela junto com a prévia, e aí se mexe no que não se está vendo.
 * O topo da modal fica em 12vh, então 84 é o limite antes de ela encostar no
 * pé da janela.
 *
 * O número vai para os dois lados: entra no `Modal` como prop e entra na
 * conta abaixo, que precisa dele ANTES de existir caixa para medir.
 */
const TETO_DO_MODAL = 84
const TETO_EM_FRACAO = TETO_DO_MODAL / 100
const RESPIRO_DO_CORPO = 24 + 8

const POSICOES: PosicaoDoRecado[] = ['topo', 'meio', 'pe']

/* A segunda cor que entra quando o operador pede gradiente ou efeito num
   fundo que ainda era chapado — a mesma dos dois lados, para "gradiente" e
   depois "animado" não devolverem paletas diferentes. */
const SEGUNDA_COR = '#8e3fd4'

const ROTULO_DO_EFEITO: Record<AnimacaoDeFundo, Chave> = {
  deriva: 'cards.fxDrift',
  respiro: 'cards.fxBreathe',
  varredura: 'cards.fxSweep',
  ondas: 'cards.fxWaves',
  barras: 'cards.fxBars',
  poeira: 'cards.fxDust'
}

/* Os rótulos de alinhamento já existem nos 6 idiomas, do painel de Ajustes —
   é o mesmo conceito, e traduzir duas vezes a mesma palavra é como as duas
   acabam divergindo. */
const ALINHAMENTOS: {
  id: AlinhamentoDoRecado
  icone: IconName
  rotulo: Chave
}[] = [
  { id: 'left', icone: 'alinharEsquerda', rotulo: 'insp.alignLeft' },
  { id: 'center', icone: 'alinharCentro', rotulo: 'insp.alignCenter' },
  { id: 'right', icone: 'alinharDireita', rotulo: 'insp.alignRight' }
]

/* `.k-ficha` não traz respiro nenhum — quem usa é que diz quanto. Aqui a
   janela tem espaço, então o texto ganha uma folga maior que a dos painéis
   estreitos, onde cada pixel de largura está disputado. */
const FICHA = 'px-2.5 py-[5px] text-[11px]'

/*
 * A coluna dos três alinhamentos tem de terminar EXATAMENTE onde o campo de
 * recado termina — as bases desencontradas são a primeira coisa que o olho
 * pega. As duas alturas saem da mesma conta em vez de serem dois números
 * escolhidos à mão que combinam hoje e param de combinar no primeiro ajuste.
 */
const ALTURA_DA_FICHA = 18
const RESPIRO_ENTRE_FICHAS = 3
const ALTURA_DO_CAMPO = ALTURA_DA_FICHA * 3 + RESPIRO_ENTRE_FICHAS * 2

/**
 * O editor do cartão de tela.
 *
 * Duas decisões de desenho que valem explicar:
 *
 * 1. **A prévia é grande.** Foi o motivo de este editor ser uma janela em vez
 *    de controles dentro do ladrilho de 176px da gaveta: quem escolhe a cor
 *    de um fundo está mirando um monitor de estúdio a três metros do
 *    apresentador, e isso não se julga num selo.
 *
 * 2. **Não tem Salvar.** Cada controle despacha na hora, como o resto do app —
 *    um "Salvar" aqui criaria um estado intermediário que só existe nesta
 *    janela, e com ele a pergunta de o que fazer quando o operador fecha no ×
 *    com o cartão JÁ no ar. Fechar é fechar; desfazer é o Ctrl+Z de sempre.
 */
export function EditorDeTela({
  card,
  dispatch,
  onClose
}: {
  card: CartaoDeTela
  dispatch: (action: Action) => void
  onClose: () => void
}): React.JSX.Element {
  const { t } = useT()
  const gradiente = card.fundo.ate !== undefined
  const efeito = animacaoDoFundo(card.fundo)

  /*
   * A altura real do quadro, observada.
   *
   * Ela muda quando a janela muda de tamanho, quando a escala da interface
   * muda e quando as fileiras de controle aparecem ou somem (ligar um efeito
   * acrescenta três linhas e come altura da prévia). Um `useState` sem
   * observador ficaria com o valor da primeira pintura, e o recado sairia no
   * tamanho errado a partir do segundo estado.
   */
  const corpoRef = useRef<HTMLDivElement>(null)
  const controlesRef = useRef<HTMLDivElement>(null)
  const [alturaDaPrevia, setAlturaDaPrevia] = useState(PREVIA_MAXIMA)

  useLayoutEffect(() => {
    const corpo = corpoRef.current
    const controles = controlesRef.current
    if (!corpo || !controles) return undefined
    const medir = (): void => {
      /*
       * A conta vem da JANELA, não da caixa em volta.
       *
       * Perguntar a altura ao pai daria uma volta: a altura dele depende do
       * conteúdo, que é justamente o que se está calculando. A tentativa
       * anterior foi essa, com `height: 100%` e `aspect-ratio` — sem altura
       * definida no pai, o 100% vira `auto`, a razão não tem de onde sair e
       * o quadro colapsou para 3 por 2 pixels. Sem erro nenhum.
       */
      const cabecalho = (corpo.parentElement?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0
      const teto = window.innerHeight * TETO_EM_FRACAO - cabecalho - RESPIRO_DO_CORPO
      const livre = teto - controles.offsetHeight
      setAlturaDaPrevia(Math.round(Math.min(PREVIA_MAXIMA, Math.max(PREVIA_MINIMA, livre))))
    }
    medir()
    /* os controles mudam de altura quando um efeito liga (entram três
       fileiras) e quando o idioma muda o comprimento dos rótulos */
    const observador = new ResizeObserver(medir)
    observador.observe(controles)
    window.addEventListener('resize', medir)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [])

  const mexerNoFundo = (fundo: Partial<CartaoDeTela['fundo']>): void => {
    dispatch({ type: 'card/tela', cardId: card.id, fundo })
  }
  const mexerNoRecado = (recado: Partial<CartaoDeTela['recado']>): void => {
    dispatch({ type: 'card/tela', cardId: card.id, recado })
  }

  return (
    <Modal
      title={card.nome || t('cards.screen')}
      subtitle={t('cards.editScreen')}
      width={LARGURA}
      maxVh={TETO_DO_MODAL}
      onClose={onClose}
    >
      <div ref={corpoRef} data-tela-corpo className="flex min-h-0 flex-col gap-2 overflow-y-auto p-3">
        {/* A altura vem do cálculo e a largura sai dela pelo 16:9. O quadro é
            centrado porque numa janela baixa ele fica mais estreito que a
            caixa, e encostado à esquerda pareceria desalinhado. */}
        <div className="flex flex-none justify-center" style={{ height: alturaDaPrevia }}>
          <div
            data-tela-previa
            className="relative h-full overflow-hidden rounded-lg border border-[var(--color-edge)]"
            style={{ aspectRatio: '16 / 9' }}
          >
            <TelaDoCartao card={card} altura={alturaDaPrevia} />
          </div>
        </div>

        <div ref={controlesRef} className="flex flex-none flex-col gap-2">
          {/* ------------------------------------------------------- o fundo */}
          <Linha rotulo={t('cards.background')}>
            <div className="flex gap-[3px]">
              <Ficha
                data-tela-fundo="chapado"
                {...ajuda('cards.background')}
                className={FICHA}
                ativa={!gradiente && !efeito}
                /* tirar a segunda cor é o que devolve o chapado — e ela some do
                 objeto, não vira string vazia, senão o fundo continuaria
                 sendo um gradiente para lugar nenhum */
                onClick={() => mexerNoFundo({ ate: undefined, animacao: undefined })}
              >
                {t('cards.flat')}
              </Ficha>
              <Ficha
                data-tela-fundo="gradiente"
                {...ajuda('cards.background')}
                className={FICHA}
                ativa={gradiente && !efeito}
                onClick={() =>
                  mexerNoFundo({
                    ate: card.fundo.ate ?? SEGUNDA_COR,
                    angulo: card.fundo.angulo ?? ANGULO_PADRAO,
                    animacao: undefined
                  })
                }
              >
                {t('cards.gradient')}
              </Ficha>
              <Ficha
                data-tela-fundo="animado"
                {...ajuda('cards.screenEffect')}
                className={FICHA}
                ativa={Boolean(efeito)}
                /* Ligar o efeito garante a segunda cor: os seis se movem ENTRE
                 duas cores, e num fundo chapado eles rodariam sem nada para
                 mostrar — o operador veria o controle não fazer nada. */
                onClick={() =>
                  mexerNoFundo({
                    animacao: efeito ?? 'deriva',
                    ate: card.fundo.ate ?? SEGUNDA_COR
                  })
                }
              >
                {t('cards.animated')}
              </Ficha>
            </div>
          </Linha>

          {efeito ? (
            <Linha rotulo={t('cards.effect')}>
              {/* Grade de três, e não uma fileira que quebra: os seis nomes têm
                comprimentos diferentes em cada idioma, e deixados soltos eles
                quebram num lugar diferente por idioma — em português sobrava
                "Poeira" órfã numa segunda linha. Três por três é igual nos
                seis, e parece decisão em vez de sobra. */}
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-[3px]">
                {ANIMACOES.map((nome) => (
                  <Ficha
                    key={nome}
                    data-tela-efeito={nome}
                    {...ajuda('cards.screenEffect')}
                    className="px-1 py-[5px] text-[11px]"
                    ativa={efeito === nome}
                    onClick={() => mexerNoFundo({ animacao: nome })}
                  >
                    {t(ROTULO_DO_EFEITO[nome])}
                  </Ficha>
                ))}
              </div>
            </Linha>
          ) : null}

          {/* Os dois valem para os SEIS: a frequência divide a duração de cada
            um e a intensidade multiplica a opacidade do que se mexe. Por isso
            são um controle só cada, e não seis. */}
          {efeito ? (
            <>
              <Linha rotulo={t('cards.frequency')}>
                <SliderConsole
                  data-tela-frequencia
                  {...ajuda('cards.frequency')}
                  aria-label={t('cards.frequency')}
                  value={card.fundo.frequencia ?? 100}
                  min={FREQ_MIN}
                  max={FREQ_MAX}
                  step={5}
                  onValue={(v) => mexerNoFundo({ frequencia: v })}
                  className="min-w-0 flex-1"
                />
                <Valor>{`${card.fundo.frequencia ?? 100}%`}</Valor>
              </Linha>
              <Linha rotulo={t('cards.intensity')}>
                <SliderConsole
                  data-tela-intensidade
                  {...ajuda('cards.intensity')}
                  aria-label={t('cards.intensity')}
                  value={card.fundo.intensidade ?? 100}
                  min={FORCA_MIN}
                  max={FORCA_MAX}
                  onValue={(v) => mexerNoFundo({ intensidade: v })}
                  className="min-w-0 flex-1"
                />
                <Valor>{`${card.fundo.intensidade ?? 100}%`}</Valor>
              </Linha>
            </>
          ) : null}

          <Linha rotulo={t('cards.colours')}>
            <Amostra
              valor={card.fundo.de}
              rotulo={t('cards.colourFrom')}
              marca="de"
              onCor={(cor) => mexerNoFundo({ de: cor })}
            />
            {gradiente ? (
              <Amostra
                valor={card.fundo.ate ?? SEGUNDA_COR}
                rotulo={t('cards.colourTo')}
                marca="ate"
                onCor={(cor) => mexerNoFundo({ ate: cor })}
              />
            ) : null}
            {/* O ângulo só existe no gradiente PARADO: cada efeito tem o
              caminho próprio pelo qual as cores andam, e um controle que o
              operador mexe sem nada acontecer é pior que controle nenhum. */}
            {gradiente && !efeito ? (
              <>
                <span className="ml-1 text-[11px] text-[var(--color-fog-2)]">{t('cards.angle')}</span>
                <SliderConsole
                  data-tela-angulo
                  {...ajuda('cards.angle')}
                  aria-label={t('cards.angle')}
                  value={card.fundo.angulo ?? ANGULO_PADRAO}
                  min={0}
                  max={360}
                  step={5}
                  onValue={(v) => mexerNoFundo({ angulo: v })}
                  className="min-w-0 flex-1"
                />
                <Valor>{`${card.fundo.angulo ?? ANGULO_PADRAO}°`}</Valor>
              </>
            ) : null}
          </Linha>

          {gradiente && !efeito ? (
            <Linha rotulo={t('cards.fade')}>
              <SliderConsole
                data-tela-fade
                {...ajuda('cards.fade')}
                aria-label={t('cards.fade')}
                value={card.fundo.fade ?? 100}
                min={FADE_MIN}
                max={FADE_MAX}
                onValue={(v) => mexerNoFundo({ fade: v })}
                className="min-w-0 flex-1"
              />
              <Valor>{`${card.fundo.fade ?? 100}%`}</Valor>
            </Linha>
          ) : null}

          <div className="border-t border-[var(--color-line)]/60" />

          {/* ------------------------------------------------------ o recado */}
          <Linha rotulo={t('cards.message')} topo>
            <textarea
              data-tela-texto
              {...ajuda('cards.screenText')}
              aria-label={t('cards.message')}
              value={card.recado.texto}
              placeholder={t('cards.messagePlaceholder')}
              style={{ height: ALTURA_DO_CAMPO }}
              onChange={(event) => mexerNoRecado({ texto: event.target.value })}
              className="min-w-0 flex-1 resize-none rounded border border-[var(--color-edge)] bg-[var(--color-ink-0)] px-2 py-1.5 text-[12px] leading-snug outline-none placeholder:text-[var(--color-fog-3)]"
            />
            {/* Encostado no campo, e em coluna: assim o alinhamento fica onde
              se escreve o texto, e a janela não ganha uma fileira só para
              três botões que cabem na altura que já existe.
              As duas alturas são a MESMA conta (ver ALTURA_DO_CAMPO), porque
              base de botão desencontrada da base do campo é o tipo de coisa
              que ninguém consegue deixar de ver depois de ver uma vez. */}
            <div className="flex flex-none flex-col" style={{ gap: RESPIRO_ENTRE_FICHAS }}>
              {ALINHAMENTOS.map(({ id, icone, rotulo }) => (
                <Ficha
                  key={id}
                  data-tela-alinhamento={id}
                  {...ajuda('cards.screenAlign')}
                  title={t(rotulo)}
                  aria-label={t(rotulo)}
                  ativa={alinhamentoDoRecado(card.recado.alinhamento) === id}
                  onClick={() => mexerNoRecado({ alinhamento: id })}
                  style={{ height: ALTURA_DA_FICHA }}
                  className="grid w-[26px] place-items-center"
                >
                  <Icon name={icone} size={11} />
                </Ficha>
              ))}
            </div>
          </Linha>

          <Linha rotulo={t('cards.size')}>
            <SliderConsole
              data-tela-corpo
              {...ajuda('cards.size')}
              aria-label={t('cards.size')}
              value={card.recado.corpoPct}
              min={CORPO_MIN}
              max={CORPO_MAX}
              onValue={(v) => mexerNoRecado({ corpoPct: v })}
              className="min-w-0 flex-1"
            />
            <Valor>{`${card.recado.corpoPct}%`}</Valor>
            <Amostra
              valor={card.recado.cor}
              rotulo={t('cards.textColour')}
              marca="texto"
              onCor={(cor) => mexerNoRecado({ cor })}
            />
          </Linha>

          <Linha rotulo={t('cards.place')}>
            <div className="flex gap-[3px]">
              {POSICOES.map((posicao) => (
                <Ficha
                  key={posicao}
                  data-tela-posicao={posicao}
                  {...ajuda('cards.place')}
                  className={FICHA}
                  ativa={card.recado.posicao === posicao}
                  onClick={() => mexerNoRecado({ posicao })}
                >
                  {t(
                    posicao === 'topo'
                      ? 'cards.placeTop'
                      : posicao === 'meio'
                        ? 'cards.placeMiddle'
                        : 'cards.placeBottom'
                  )}
                </Ficha>
              ))}
            </div>
          </Linha>
        </div>
      </div>
    </Modal>
  )
}

/** Uma fileira do editor: rótulo de largura fixa e o controle ocupando o resto. */
function Linha({
  rotulo,
  topo = false,
  children
}: {
  rotulo: string
  /** alinha o rótulo no topo, para o campo de texto de duas linhas */
  topo?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={`flex gap-2 ${topo ? 'items-start' : 'items-center'}`}>
      <label className={`w-[76px] flex-none text-[11px] text-[var(--color-fog-2)] ${topo ? 'pt-1.5' : ''}`}>
        {rotulo}
      </label>
      {children}
    </div>
  )
}

/**
 * Um seletor de cor.
 *
 * É o `<input type="color">` do sistema de propósito: o seletor do Windows já
 * tem conta-gotas e histórico, e um seletor próprio dentro de um teleprompter
 * seria pior que o que o sistema entrega de graça.
 */
function Amostra({
  valor,
  rotulo,
  marca,
  onCor
}: {
  valor: string
  rotulo: string
  marca: string
  onCor: (cor: string) => void
}): React.JSX.Element {
  return (
    <input
      type="color"
      data-tela-cor={marca}
      {...ajuda('cards.colours')}
      aria-label={rotulo}
      title={rotulo}
      value={valor}
      onChange={(event) => onCor(event.target.value)}
      className="h-[26px] w-[32px] flex-none cursor-pointer rounded border border-[var(--color-line)] bg-transparent p-0"
    />
  )
}

function Valor({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="w-[42px] flex-none text-right font-mono text-[11px] tabular-nums text-[var(--color-accent)]">
      {children}
    </span>
  )
}
