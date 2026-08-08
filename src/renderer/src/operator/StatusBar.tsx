import type { HistoryInfo } from '@shared/actions'
import type { StorageHealth } from '@shared/api'
import type { AppState, LayoutMode, Tab } from '@shared/types'
import type { AjudaId } from '@shared/ajuda'
import { Icon, type IconName } from '../ui/Icon'
import { Poco, Tecla } from '../ui/console'
import { useT } from '../i18n'
import { ajuda } from '../ui/ajuda'

/** O recado de "salvou" / "abriu" / "deu erro" — nasce em App.tsx, mora aqui. */
export interface Notice {
  title: string
  lines: string[]
  tone: 'ok' | 'warn'
}

interface Props {
  state: AppState
  tab: Tab
  history: HistoryInfo
  storage: StorageHealth
  notice: Notice | null
  onModeChange: (mode: LayoutMode) => void
  onOpenPalette: () => void
  onDismissNotice: () => void
}

const MODOS: {
  mode: LayoutMode
  icon: IconName
  rotulo: 'mode.split' | 'mode.focus' | 'mode.deck'
  ajudaId: AjudaId
}[] = [
  { mode: 'split', icon: 'layoutSplit', rotulo: 'mode.split', ajudaId: 'status.modeSplit' },
  { mode: 'focus', icon: 'layoutFocus', rotulo: 'mode.focus', ajudaId: 'status.modeFocus' },
  { mode: 'deck', icon: 'layoutDeck', rotulo: 'mode.deck', ajudaId: 'status.modeDeck' }
]

/**
 * Split, Foco e Mesa são jeitos de olhar para o mesmo roteiro, não documentos
 * diferentes — e é por isso que só o escolhido fica em relevo. Trocar de modo
 * é escolher um ponto de vista; ver os três lado a lado, com um levantado,
 * diz isso sem precisar de rótulo.
 *
 * SEM poço em volta. A maquete desenha um, e ele funciona lá porque ali o
 * rodapé é a única peça daquela altura da janela. No app o transporte pode
 * morar na régua logo acima, e aí duas camas afundadas ficam empilhadas a
 * poucos pixels uma da outra: a de baixo lê como sobra da de cima em vez de
 * como um grupo próprio. As teclas soltas resolvem — quem agrupa os três é a
 * proximidade entre eles, que já basta.
 */
function ModeSwitch({ mode, onChange }: { mode: LayoutMode; onChange: (mode: LayoutMode) => void }): React.JSX.Element {
  const { t } = useT()
  return (
    <div data-mode-switch className="flex flex-none items-center gap-[2px]">
      {MODOS.map((item) => {
        const ativo = mode === item.mode
        return (
          <Tecla
            key={item.mode}
            data-mode={item.mode}
            {...ajuda(item.ajudaId)}
            onClick={() => onChange(item.mode)}
            /* só o escolhido é tecla: os outros ficam rentes ao fundo da
               barra, sem gradiente nem aresta. Três teclas em relevo com uma
               "acesa" diria a mesma coisa com muito mais tinta */
            className={`gap-[7px] rounded-md px-3 py-[5px] text-[11px] ${
              ativo
                ? 'font-semibold text-[var(--color-fog-0)]'
                : 'border-transparent bg-none text-[var(--color-fog-2)] shadow-none hover:text-[var(--color-fog-1)]'
            }`}
            style={ativo ? undefined : { background: 'none' }}
          >
            <span className="flex items-center gap-[7px]">
              <Icon name={item.icon} size={15} />
              {t(item.rotulo)}
            </span>
          </Tecla>
        )
      })}
    </div>
  )
}

/**
 * A luz de gravação.
 *
 * Antes isto era a palavra "salvo" em cinza, entre um contador de marcadores e
 * um de desfazer — o recado mais importante do rodapé com o mesmo peso visual
 * dos dois menos importantes. Virou um ponto aceso: verde enquanto o disco
 * aceita o trabalho, âmbar no instante em que para de aceitar.
 *
 * O sinal POSITIVO é o que justifica a peça. Sem ele, "está gravando" e
 * "quebrou" teriam a mesma aparência — nenhuma —, e o operador só descobriria
 * a diferença ao fechar o app.
 */
function LuzDeGravacao({ storage }: { storage: StorageHealth }): React.JSX.Element {
  const { t } = useT()
  const cor = storage.problem ? 'var(--color-warn)' : 'var(--color-go)'
  return (
    <Poco
      data-storage
      {...ajuda('status.storage')}
      title={storage.problem ?? t('status.savedHint')}
      className="flex-none"
    >
      <span className="flex items-center gap-[7px] px-[5px]">
        <span
          className="h-[7px] w-[7px] flex-none rounded-full"
          style={{
            background: `color-mix(in srgb, ${cor} 85%, #000)`,
            boxShadow: `inset 0 0 3px #000, 0 0 6px color-mix(in srgb, ${cor} 50%, transparent)`
          }}
        />
        <span className="k-microcaps" style={{ color: storage.problem ? cor : 'var(--color-fog-2)' }}>
          {storage.problem ? t('status.notSaved') : t('status.saved')}
        </span>
      </span>
    </Poco>
  )
}

