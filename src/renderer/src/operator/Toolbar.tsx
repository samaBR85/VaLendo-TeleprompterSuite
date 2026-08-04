import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import type { ProjetoRecente } from '@shared/api'
import { composeLines, totalWords } from '@shared/anchor'
import { formatBinding, parseBinding } from '@shared/commands'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import { PPM_MAX, PPM_MIN } from '@shared/ruler'
import { CHAPTER_MARK } from '@shared/text'
import type { AppState, DisplayInfo, Tab, TransportPosition } from '@shared/types'
import { Icon } from '../ui/Icon'
import { Digito, Lcd, Poco, Tecla } from '../ui/console'
import { useT } from '../i18n'
import { useNow } from '../ui/useNow'
import { SpeedRuler } from './SpeedRuler'
import { ajuda } from '../ui/ajuda'
import { Tabs } from './Tabs'

interface Props {
  state: AppState
  tab: Tab
  displays: DisplayInfo[]
  keymap: Map<string, string>
  /** régua de rolagem medida, para os tempos baterem com o que rola na tela */
  rows: number[]
  dispatch: (action: Action) => void
  run: (commandId: string) => void
  onImport: () => void
  onNewProject: () => void
  /** abre um dos últimos projetos, pelo caminho, sem passar pelo seletor de arquivo */
  onOpenRecent: (caminho: string) => void
  /** a página da rede está mesmo no ar, e não só pedida */
  webviewLive: boolean
  onOpenWebview: () => void
}

/** " · Ctrl+K" para colar no fim de um rótulo, ou nada se o comando não tem tecla. */
export function hint(keymap: Map<string, string>, commandId: string): string {
  const binding = parseBinding(keymap.get(commandId) ?? '')
  if (!binding) return ''
  return ` · ${formatBinding(binding, window.valendo.platform === 'darwin')}`
}

/** Nome do arquivo, sem o caminho todo, para caber no rótulo do botão. */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/**
 * Os poços de arquivo: PROJETO e ROTEIRO, cada um com abrir/importar e salvar.
 *
 * Componente próprio porque mudam de andar com o layout: com o transporte no
 * topo (8a) moram na linha das abas; com ele na régua (8b) sobem para a linha
 * do wordmark, que fica com espaço sobrando — exatamente como a maquete
 * desenha as duas variantes.
 */
