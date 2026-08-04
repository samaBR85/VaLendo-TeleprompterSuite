import type { Action } from '@shared/actions'
import { ANGULO_PADRAO, CORPO_MAX, CORPO_MIN, type PosicaoDoRecado } from '@shared/tela'
import type { Cartao } from '@shared/types'
import { useT } from '../i18n'
import { TelaDoCartao } from '../prompter/PrompterCanvas'
import { Ficha, SliderConsole } from '../ui/console'
import { Modal } from '../ui/Modal'
import { ajuda } from '../ui/ajuda'

type CartaoDeTela = Extract<Cartao, { kind: 'tela' }>

const LARGURA = 450
/*
 * A prévia é 16:9 de verdade, e a altura sai da largura em vez de ser um
 * número solto.
 *
 * Ela era mais larga que alta do que a saída real, e isso não é detalhe de
 * enquadramento: o recado se posiciona em cima, no meio ou no pé, e num quadro
 * achatado o "pé" fica num lugar que não é o pé da tela do apresentador.
 *
 * O número precisa existir (e não ser só CSS) porque o corpo do recado é
 * proporcional à altura do quadro — sem saber a altura aqui, a prévia mostraria
 * um tamanho de texto e o ar mostraria outro.
 */
const ALTURA_DA_PREVIA = Math.round(((LARGURA - 24) * 9) / 16)

const POSICOES: PosicaoDoRecado[] = ['topo', 'meio', 'pe']

/* `.k-ficha` não traz respiro nenhum — quem usa é que diz quanto. Aqui a
   janela tem espaço, então o texto ganha uma folga maior que a dos painéis
   estreitos, onde cada pixel de largura está disputado. */
const FICHA = 'px-2.5 py-[5px] text-[11px]'

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

  const mexerNoFundo = (fundo: Partial<CartaoDeTela['fundo']>): void => {
    dispatch({ type: 'card/tela', cardId: card.id, fundo })
  }
  const mexerNoRecado = (recado: Partial<CartaoDeTela['recado']>): void => {
    dispatch({ type: 'card/tela', cardId: card.id, recado })
  }

  return (
    <Modal title={card.nome || t('cards.screen')} subtitle={t('cards.editScreen')} width={LARGURA} onClose={onClose}>
      <div className="flex flex-col gap-2.5 overflow-y-auto p-3">
        <div
          data-tela-previa
          style={{ height: ALTURA_DA_PREVIA }}
          className="relative w-full flex-none overflow-hidden rounded-lg border border-[var(--color-edge)]"
        >
          <TelaDoCartao card={card} altura={ALTURA_DA_PREVIA} />
        </div>

        {/* ------------------------------------------------------- o fundo */}
        <Linha rotulo={t('cards.background')}>
          <div className="flex gap-[3px]">
            <Ficha
              data-tela-fundo="chapado"
              {...ajuda('cards.background')}
              className={FICHA}
              ativa={!gradiente}
              /* tirar a segunda cor é o que devolve o chapado — e ela some do
                 objeto, não vira string vazia, senão o fundo continuaria
                 sendo um gradiente para lugar nenhum */
              onClick={() => mexerNoFundo({ ate: undefined })}
            >
              {t('cards.flat')}
            </Ficha>
            <Ficha
              data-tela-fundo="gradiente"
              {...ajuda('cards.background')}
              className={FICHA}
              ativa={gradiente}
              onClick={() =>
                mexerNoFundo({ ate: card.fundo.ate ?? '#8e3fd4', angulo: card.fundo.angulo ?? ANGULO_PADRAO })
              }
            >
              {t('cards.gradient')}
            </Ficha>
          </div>
        </Linha>

        <Linha rotulo={t('cards.colours')}>
          <Amostra
            valor={card.fundo.de}
            rotulo={t('cards.colourFrom')}
            marca="de"
            onCor={(cor) => mexerNoFundo({ de: cor })}
          />
          {gradiente ? (
            <>
              <Amostra
                valor={card.fundo.ate ?? '#8e3fd4'}
                rotulo={t('cards.colourTo')}
                marca="ate"
                onCor={(cor) => mexerNoFundo({ ate: cor })}
              />
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

        <div className="border-t border-[var(--color-line)]/60" />

        {/* ------------------------------------------------------ o recado */}
        <Linha rotulo={t('cards.message')} topo>
          <textarea
            data-tela-texto
            {...ajuda('cards.screenText')}
            aria-label={t('cards.message')}
            value={card.recado.texto}
            placeholder={t('cards.messagePlaceholder')}
            rows={2}
            onChange={(event) => mexerNoRecado({ texto: event.target.value })}
            className="min-w-0 flex-1 resize-none rounded border border-[var(--color-edge)] bg-[var(--color-ink-0)] px-2 py-1.5 text-[12px] leading-snug outline-none placeholder:text-[var(--color-fog-3)]"
          />
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
                {t(posicao === 'topo' ? 'cards.placeTop' : posicao === 'meio' ? 'cards.placeMiddle' : 'cards.placeBottom')}
              </Ficha>
            ))}
          </div>
        </Linha>
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