/**
 * O recado de salvar/abrir, no lugar do balão flutuante que cobria o canto
 * da tela por cima do roteiro.
 *
 * Título e caminho na MESMA sentença, e ela pode quebrar em até DUAS linhas
 * (`line-clamp-2`) antes de cortar com reticências — 38px de barra sobram
 * para isso com fonte de 10px e entrelinha apertada. Uma mensagem curta cabe
 * numa linha só; um caminho de verdade ("D:\...\PROGRAMETES - 2608.valendo")
 * usa a segunda antes de precisar cortar. O `title` no `<p>` devolve o texto
 * inteiro ao passar o mouse, para quando nem duas linhas bastam.
 *
 * `min-w-0` no `<p>` é o que permite o corte funcionar dentro de um flex
 * item — sem ele, um item flex nunca encolhe abaixo do próprio conteúdo, e
 * o texto empurraria o Ctrl+K para fora da barra em vez de quebrar.
 */
function AvisoDoRodape({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }): React.JSX.Element {
  const { t } = useT()
  const cor = notice.tone === 'ok' ? 'var(--color-go)' : 'var(--color-warn)'
  const texto = notice.lines.length ? `${notice.title} — ${notice.lines.join(' · ')}` : notice.title
  return (
    <div data-notice={notice.tone} className="flex min-w-0 items-center gap-1.5">
      <p
        className="line-clamp-2 min-w-0 max-w-[280px] text-[10px] leading-[1.3] break-all"
        style={{ color: cor }}
        title={texto}
      >
        <span className="font-semibold">{notice.title}</span>
        {notice.lines.length ? ` — ${notice.lines.join(' · ')}` : null}
      </p>
      <button
        type="button"
        aria-label={t('app.dismiss')}
        onClick={onDismiss}
        className="flex-none text-[var(--color-fog-3)] hover:text-[var(--color-fog-0)]"
      >
        <Icon name="close" size={10} />
      </button>
    </div>
  )
}

/**
 * O rodapé: estado à esquerda, ponto de vista no centro, comandos à direita.
 *
 * Não tem controle nenhum — a última coisa que ele operava, a duração-alvo,
 * foi para o pé da régua de velocidade, junto do ritmo que ela altera. O que
 * sobrou aqui se lê, não se opera, e é por isso que a faixa pode ficar baixa
 * e calada enquanto o roteiro fica com a altura.
 *
 * Palavras e Duração também saíram: o cabeçalho da Edição já mostra os dois,
 * pela MESMA conta. Repetir o número em dois lugares não dá duas certezas —
 * ensina o olho a não confiar em nenhum dos dois.
 */
export function StatusBar({
  state,
  tab,
  history,
  storage,
  notice,
  onModeChange,
  onOpenPalette,
  onDismissNotice
}: Props): React.JSX.Element {
  const { t, tp } = useT()

  return (
    <footer className="relative flex h-[38px] flex-none items-center border-t border-[var(--color-edge)] bg-gradient-to-b from-[#1d1d20] to-[#151517] px-3">
      <div className="flex items-center gap-[10px]">
        <LuzDeGravacao storage={storage} />
        {/* marcadores e desfazer são placar, não aviso: uma linha só, no
            cinza mais apagado, porque ninguém age por causa deles */}
        <span className="text-[10px] font-medium text-[var(--color-fog-3)]">
          {`${tp('status.markers', tab.markers.length)} · ${tp('status.undo', history.depth)}`}
        </span>
      </div>

      {/* centralizado de verdade — `absolute` em vez de flex/auto-margin, para
          não depender de quanto os grupos dos dois lados pesam */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeSwitch mode={state.layoutMode} onChange={onModeChange} />
      </div>

      {/* o recado de salvar/abrir mora entre o seletor de modo e o Ctrl+K —
          onde antes era um balão flutuante em cima do roteiro. O `min-w-0`
          aqui é o que deixa o texto do recado encolher (e quebrar em duas
          linhas) em vez de empurrar o Ctrl+K para fora da barra. */}
      <div className="ml-auto flex min-w-0 items-center gap-3">
        {notice ? <AvisoDoRodape notice={notice} onDismiss={onDismissNotice} /> : null}
        <div className="flex flex-none items-center gap-[9px]">
          {/* era um texto solto dizendo que o atalho existe. Como tecla ele
              passa a ser também a porta: quem nunca decorou o Ctrl+K clica */}
          <Tecla
            data-palette
            {...ajuda('status.palette')}
            title={t('cmd.palette.open')}
            onClick={onOpenPalette}
            className="rounded px-[7px] py-[3px] font-mono text-[10px] font-semibold text-[var(--color-fog-2)]"
          >
            Ctrl+K
          </Tecla>
          <span className="text-[10px] font-medium text-[var(--color-fog-3)]">{t('status.commands')}</span>
        </div>
      </div>
    </footer>
  )
}