export function PocosDeArquivo({
  tab,
  keymap,
  run,
  onImport,
  onNewProject,
  onOpenRecent,
  compacto
}: {
  tab: Tab
  keymap: Map<string, string>
  run: (commandId: string) => void
  onImport: () => void
  onNewProject: () => void
  /** abre um dos últimos projetos, pelo caminho, sem passar pelo seletor de arquivo */
  onOpenRecent: (caminho: string) => void
  /**
   * Barra do topo apertada: os rótulos PROJETO/ROTEIRO sobem para CIMA do
   * poço em vez de ficarem ao lado. Empilhado, o rótulo não custa largura
   * nenhuma — e são esses ~100px que deixam a coluna esquerda da grade caber
   * no seu quinhão de 1080px sem cortar o relógio RESTANTE.
   */
  compacto?: boolean
}): React.JSX.Element {
  const { t } = useT()
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [recentesOpen, setRecentesOpen] = useState(false)
  const [recentes, setRecentes] = useState<ProjetoRecente[]>([])

  /** ao lado (padrão) ou em cima (compacto) — o mesmo poço, só muda onde o nome mora */
  const envolto = (rotulo: string, cor: string, pill: string, teclas: React.ReactNode): React.JSX.Element =>
    compacto ? (
      <div data-pill={pill} className="flex flex-none flex-col items-center gap-[2px]">
        <span className="k-microcaps flex-none" style={{ color: cor }}>
          {rotulo}
        </span>
        <Poco>{teclas}</Poco>
      </div>
    ) : (
      <Poco rotulo={rotulo} cor={cor} data-pill={pill}>
        {teclas}
      </Poco>
    )

  return (
    <>
      {envolto(
        t('toolbar.group.project'),
        'var(--color-link)',
        'documento',
        <>
        <div className="relative flex items-stretch">
          <Tecla
            {...ajuda('project.open')}
            title={`${t('toolbar.openProject')}${hint(keymap, 'project.open')}`}
            aria-label={t('toolbar.openProject')}
            className="h-6 w-7 rounded-r-none border-r-0"
            onClick={() => run('project.open')}
          >
            <Icon name="projectOpen" size={13} />
          </Tecla>
          {/* mesmo desenho do "Salvar como": a tecla faz a ação óbvia, a seta
              ao lado abre o caminho menos comum. Aqui o menos comum é reabrir
              um dos últimos, que poupa navegar até a pasta de novo */}
          <Tecla
            {...ajuda('project.recent')}
            title={t('toolbar.recentProjects')}
            aria-label={t('toolbar.recentProjects')}
            data-recentes-abre
            className="h-6 w-4 rounded-l-none px-0"
            onClick={() => {
              // lê na hora de abrir, e não uma vez ao montar: salvar um projeto
              // muda a lista, e um menu montado no início da sessão mostraria
              // um retrato velho
              void window.valendo.listRecentProjects().then(setRecentes)
              setRecentesOpen((open) => !open)
            }}
          >
            <Icon name="down" size={10} />
          </Tecla>
          {recentesOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRecentesOpen(false)} />
              <div
                data-recentes-menu
                className="absolute top-full left-0 z-50 mt-1 min-w-max rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] py-1 shadow-lg"
              >
                {recentes.length === 0 ? (
                  <div className="px-3 py-1.5 text-[11px] whitespace-nowrap text-[var(--color-fog-3)]">
                    {t('toolbar.noRecentProjects')}
                  </div>
                ) : (
                  recentes.map((projeto) => (
                    <button
                      key={projeto.caminho}
                      type="button"
                      data-recente
                      {...ajuda('project.recentItem')}
                      // o caminho inteiro no hover: dois projetos podem ter o
                      // mesmo nome em pastas diferentes, e o menu só mostra o nome
                      title={projeto.caminho}
                      className="block w-full px-3 py-1.5 text-left text-[11px] whitespace-nowrap text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
                      onClick={() => {
                        setRecentesOpen(false)
                        onOpenRecent(projeto.caminho)
                      }}
                    >
                      {projeto.nome}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>
        <div className="relative flex items-stretch">
          <Tecla
            {...ajuda('project.save')}
            className="h-6 rounded-r-none border-r-0 px-2 text-[11px]"
            onClick={() => run('project.save')}
          >
            {t('key.save')}
          </Tecla>
          <Tecla
            {...ajuda('project.saveAs')}
            title={`${t('toolbar.saveProjectAs')}${hint(keymap, 'project.saveAs')}`}
            aria-label={t('toolbar.saveProjectAs')}
            className="h-6 w-4 rounded-l-none px-0"
            onClick={() => setSaveMenuOpen((open) => !open)}
          >
            <Icon name="down" size={10} />
          </Tecla>
          {saveMenuOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSaveMenuOpen(false)} />
              <div className="absolute top-full left-0 z-50 mt-1 min-w-max rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] py-1 shadow-lg">
                <button
                  type="button"
                  {...ajuda('project.saveAsItem')}
                  className="block w-full px-3 py-1.5 text-left text-[11px] whitespace-nowrap text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
                  onClick={() => {
                    setSaveMenuOpen(false)
                    run('project.saveAs')
                  }}
                >
                  {t('toolbar.saveProjectAs')}
                  <span className="ml-3 text-[var(--color-fog-3)]">{hint(keymap, 'project.saveAs')}</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
        <Tecla
          {...ajuda('project.new')}
          title={`${t('toolbar.newProject')}${hint(keymap, 'project.new')}`}
          aria-label={t('toolbar.newProject')}
          className="h-6 w-7"
          onClick={onNewProject}
        >
          <Icon name="plus" size={13} />
        </Tecla>
        </>
      )}

      {/* o respiro comum da barra (gap-2.5) já separa dos dois lados — de
          PROJETO à esquerda e da primeira aba à direita — pela mesma
          distância, o que centraliza o grupo no vão entre os dois. Um
          `ml` a mais aqui empurrava só para um lado, e ROTEIRO ficava colado
          nas abas */}
      {envolto(
        t('toolbar.group.script'),
        'var(--color-warn)',
        'roteiro',
        <>
          {/* mesma pasta do PROJETO: abrir um roteiro também é abrir um
              arquivo, e as duas teclas precisam ler como a mesma ação */}
          <Tecla
            {...ajuda('script.import')}
            title={t('toolbar.import')}
            aria-label={t('toolbar.import')}
            className="h-6 w-7"
            onClick={onImport}
          >
            <Icon name="projectOpen" size={13} />
          </Tecla>
          <Tecla
            {...ajuda('script.save')}
            title={
              tab.exportPath
                ? `${t('toolbar.saveScriptTo', { file: fileName(tab.exportPath) })}${hint(keymap, 'document.save')}`
                : `${t('toolbar.saveScript')}${hint(keymap, 'document.save')}`
            }
            className="h-6 px-2 text-[11px]"
            onClick={() => run('document.save')}
          >
            {t('key.save')}
          </Tecla>
        </>
      )}
    </>
  )
}

/**
 * Os dois grupos de VER: onde o transporte mora (topo ou régua) e quais
 * painéis estão abertos (Assets, Cartões, Ajustes).
 *
 * Moravam no cabeçalho, ao lado do wordmark. Desceram para a linha das abas
 * porque decidir o que aparece na tela é vizinho de decidir qual roteiro está
 * na frente — e não do nome do programa. A posição vem ANTES dos painéis: ela
 * é o que reorganiza a mesa inteira; os painéis só acendem ou apagam uma
 * coluna. Cada tecla mantém a cor do que controla, acesa ou não, para o olho
 * achar a certa sem ler o ícone.
 */
export function GruposDeVisao({
  state,
  keymap,
  dispatch,
  run
}: Pick<Props, 'state' | 'keymap' | 'dispatch' | 'run'>): React.JSX.Element {
  const { t } = useT()

  return (
    <div data-paineis className="flex flex-none items-center gap-2">
      <Poco>
        {(['topo', 'regua'] as const).map((posicao) => (
          <Tecla
            key={posicao}
            data-transport-position={posicao}
            {...ajuda(posicao === 'topo' ? 'view.transportTop' : 'view.transportStrip')}
            title={`${t(posicao === 'topo' ? 'app.transportTop' : 'app.transportStrip')}${hint(keymap, 'view.transportPosition')}`}
            aria-pressed={state.transportPosition === posicao}
            acesa={state.transportPosition === posicao}
            cor="var(--color-go)"
            className="h-7 w-9"
            style={state.transportPosition !== posicao ? { color: 'var(--color-go)' } : undefined}
            onClick={() => dispatch({ type: 'layout/transportPosition', position: posicao })}
          >
            <Icon name={posicao === 'topo' ? 'transportTop' : 'transportBottom'} size={16} />
          </Tecla>
        ))}
      </Poco>

      <Poco>
        <Tecla
          data-toggle-sidebar
          {...ajuda('view.sidebar')}
          title={`${t('app.assets')}${hint(keymap, 'view.sidebar')}`}
          aria-pressed={state.sidebarVisible}
          acesa={state.sidebarVisible}
          cor="var(--color-warn)"
          className="h-7 w-9"
          style={!state.sidebarVisible ? { color: 'var(--color-warn)' } : undefined}
          onClick={() => run('view.sidebar')}
        >
          <Icon name="sidebarLeft" size={16} />
        </Tecla>
        <Tecla
          data-toggle-cards
          {...ajuda('view.cards')}
          title={`${t('cards.toolbar')}${hint(keymap, 'view.cards')}`}
          aria-pressed={state.cardsVisible}
          acesa={state.cardsVisible}
          cor="var(--color-accent-2)"
          className="h-7 w-9"
          style={!state.cardsVisible ? { color: 'var(--color-accent-2)' } : undefined}
          onClick={() => run('view.cards')}
        >
          <Icon name="card" size={16} />
        </Tecla>
        <Tecla
          data-toggle-settings
          {...ajuda('view.inspector')}
          title={`${t('app.settings')}${hint(keymap, 'view.inspector')}`}
          aria-pressed={state.inspectorVisible}
          acesa={state.inspectorVisible}
          cor="var(--color-accent)"
          className="h-7 w-9"
          style={!state.inspectorVisible ? { color: 'var(--color-accent)' } : undefined}
          onClick={() => run('view.inspector')}
        >
          <Icon name="sliders" size={16} />
        </Tecla>
      </Poco>
    </div>
  )
}

/**
 * O poço AR: o que age sobre a tela do apresentador com o programa correndo —
 * tela preta, congelar, rede local. Identificar monitores mora no poço SAÍDA,
 * junto do seletor que ele ajuda a preencher.
 *
 * A maquete não desenha este grupo (o roteiro dela não precisava), mas o app
 * precisa: ele ganha o mesmo material dos outros poços, e cada tecla mantém a
 * cor de glifo que já tinha — apagada em repouso, acesa no estado. Sem
 * rótulo: fica na ponta da barra, junto das abas, e não precisa se apresentar
 * — CARDS foi para os PAINÉIS, junto de Assets e Ajustes, por ser um painel
 * como os outros dois, e não uma ação sobre o ar.
 */
export function PocoDoAr({
  state,
  webviewLive,
  keymap,
  run,
  dispatch,
  onOpenWebview
}: {
  state: AppState
  webviewLive: boolean
  keymap: Map<string, string>
  run: (commandId: string) => void
  dispatch: (action: Action) => void
  onOpenWebview: () => void
}): React.JSX.Element {
  const { t } = useT()
  const { transport } = state
  // mora numa fileira fina, colado na base da prévia: as teclas acompanham a
  // altura dela, não a das barras do topo, de onde este grupo veio
  const lado = 'h-6 w-7'

  return (
    <Poco data-pill="ar" className="flex-none">
      <Tecla
        {...ajuda('ar.blackout')}
        title={`${t('toolbar.blackout')}${hint(keymap, 'output.blackout')}`}
        aria-label={t('toolbar.blackout')}
        /* no ar, vermelho cheio com o ícone branco: apagar a tela do
           apresentador é o estado mais grave que este poço mostra, e o
           tingimento discreto do `acesa` padrão não dizia isso de relance */
        acesa={transport.blackout}
        cor="var(--color-live)"
        className={`${lado} ${transport.blackout ? 'k-tecla-solida' : ''}`}
        style={!transport.blackout ? { color: 'var(--color-live)' } : undefined}
        onClick={() => run('output.blackout')}
      >
        <Icon name="blackout" size={13} />
      </Tecla>
      <Tecla
        {...ajuda('ar.freeze')}
        title={`${t('toolbar.freeze')}${hint(keymap, 'transport.freeze')}`}
        aria-label={t('toolbar.freeze')}
        /* azul cheio, a mesma cor que o ícone já tem apagado — ligado ele só
           enche, em vez de trocar para o verde de antes, que não tinha
           relação nenhuma com este botão */
        acesa={transport.frozen}
        cor="var(--color-link)"
        className={`${lado} ${transport.frozen ? 'k-tecla-solida' : ''}`}
        style={!transport.frozen ? { color: 'var(--color-link)' } : undefined}
        onClick={() => run('transport.freeze')}
      >
        <Icon name="freeze" size={13} />
      </Tecla>
      {/* Divisor: à esquerda dele o que age sobre a TELA do apresentador
          (apagar, congelar); à direita, o que age sobre a REDE. Duas famílias
          no mesmo poço, e sem a linha as quatro teclas se liam como uma fila
          só de interruptores sem parentesco. */}
      {/* `--color-line`, e não `--color-edge`: edge é preto, e preto sobre a
          cama escura do poço não aparece — o divisor sumia. */}
      <span className="mx-1 h-4 w-px flex-none self-center bg-[var(--color-line)]" />
      {/* aceso pelo que está acontecendo, não pelo que foi pedido: com a porta
          ocupada, o verde diria que há uma página no ar quando não há */}
      <Tecla
        {...ajuda('ar.webview')}
        title={webviewLive ? t('toolbar.webviewOn') : t('toolbar.webviewOff')}
        aria-label={t('toolbar.webviewOff')}
        acesa={webviewLive}
        cor="var(--color-go)"
        className={lado}
        style={!webviewLive ? { color: 'var(--color-go)' } : undefined}
        onClick={onOpenWebview}
      >
        <Icon name="webview" size={13} />
      </Tecla>
      {/* Colada na tecla da rede, e não solta ao lado: é a rota do áudio DESSA
          publicação, e as duas juntas se leem de relance — "no ar, com som" ou
          "no ar, mudo". Solta, seria mais um ícone num poço que já tem três.

          Com a rede desligada ela fica apagada e não responde: não há para
          onde mandar áudio, e um botão que troca de cor sem efeito nenhum
          ensina a coisa errada. */}
      <TeclaDeSomDaRede
        noAr={webviewLive}
        som={state.webview.som}
        className={lado}
        onAlternar={() => dispatch({ type: 'webview/som', som: !state.webview.som })}
      />
    </Poco>
  )
}

/**
 * A rota do áudio pela rede, como tecla.
 *
 * Mora aqui, e não dentro de um dos dois donos, porque aparece em DOIS lugares
 * com o mesmo desenho: colada à tecla da rede no poço AR, e à esquerda de
 * publicar na modal. Duas cópias divergiriam no primeiro ajuste de cor.
 */
export function TeclaDeSomDaRede({
  noAr,
  som,
  className,
  onAlternar
}: {
  noAr: boolean
  som: boolean
  className?: string
  onAlternar: () => void
}): React.JSX.Element {
  const { t } = useT()
  const rotulo = !noAr ? t('web.audioIdle') : som ? t('web.audioOn') : t('web.audioOff')
  return (
    <Tecla
      data-web-audio={!noAr ? 'apagado' : som ? 'passando' : 'cortado'}
      {...ajuda('ar.webviewSound')}
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={noAr ? som : undefined}
      disabled={!noAr}
      acesa={noAr}
      cor={som ? 'var(--color-accent-2)' : 'var(--color-live)'}
      className={`${className ?? ''} ${noAr ? 'k-tecla-solida' : ''}`}
      style={!noAr ? { color: 'var(--color-fog-3)' } : undefined}
      onClick={onAlternar}
    >
      <Icon name={som ? 'volume' : 'volumeOff'} size={13} />
    </Tecla>
  )
}

/**
 * O poço SAÍDA: monitor + Transmitir, no material do console.
 *
 * Mora num componente porque muda de casa com o layout: com o transporte no
 * topo (8a) ele fecha a barra do console; com o transporte na régua (8b) ele
 * mora na barra de abas, à direita do AR — a maquete desenha assim nos dois
 * casos, e o botão precisa existir UMA vez em cada arrumação, nunca duas.
 *
 * O Transmitir é o próprio indicador de estado: apagado é um relevo vinho com
 * o ponto fundido; no ar, acende de vermelho com brilho vazando. O "No ar"
 * gigante do cabeçalho saiu — dois avisos do mesmo fato ensinavam o olho a
 * ignorar um deles.
 *
 * `grande` é só o topo: ali a régua de velocidade encolheu pela metade
 * (`flex-[3_1_0%]` no LCD de progresso, sobrando espaço), e é esse espaço
 * que cresce aqui — monitor mais largo, para o nome do monitor caber
 * inteiro, e Transmitir maior, o botão que decide o programa inteiro.
 */
export function PocoDeSaida({
  displays,
  output,
  dispatch,
  run,
  grande,
  compacto
}: {
  displays: DisplayInfo[]
  output: AppState['output']
  dispatch: (action: Action) => void
  run: (commandId: string) => void
  grande?: boolean
  /**
   * Barra do topo apertada: o seletor encolhe para mostrar só "Monitor N ·
   * hor…" — é a diferença que fecha a conta de 1080px em uma linha. Fora
   * disso é idêntico ao não-grande da barra de abas.
   */
  compacto?: boolean
}): React.JSX.Element {
  const { t } = useT()
  const [identificarAberto, setIdentificarAberto] = useState(false)

  // fecha ao clicar em qualquer outro lugar — mesmo desenho do menu de salvar
  useEffect(() => {
    if (!identificarAberto) return
    const fechar = (): void => setIdentificarAberto(false)
    window.addEventListener('mousedown', fechar)
    return () => window.removeEventListener('mousedown', fechar)
  }, [identificarAberto])

  return (
    <Poco className="gap-[7px]" data-pill="saida">
      {/* mesma altura do seletor ao lado — ela é quem manda, para o par ficar
          alinhado tanto no topo (grande) quanto na régua. Desativado com a
          transmissão no ar: identificar pisca o número em cada monitor,
          inclusive no que está ao vivo — um descuido aqui vazaria para quem
          está assistindo.

          Vira dropdown porque o ícone sozinho não conta o que faz, e um
          `title` só aparece depois de segundos parado em cima. Abrindo, o
          nome por extenso fica à vista e ainda dá para desistir sem disparar
          nada — o que importa num botão que pisca número em todo monitor,
          inclusive no que o apresentador está lendo. */}
      <div className="relative flex items-stretch" onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          data-identify-monitor
          {...ajuda('output.identify')}
          disabled={output.enabled}
          aria-expanded={identificarAberto}
          aria-label={t('toolbar.identify')}
          onClick={() => setIdentificarAberto((aberto) => !aberto)}
          className={`grid flex-none place-items-center rounded-[5px] border border-[var(--color-edge)] bg-[#1e1e21] transition-[filter] hover:brightness-115 disabled:opacity-30 disabled:hover:brightness-100 ${
            grande ? 'h-8 w-8' : 'h-6 w-6'
          }`}
          style={!output.enabled ? { color: 'var(--color-accent-2)' } : undefined}
        >
          <Icon name="monitor" size={grande ? 15 : 12} />
        </button>
        {identificarAberto ? (
          <div className="absolute top-full left-0 z-50 mt-1 min-w-max rounded-md border border-[var(--color-line)] bg-[var(--color-ink-2)] py-1 shadow-lg">
            <button
              type="button"
              data-identify-monitor-run
              {...ajuda('output.identifyRun')}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] whitespace-nowrap text-[var(--color-fog-1)] hover:bg-[var(--color-ink-3)] hover:text-[var(--color-fog-0)]"
              onClick={() => {
                setIdentificarAberto(false)
                window.valendo.identifyDisplays()
              }}
            >
              <Icon name="monitor" size={12} />
              {t('toolbar.identifyAction')}
            </button>
          </div>
        ) : null}
      </div>

      <select
        value={output.displayId ?? ''}
        {...ajuda('output.monitor')}
        title={t('toolbar.pickMonitor')}
        onChange={(event) => {
          const value = event.target.value
          dispatch({
            type: 'output/set',
            displayId: value === '' ? null : Number(value),
            enabled: value !== '' && output.enabled
          })
        }}
        /*
         * Largura FECHADA, e não natural com um teto.
         *
         * Cabe "Monitor 3 · horizontal" e corta o resto — a resolução é o que
         * menos se lê de relance, e era ela que fazia a caixa esticar por meia
         * barra quando o monitor tinha nome comprido. Aberto, o dropdown
         * mostra cada linha inteira; parado, o nome e a orientação bastam para
         * saber para onde o programa vai.
         *
         * Fechada também é o que mantém honesta a medida que decide se a barra
         * do topo cabe numa linha: um seletor que muda de tamanho com o nome
         * do monitor faria a mesma janela caber ou não conforme o estúdio.
         */
        className={`flex-none truncate rounded-[5px] border border-[var(--color-edge)] bg-[#1e1e21] text-[var(--color-fog-2)] ${
          grande ? 'h-8 w-[196px] px-2.5 text-[12px]' : compacto ? 'h-6 w-[116px] px-2 text-[10px]' : 'h-6 w-[150px] px-2 text-[10px]'
        }`}
      >
        <option value="">{t('toolbar.pickMonitor')}</option>
        {displays.map((display) => (
          <option key={display.id} value={display.id}>
            {display.label}
            {display.primary ? ` · ${t('toolbar.primary')}` : ''}
          </option>
        ))}
      </select>

      <button
        type="button"
        data-broadcast-toggle
        {...ajuda('output.broadcast')}
        disabled={output.displayId === null}
        onClick={() => run('output.toggle')}
        className={`flex flex-none items-center gap-1.5 rounded-[5px] border border-[var(--color-edge)] font-semibold whitespace-nowrap transition-[filter] hover:brightness-115 disabled:opacity-30 ${
          grande ? 'h-11 min-w-[150px] justify-center px-6 text-[15px]' : 'h-6 px-3 text-[11px]'
        }`}
        style={
          output.enabled
            ? {
                background: 'linear-gradient(#5a2523, #3d1a19)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 0 14px rgba(255,77,77,.35)',
                color: '#ffb3ab'
              }
            : {
                background: 'linear-gradient(#2a2124, #201a1c)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
                color: '#d6a3a3'
              }
        }
      >
        <span
          className="h-[7px] w-[7px] flex-none rounded-full"
          style={
            output.enabled
              ? { background: 'var(--color-live)', boxShadow: '0 0 6px var(--color-live)' }
              : { background: '#4a2b2b', boxShadow: 'inset 0 0 3px #000' }
          }
        />
        {output.enabled ? t('toolbar.broadcasting') : t('toolbar.broadcast')}
      </button>
    </Poco>
  )
}

/**
 * A linha das abas: arquivo, ar e as fichas dos roteiros.
 *
 * PROJETO/ROTEIRO abrem a linha nas duas arrumações — antes eles subiam para
 * o cabeçalho quando o transporte ia para a régua, mas o cabeçalho é do
 * PROGRAMA (nome do projeto, painéis), não do arquivo. As abas esticam
 * (`flex-1`), então tudo que vem depois delas — AR e, na régua, SAÍDA — fica
 * empurrado para a ponta direita da barra, na ordem em que aparece aqui.
 */
export function BarraDeArquivo({
  state,
  tab,
  displays,
  keymap,
  dispatch,
  run,
  onImport,
  onNewProject,
  onOpenRecent
}: Omit<Props, 'rows' | 'webviewLive' | 'onOpenWebview'>): React.JSX.Element {
  return (
    <div className="flex flex-none items-center gap-2.5 border-b border-[var(--color-edge)] bg-[#17171a] px-2.5 py-[5px]">
      {/* com o transporte no topo, PROJETO e ROTEIRO moram na barra dele,
          junto do resto do que se opera; na régua, aquela barra desce para o
          rodapé e levar os arquivos junto os deixaria longe demais — então
          ficam aqui, como antes */}
      {state.transportPosition === 'regua' ? (
        <PocosDeArquivo
          tab={tab}
          keymap={keymap}
          run={run}
          onImport={onImport}
          onNewProject={onNewProject}
          onOpenRecent={onOpenRecent}
        />
      ) : null}

      <Tabs state={state} dispatch={dispatch} />

      <GruposDeVisao state={state} keymap={keymap} dispatch={dispatch} run={run} />

      {/* na régua, a SAÍDA sobe para cá — lá embaixo ela ficaria descolada do
          resto do que prepara o programa */}
      {state.transportPosition === 'regua' ? (
        <PocoDeSaida displays={displays} output={state.output} dispatch={dispatch} run={run} />
      ) : null}
    </div>
  )
}

/**
 * O progresso do roteiro, como um fio de fora a fora da janela.
 *
 * Era um mostrador de LCD com legenda ("CAPÍTULO · PREVISÃO · ALVO") no meio
 * da barra do topo, disputando largura com o teclado e a velocidade. Virou uma
 * linha sem rótulo nenhum, encostada embaixo da barra: usa a largura que já
 * sobrava de graça — a da própria janela — e não tira espaço de mais nada. O
 * que a legenda dizia continua legível no `title` (e o alvo, que era clicável
 * ali, já existe por extenso no rodapé).
 */
function LinhaDeProgresso({
  fracao,
  capitulos,
  marcadores,
  titulo
}: {
  fracao: number
  capitulos: number[]
  marcadores: number[]
  titulo: string
}): React.JSX.Element {
  return (
    <div
      data-progresso
      {...ajuda('transport.progress')}
      title={titulo}
      className="relative h-[5px] flex-none overflow-hidden bg-[var(--color-lcd-track)]"
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${Math.min(100, fracao * 100)}%`,
          background: 'linear-gradient(90deg, #2b7d52, var(--color-go))'
        }}
      />
      {/* Duas famílias de marca, e a cor é o que as separa: capítulo em âmbar
          (estrutura do roteiro, sempre lá) e marcador em vermelho (ponto que o
          operador cravou à mão). Os vermelhos vêm DEPOIS no DOM de propósito:
          quando um marcador cai exatamente na virada de capítulo, quem tem que
          aparecer é ele — foi o único dos dois que alguém escolheu marcar.

          4px, e não 2: num fio de 5px de altura atravessando a janela inteira,
          um traço de 2px some contra o verde do progresso — e achar a próxima
          marca de relance é justamente para o que ela existe. O `-2px` de
          margem recentra a marca no ponto exato, senão ela cresceria só para a
          direita e passaria a apontar depois do lugar certo. */}
      {capitulos.map((marca, index) => (
        <div
          key={`cap-${index}`}
          className="absolute top-0 bottom-0 -ml-[2px] w-[4px] rounded-[1px] bg-[var(--color-warn)]"
          style={{ left: `${Math.min(100, marca * 100)}%` }}
        />
      ))}
      {marcadores.map((marca, index) => (
        <div
          key={`marc-${index}`}
          className="absolute top-0 bottom-0 -ml-[2px] w-[4px] rounded-[1px] bg-[var(--color-live)]"
          style={{ left: `${Math.min(100, marca * 100)}%` }}
        />
      ))}
    </div>
  )
}

/*
 * O "ALVO" clicável saiu daqui junto com o mostrador de progresso: ele era a
 * segunda metade daquela legenda ("PREVISÃO" diz onde o ritmo leva, "ALVO" diz
 * o que foi pedido), e sem ela não tinha onde morar. A mesma conta continua
 * inteira no rodapé, no campo "Duração-alvo" — que sempre foi o original.
 */

/**
 * Decide se a barra do topo comporta todo mundo em tamanho PLENO.
 *
 * Quando não comporta, a resposta não é mais uma segunda linha: é a versão
 * compacta — os mesmos sete conjuntos, na mesma ordem, ~20% menores (o mesmo
 * material que a régua do rodapé já usa). A barra fica SEMPRE em uma linha;
 * o que muda com a largura é só a densidade. Na largura mínima da janela
 * (1080px) a versão compacta cabe com folga — conferido por medição, não por
 * fé; se um dia deixar de caber, o sintoma é corte à direita, não quebra.
 *
 * Somar a largura dos grupos não serve para decidir: a grade de três colunas
 * força as duas pontas a terem a MESMA largura (é isso que mantém o play no
 * centro geométrico), então quem manda é o lado mais largo, não a soma — a
 * conta dava "cabe" a 1700px numa barra que vazava 90px pela direita.
 *
 * Em vez de remontar essa regra à mão (e errar de novo quando o nome de um
 * monitor ou a tradução mudar de tamanho), quem responde é o próprio
 * navegador: montada em tamanho pleno, se `scrollWidth` passar de
 * `clientWidth` é porque não coube — e o `scrollWidth` daquele momento É a
 * largura mínima que o tamanho pleno exige. Guardamos esse número como limiar
 * e só voltamos ao pleno quando a janela o alcança. Auto-calibra e não
 * oscila (a versão compacta é estritamente mais estreita que o limiar): cada
 * troca acontece dentro do `useLayoutEffect`, antes de pintar, então o
 * operador nunca vê o estado intermediário.
 */
function useCabeEmUmaLinha(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const barraRef = useRef<HTMLDivElement | null>(null)
  /** menor largura em que uma linha coube; `null` enquanto não se sabe */
  const limiar = useRef<number | null>(null)
  const [cabe, setCabe] = useState(true)

  useLayoutEffect(() => {
    const barra = barraRef.current
    if (!barra) return

    const medir = (): void => {
      const disponivel = barra.clientWidth
      if (cabe) {
        // sub-pixel: 1px de tolerância para não trocar de arranjo por
        // arredondamento de escala de tela
        if (barra.scrollWidth > disponivel + 1) {
          limiar.current = barra.scrollWidth
          setCabe(false)
        }
        return
      }
      if (limiar.current !== null && disponivel >= limiar.current) setCabe(true)
    }

    const observador = new ResizeObserver(medir)
    observador.observe(barra)
    // os grupos também: a janela parada não impede a conta de mudar — o
    // relógio virar de "0:59" para "10:00", ou trocar de monitor, muda a
    // largura exigida sem a barra se mexer
    for (const grupo of barra.querySelectorAll<HTMLElement>('[data-grupo-barra]')) observador.observe(grupo)
    medir()
    return () => observador.disconnect()
  })

  return [barraRef, cabe]
}

/** O teclado de transporte: teclas físicas num poço fundo, o play maior e verde. */
function TecladoDeTransporte({
  playing,
  loop,
  compacto,
  keymap,
  run
}: {
  playing: boolean
  /** com o loop ligado, o Reiniciar acende — é ele quem a leitura chama sozinha ao voltar ao início */
  loop: boolean
  /** na régua do rodapé tudo sai 20% menor — ver `BarraDeTransporte` */
  compacto: boolean
  keymap: Map<string, string>
  run: (commandId: string) => void
}): React.JSX.Element {
  const { t } = useT()
  const lado = compacto ? 'h-[35px] w-[38px] rounded-md' : 'h-11 w-12 rounded-lg'
  const glifo = compacto ? 14 : 17

  return (
    <Poco
      fundo
      className={compacto ? 'gap-[6px] p-1' : 'gap-[7px] p-[5px]'}
      data-grupo="transporte"
    >
      <Tecla
        {...ajuda('transport.restart')}
        title={`${t('toolbar.restart')}${hint(keymap, 'transport.restart')}`}
        aria-label={t('toolbar.restart')}
        /* Âmbar, a mesma cor do botão de loop: os dois anunciam o MESMO fato —
           que a leitura vai voltar sozinha ao início. Em verde, o operador via
           duas cores para um estado só e tinha de descobrir que eram a mesma
           coisa.
           Tingido, e não cheio como o botão de loop: aqui é eco, não
           interruptor. Quem liga e desliga é o outro; este só mostra que o
           Reiniciar vai ser chamado sem ninguém apertá-lo. Apagado, volta ao
           verde do transporte — âmbar em repouso não significaria nada. */
        acesa={loop}
        cor="var(--color-warn)"
        className={lado}
        style={!loop ? { color: 'var(--color-go)' } : undefined}
        onClick={() => run('transport.restart')}
      >
        <Icon name="restart" size={glifo} />
      </Tecla>
      <Tecla
        {...ajuda('transport.back')}
        title={`${t('toolbar.back')}${hint(keymap, 'transport.jumpBack')}`}
        aria-label={t('toolbar.back')}
        className={lado}
        onClick={() => run('transport.jumpBack')}
      >
        <Icon name="up" size={glifo} />
      </Tecla>
      <Tecla
        play
        {...ajuda('transport.playPause')}
        title={`${playing ? t('toolbar.pause') : t('toolbar.play')}${hint(keymap, 'transport.playPause')}`}
        aria-label={playing ? t('toolbar.pause') : t('toolbar.play')}
        // 60px, contra os 44 das vizinhas: é a tecla que decide se o programa
        // anda, e a única que se procura sem olhar. A altura é o que a
        // distingue de longe — a largura já era maior e não bastava. Na régua
        // do rodapé a mesma proporção, 20% menor
        className={compacto ? 'h-[48px] w-[69px] rounded-md' : 'h-[60px] w-[86px] rounded-lg'}
        onClick={() => run('transport.playPause')}
      >
        {playing ? (
          <Icon name="pause" size={compacto ? 16 : 20} />
        ) : (
          // preenchido, e não contorno: um triângulo fino sobre o verde vivo
          // some de tão claro — o play é a única tecla que precisa de um
          // glifo sólido para ler de longe
          <Icon name="play" size={compacto ? 16 : 20} filled style={{ color: '#000' }} />
        )}
      </Tecla>
      <Tecla
        {...ajuda('transport.forward')}
        title={`${t('toolbar.forward')}${hint(keymap, 'transport.jumpForward')}`}
        aria-label={t('toolbar.forward')}
        className={lado}
        onClick={() => run('transport.jumpForward')}
      >
        <Icon name="down" size={glifo} />
      </Tecla>
      <Tecla
        {...ajuda('transport.marker')}
        title={`${t('toolbar.marker')}${hint(keymap, 'marker.create')}`}
        aria-label={t('toolbar.marker')}
        cor="var(--color-live)"
        className={lado}
        style={{ color: 'var(--color-live)' }}
        onClick={() => run('marker.create')}
      >
        <Icon name="marker" size={glifo} />
      </Tecla>
    </Poco>
  )
}

/**
 * O console de transporte: o que se toca a cada segundo com o programa correndo.
 *
 * Vive sozinho porque muda de lugar — no topo, logo abaixo das barras de
 * preparação (8a); ou como régua no rodapé, entre o roteiro e os cartões
 * (8b). As peças são as mesmas — mostrador de progresso, relógios, teclado,
 * velocidade —, só a moldura e a ordem mudam; a SAÍDA fecha a barra apenas no
 * topo, porque na régua ela sobe para a barra de arquivo.
 */
export function BarraDeTransporte({
  state,
  tab,
  displays,
  keymap,
  rows,
  dispatch,
  run,
  position,
  onImport,
  onNewProject,
  onOpenRecent
}: Pick<
  Props,
  | 'state'
  | 'tab'
  | 'displays'
  | 'keymap'
  | 'rows'
  | 'dispatch'
  | 'run'
  | 'onImport'
  | 'onNewProject'
  | 'onOpenRecent'
> & {
  position: TransportPosition
}): React.JSX.Element {
  const { t } = useT()
  const { transport } = state
  const now = useNow()
  const [barraRef, cabeEmUmaLinha] = useCabeEmUmaLinha()

  const lines = useMemo(
    () => composeLines(tab.blocks, tab.appearance, rows),
    [tab.blocks, tab.appearance.minWords, tab.appearance.maxWords, tab.appearance.uniformSpeed, rows]
  )
  const segments = useMemo(() => buildRundown(tab.blocks, lines, tab.markers), [tab.blocks, lines, tab.markers])

  const ruler = totalWords(lines)
  const lidas = Math.min(ruler, Math.max(0, wordIndexAt(transport, now)))
  const total = secondsForWords(ruler, transport.ppm)
  const elapsed = secondsForWords(lidas, transport.ppm)
  const fracao = ruler > 0 ? lidas / ruler : 0
  const capitulo = segments[segmentIndexAt(segments, lidas)]?.title ?? ''
  // o primeiro trecho pode não ter título — é o pedaço antes do primeiro
  // capítulo, e não há virada nenhuma para marcar ali
  const marcasDeCapitulo = ruler > 0 ? segments.filter((s) => s.title).map((s) => s.rulerStart / ruler) : []
  const marcasDeMarcador = ruler > 0 ? segments.flatMap((s) => s.markers).map((m) => m.rulerStart / ruler) : []

  // compacto: sempre na régua do rodapé; no topo, quando o tamanho pleno não
  // couber na janela — é o que mantém a barra em UMA linha em qualquer largura
  const compacto = position === 'regua' || !cabeEmUmaLinha
  const corpo = compacto ? 19 : 27

  // o que a legenda do antigo mostrador dizia, agora no hover da linha:
  // capítulo corrente e quanto o roteiro inteiro leva no ritmo de agora
  const legenda = [capitulo ? `${CHAPTER_MARK} ${capitulo}` : '', `${t('lcd.forecast')} ${formatClock(total)}`]
    .filter(Boolean)
    .join(' · ')

  const decorrido = (
    <span {...ajuda('transport.elapsed')}>
      <Digito valor={formatClock(elapsed)} rotulo={t('toolbar.elapsed')} cor="var(--color-go)" tamanho={corpo} />
    </span>
  )
  const restante = (
    <span {...ajuda('transport.remaining')}>
    <Digito
      valor={`−${formatClock(Math.max(0, total - elapsed))}`}
      rotulo={t('toolbar.remaining')}
      cor="var(--color-live-soft)"
      tamanho={corpo}
    />
    </span>
  )

  // soltos no fundo da barra, sem o vidro do LCD em volta: com o mostrador de
  // progresso fora daqui (virou a linha de fora a fora), uma caixa só para
  // dois números seria moldura sem conteúdo. A legenda embaixo de cada um
  // continua sendo quem diz qual é qual.
  /*
   * O RESTANTE fica à mesma distância do DECORRIDO e do teclado.
   *
   * O par é alinhado à direita da própria coluna, então o RESTANTE encostava
   * no poço do transporte: sobravam 22px de um lado e só os 8px da grade do
   * outro, e ele lia como se pertencesse ao teclado em vez de ao relógio.
   *
   * Em vez de empurrar o par inteiro (o que levaria o DECORRIDO junto), o vão
   * interno encolhe e a mesma diferença vira margem à direita — as duas
   * medidas somadas não mudam, então o DECORRIDO fica onde estava e só o
   * RESTANTE anda para a esquerda, parando no meio exato entre os dois.
   *
   * Os números saem daí: metade da soma do vão de antes com o da grade —
   * (22+8)/2 na régua, (28+10)/2 no topo —, e a margem é o que sobra para a
   * grade completar o mesmo valor.
   */
  const relogios = (
    <div
      data-relogios
      className={`flex flex-none items-center ${compacto ? 'mr-[7px] gap-[15px]' : 'mr-[9px] gap-[19px]'}`}
    >
      {decorrido}
      {restante}
    </div>
  )

  const velocidade = (
    // largura fixa, e não `flex-1`: com a saída na mesma ponta, esticar a
    // régua empurraria o Transmitir para fora da janela em vez de usar a
    // sobra. Quem equilibra as duas pontas — e com isso centraliza o play —
    // é a grade, não o conteúdo.
    <Lcd className={`${compacto ? 'h-[38px]' : 'h-[52px]'} min-w-0 flex-none`}>
      {/* metade da largura de antes (186px). A palavra "VELOCIDADE" saiu da
          legenda junto: no espaço que sobrou ela truncaria, e ela já era a
          menos necessária das três coisas ali — o mostrador ao lado diz PPM
          por extenso. As pontas da faixa ficam, que são o que dá escala ao
          que a régua mostra; o nome inteiro continua no hover */}
      <div
        {...ajuda('transport.speed')}
        title={t('lcd.speed')}
        className={`flex flex-col justify-center border-r border-[var(--color-lcd-line)] ${
          compacto ? 'w-[74px] gap-1 px-2' : 'w-[93px] gap-1.5 px-2.5'
        }`}
      >
        <SpeedRuler ppm={transport.ppm} onChange={(ppm) => dispatch({ type: 'transport/ppm', ppm })} />
        <div className="k-microcaps flex justify-between tracking-[0.1em] text-[var(--color-lcd-caption)]">
          <span>{PPM_MIN}</span>
          <span>{PPM_MAX}</span>
        </div>
      </div>
      <Digito
        valor={String(transport.ppm)}
        rotulo={t('toolbar.ppm')}
        tamanho={corpo}
        className={compacto ? 'px-4' : 'px-5'}
      />
    </Lcd>
  )

  const teclado = (
    <TecladoDeTransporte
      playing={transport.playing}
      loop={transport.loop}
      compacto={compacto}
      keymap={keymap}
      run={run}
    />
  )
  const linha = (
    <LinhaDeProgresso
      fracao={fracao}
      capitulos={marcasDeCapitulo}
      marcadores={marcasDeMarcador}
      titulo={legenda}
    />
  )

  if (position === 'topo') {
    // os cinco grupos da barra, cada um marcado para a medição. São os MESMOS
    // elementos nos dois arranjos, no mesmo tamanho — o que muda é só onde
    // cada um assenta
    const grupoArquivo = (
      <div data-grupo-barra className={`flex flex-none items-center ${compacto ? 'gap-1.5' : 'gap-2.5'}`}>
        <PocosDeArquivo
          tab={tab}
          keymap={keymap}
          run={run}
          onImport={onImport}
          onNewProject={onNewProject}
          onOpenRecent={onOpenRecent}
          compacto={compacto}
        />
      </div>
    )
    const grupoRelogios = (
      <div data-grupo-barra className="flex flex-none">
        {relogios}
      </div>
    )
    const grupoTeclado = (
      <div data-grupo-barra className="flex flex-none">
        {teclado}
      </div>
    )
    const grupoVelocidade = (
      <div data-grupo-barra className="flex flex-none">
        {velocidade}
      </div>
    )
    const grupoSaida = (
      <div data-grupo-barra className="flex flex-none">
        {/* compacta, a saída usa a MESMA versão pequena que já mora na barra
            de abas quando o transporte está na régua — nada de um terceiro
            tamanho para manter */}
        <PocoDeSaida
          displays={displays}
          output={state.output}
          dispatch={dispatch}
          run={run}
          grande={!compacto}
          compacto={compacto}
        />
      </div>
    )

    // a grade de 3 colunas: duas `1fr` IGUAIS nas pontas garantem o play no
    // centro geométrico em QUALQUER largura. Uma razão de flex ajustada à mão
    // funcionava só na largura em que foi medida — a janela maximizada tinha
    // sobra demais, e o play saía do centro.
    const grade = 'minmax(0,1fr) auto minmax(0,1fr)'
    const fundo = 'linear-gradient(#1b1b1f, #161618)'

    return (
      <>
        {/* SEMPRE uma linha. O que é do MOMENTO (relógios, velocidade) encosta
            no teclado, no meio; o que é de PREPARAÇÃO (arquivos) ou de DESTINO
            (saída) vai para a borda. Quando o tamanho pleno não cabe, os sete
            conjuntos encolhem juntos (`compacto`) em vez de dobrar de linha —
            a ordem não muda, então o olho acha tudo onde sempre esteve. */}
        <div
          ref={barraRef}
          data-transporte="topo"
          data-densidade={compacto ? 'compacta' : 'plena'}
          className={`grid flex-none items-center border-b border-[var(--color-edge)] py-2 ${
            compacto ? 'gap-1.5 px-2' : 'gap-2.5 px-3'
          }`}
          style={{ gridTemplateColumns: grade, background: fundo }}
        >
          <div className={`flex min-w-0 items-center ${compacto ? 'gap-1.5' : 'gap-2.5'}`}>
            {grupoArquivo}
            <div className="min-w-0 flex-1" />
            {grupoRelogios}
          </div>
          {grupoTeclado}
          <div className={`flex min-w-0 items-center ${compacto ? 'gap-1.5' : 'gap-2.5'}`}>
            {grupoVelocidade}
            <div className="min-w-0 flex-1" />
            {grupoSaida}
          </div>
        </div>
        {linha}
      </>
    )
  }

  return (
    // mesma grade de 3 colunas do topo, pelo mesmo motivo: as pontas `1fr`
    // iguais são o que mantém o teclado no centro geométrico da régua. Aqui
    // os arquivos e a saída não descem junto — eles são preparação, e ficam
    // na barra de cima, perto das abas.
    <>
      {/* a linha vem ANTES da régua, e não depois: assim ela encosta na base
          da Edição e da Transmissão, que é o conteúdo que ela mede. Embaixo
          da régua, ficava separada do roteiro pela própria régua e virava um
          fio solto na borda da janela.

          No topo a ordem continua invertida (barra, depois linha) pelo mesmo
          motivo — lá o que está logo abaixo da barra são os painéis, então é
          depois dela que a linha os toca. Nos dois arranjos a linha faz
          fronteira com o conteúdo, nunca com a moldura. */}
      {linha}
      <div
        data-transporte="regua"
        // 67px: os mesmos 84 de antes, 20% menores junto com tudo que mora
        // dentro. O poço do teclado passa a medir 56 (play de 48 + os 4 de
        // folga de cada lado), então sobram ~5px acima e abaixo dele
        className="relative z-[2] grid h-[67px] flex-none items-center gap-2 border-t border-[var(--color-edge)] px-2"
        style={{
          gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
          background: 'linear-gradient(#2c2c31, #1e1e22)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(0,0,0,.45)'
        }}
      >
        <div className="flex min-w-0 items-center justify-end">{relogios}</div>
        {teclado}
        <div className="flex min-w-0 items-center">{velocidade}</div>
      </div>
    </>
  )
}
