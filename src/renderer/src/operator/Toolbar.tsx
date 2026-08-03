import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Action } from '@shared/actions'
import { composeLines, totalWords } from '@shared/anchor'
import { formatBinding, parseBinding } from '@shared/commands'
import { formatClock, secondsForWords, wordIndexAt } from '@shared/pacing'
import { buildRundown, segmentIndexAt } from '@shared/rundown'
import { PPM_MAX, PPM_MIN } from '@shared/ruler'
import type { AppState, DisplayInfo, Tab, TransportPosition } from '@shared/types'
import { Icon } from '../ui/Icon'
import { Digito, Lcd, Poco, Tecla } from '../ui/console'
import { useT } from '../i18n'
import { useNow } from '../ui/useNow'
import { SpeedRuler } from './SpeedRuler'
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
  onNewProject
}: {
  tab: Tab
  keymap: Map<string, string>
  run: (commandId: string) => void
  onImport: () => void
  onNewProject: () => void
}): React.JSX.Element {
  const { t } = useT()
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)

  return (
    <>
      <Poco rotulo={t('toolbar.group.project')} cor="var(--color-link)" data-pill="documento">
        <Tecla
          title={`${t('toolbar.openProject')}${hint(keymap, 'project.open')}`}
          aria-label={t('toolbar.openProject')}
          className="h-6 w-7"
          onClick={() => run('project.open')}
        >
          <Icon name="projectOpen" size={13} />
        </Tecla>
        <div className="relative flex items-stretch">
          <Tecla
            title={`${t('toolbar.saveProject')}${hint(keymap, 'project.save')}`}
            className="h-6 rounded-r-none border-r-0 px-2 text-[11px]"
            onClick={() => run('project.save')}
          >
            {t('key.save')}
          </Tecla>
          <Tecla
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
          title={`${t('toolbar.newProject')}${hint(keymap, 'project.new')}`}
          aria-label={t('toolbar.newProject')}
          className="h-6 w-7"
          onClick={onNewProject}
        >
          <Icon name="plus" size={13} />
        </Tecla>
      </Poco>

      {/* o respiro comum da barra (gap-2.5) já separa dos dois lados — de
          PROJETO à esquerda e da primeira aba à direita — pela mesma
          distância, o que centraliza o grupo no vão entre os dois. Um
          `ml` a mais aqui empurrava só para um lado, e ROTEIRO ficava colado
          nas abas */}
      <Poco rotulo={t('toolbar.group.script')} cor="var(--color-warn)" data-pill="roteiro">
        {/* mesma pasta do PROJETO: abrir um roteiro também é abrir um
            arquivo, e as duas teclas precisam ler como a mesma ação */}
        <Tecla title={t('toolbar.import')} aria-label={t('toolbar.import')} className="h-6 w-7" onClick={onImport}>
          <Icon name="projectOpen" size={13} />
        </Tecla>
        <Tecla
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
      </Poco>
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
            title={`${t(posicao === 'topo' ? 'app.transportTop' : 'app.transportStrip')}${hint(keymap, 'view.transportPosition')}`}
            aria-pressed={state.transportPosition === posicao}
            acesa={state.transportPosition === posicao}
            cor="var(--color-go)"
            className="h-7 w-9"
            style={state.transportPosition !== posicao ? { color: 'var(--color-go)' } : undefined}
            onClick={() => dispatch({ type: 'layout/transportPosition', position: posicao })}
          >
            <Icon name={posicao === 'topo' ? 'layoutSplit' : 'layoutDeck'} size={16} />
          </Tecla>
        ))}
      </Poco>

      <Poco>
        <Tecla
          data-toggle-sidebar
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
  onOpenWebview
}: {
  state: AppState
  webviewLive: boolean
  keymap: Map<string, string>
  run: (commandId: string) => void
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
        title={`${t('toolbar.blackout')}${hint(keymap, 'output.blackout')}`}
        aria-label={t('toolbar.blackout')}
        acesa={transport.blackout}
        cor="var(--color-live)"
        className={lado}
        style={!transport.blackout ? { color: 'var(--color-live)' } : undefined}
        onClick={() => run('output.blackout')}
      >
        <Icon name="blackout" size={13} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.freeze')}${hint(keymap, 'transport.freeze')}`}
        aria-label={t('toolbar.freeze')}
        acesa={transport.frozen}
        cor="var(--color-go)"
        className={lado}
        style={!transport.frozen ? { color: 'var(--color-link)' } : undefined}
        onClick={() => run('transport.freeze')}
      >
        <Icon name="freeze" size={13} />
      </Tecla>
      {/* aceso pelo que está acontecendo, não pelo que foi pedido: com a porta
          ocupada, o verde diria que há uma página no ar quando não há */}
      <Tecla
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
    </Poco>
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
  grande
}: {
  displays: DisplayInfo[]
  output: AppState['output']
  dispatch: (action: Action) => void
  run: (commandId: string) => void
  grande?: boolean
}): React.JSX.Element {
  const { t } = useT()

  return (
    <Poco className="gap-[7px]" data-pill="saida">
      {/* mesma altura do seletor ao lado — ela é quem manda, para o par ficar
          alinhado tanto no topo (grande) quanto na régua. Desativado com a
          transmissão no ar: identificar pisca o número em cada monitor,
          inclusive no que está ao vivo — um descuido aqui vazaria para quem
          está assistindo */}
      <button
        type="button"
        data-identify-monitor
        disabled={output.enabled}
        title={t('toolbar.identify')}
        aria-label={t('toolbar.identify')}
        onClick={() => window.valendo.identifyDisplays()}
        className={`grid flex-none place-items-center rounded-[5px] border border-[var(--color-edge)] bg-[#1e1e21] transition-[filter] hover:brightness-115 disabled:opacity-30 disabled:hover:brightness-100 ${
          grande ? 'h-8 w-8' : 'h-6 w-6'
        }`}
        style={!output.enabled ? { color: 'var(--color-accent-2)' } : undefined}
      >
        <Icon name="monitor" size={grande ? 15 : 12} />
      </button>

      <select
        value={output.displayId ?? ''}
        onChange={(event) => {
          const value = event.target.value
          dispatch({
            type: 'output/set',
            displayId: value === '' ? null : Number(value),
            enabled: value !== '' && output.enabled
          })
        }}
        // largura determinística (natural, com um teto): quem decide se a
        // barra cabe numa linha só é uma MEDIDA da soma dos grupos, e um
        // seletor que encolhe sozinho faria essa soma mentir — a barra
        // acharia que coube quando na verdade só truncou o nome do monitor
        className={`flex-none rounded-[5px] border border-[var(--color-edge)] bg-[#1e1e21] text-[var(--color-fog-2)] ${
          grande ? 'h-8 max-w-[320px] px-2.5 text-[12px]' : 'h-6 max-w-[190px] px-2 text-[10px]'
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
  onNewProject
}: Omit<Props, 'rows' | 'webviewLive' | 'onOpenWebview'>): React.JSX.Element {
  return (
    <div className="flex flex-none items-center gap-2.5 border-b border-[var(--color-edge)] bg-[#17171a] px-2.5 py-[5px]">
      {/* com o transporte no topo, PROJETO e ROTEIRO moram na barra dele,
          junto do resto do que se opera; na régua, aquela barra desce para o
          rodapé e levar os arquivos junto os deixaria longe demais — então
          ficam aqui, como antes */}
      {state.transportPosition === 'regua' ? (
        <PocosDeArquivo tab={tab} keymap={keymap} run={run} onImport={onImport} onNewProject={onNewProject} />
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
 * Era um mostrador de LCD com legenda ("§ CAPÍTULO · PREVISÃO · ALVO") no meio
 * da barra do topo, disputando largura com o teclado e a velocidade. Virou uma
 * linha sem rótulo nenhum, encostada embaixo da barra: usa a largura que já
 * sobrava de graça — a da própria janela — e não tira espaço de mais nada. O
 * que a legenda dizia continua legível no `title` (e o alvo, que era clicável
 * ali, já existe por extenso no rodapé).
 */
function LinhaDeProgresso({
  fracao,
  ticks,
  titulo
}: {
  fracao: number
  ticks: number[]
  titulo: string
}): React.JSX.Element {
  return (
    <div
      data-progresso
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
      {ticks.map((tick, index) => (
        <div
          key={index}
          className="absolute top-0 bottom-0 w-[2px] bg-[var(--color-warn)]"
          style={{ left: `${Math.min(100, tick * 100)}%` }}
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
 * Decide se a barra cabe numa linha só — e, quando não cabe, parte em duas.
 *
 * Nada encolhe em nenhum dos dois arranjos: o operador pediu que, numa janela
 * larga, tudo fique no tamanho de sempre. Então a única saída para a janela
 * estreita é a barra ganhar uma segunda linha.
 *
 * Somar a largura dos grupos não serve para decidir: a grade de três colunas
 * força as duas pontas a terem a MESMA largura (é isso que mantém o play no
 * centro geométrico), então quem manda é o lado mais largo, não a soma — a
 * conta dava "cabe" a 1700px numa barra que vazava 90px pela direita.
 *
 * Em vez de remontar essa regra à mão (e errar de novo quando o nome de um
 * monitor ou a tradução mudar de tamanho), quem responde é o próprio
 * navegador: montada em uma linha, se `scrollWidth` passar de `clientWidth`
 * é porque não coube — e o `scrollWidth` daquele momento É a largura mínima
 * que uma linha exige. Guardamos esse número como limiar e só voltamos a uma
 * linha quando a janela o alcança. Auto-calibra e não oscila: cada troca
 * acontece dentro do `useLayoutEffect`, antes de pintar, então o operador
 * nunca vê o estado intermediário.
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
  keymap,
  run
}: {
  playing: boolean
  /** com o loop ligado, o Reiniciar acende — é ele quem a leitura chama sozinha ao voltar ao início */
  loop: boolean
  keymap: Map<string, string>
  run: (commandId: string) => void
}): React.JSX.Element {
  const { t } = useT()
  const lado = 'h-11 w-12 rounded-lg'

  return (
    <Poco fundo className="gap-[7px] p-[5px]" data-grupo="transporte">
      <Tecla
        title={`${t('toolbar.restart')}${hint(keymap, 'transport.restart')}`}
        aria-label={t('toolbar.restart')}
        acesa={loop}
        cor="var(--color-go)"
        className={lado}
        style={!loop ? { color: 'var(--color-go)' } : undefined}
        onClick={() => run('transport.restart')}
      >
        <Icon name="restart" size={17} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.back')}${hint(keymap, 'transport.jumpBack')}`}
        aria-label={t('toolbar.back')}
        className={lado}
        onClick={() => run('transport.jumpBack')}
      >
        <Icon name="up" size={17} />
      </Tecla>
      <Tecla
        play
        title={`${playing ? t('toolbar.pause') : t('toolbar.play')}${hint(keymap, 'transport.playPause')}`}
        aria-label={playing ? t('toolbar.pause') : t('toolbar.play')}
        // 60px, contra os 44 das vizinhas: é a tecla que decide se o programa
        // anda, e a única que se procura sem olhar. A altura é o que a
        // distingue de longe — a largura já era maior e não bastava
        className="h-[60px] w-[86px] rounded-lg"
        onClick={() => run('transport.playPause')}
      >
        {playing ? (
          <Icon name="pause" size={20} />
        ) : (
          // preenchido, e não contorno: um triângulo fino sobre o verde vivo
          // some de tão claro — o play é a única tecla que precisa de um
          // glifo sólido para ler de longe
          <Icon name="play" size={20} filled style={{ color: '#000' }} />
        )}
      </Tecla>
      <Tecla
        title={`${t('toolbar.forward')}${hint(keymap, 'transport.jumpForward')}`}
        aria-label={t('toolbar.forward')}
        className={lado}
        onClick={() => run('transport.jumpForward')}
      >
        <Icon name="down" size={17} />
      </Tecla>
      <Tecla
        title={`${t('toolbar.marker')}${hint(keymap, 'marker.create')}`}
        aria-label={t('toolbar.marker')}
        cor="var(--color-live)"
        className={lado}
        style={{ color: 'var(--color-live)' }}
        onClick={() => run('marker.create')}
      >
        <Icon name="marker" size={17} />
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
  onNewProject
}: Pick<
  Props,
  'state' | 'tab' | 'displays' | 'keymap' | 'rows' | 'dispatch' | 'run' | 'onImport' | 'onNewProject'
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
  const ticks = ruler > 0 ? segments.flatMap((s) => s.markers).map((m) => m.rulerStart / ruler) : []

  const compacto = position === 'regua'
  const corpo = compacto ? 24 : 27

  // o que a legenda do antigo mostrador dizia, agora no hover da linha:
  // capítulo corrente e quanto o roteiro inteiro leva no ritmo de agora
  const legenda = [capitulo ? `§ ${capitulo}` : '', `${t('lcd.forecast')} ${formatClock(total)}`]
    .filter(Boolean)
    .join(' · ')

  const decorrido = (
    <Digito valor={formatClock(elapsed)} rotulo={t('toolbar.elapsed')} cor="var(--color-go)" tamanho={corpo} />
  )
  const restante = (
    <Digito
      valor={`−${formatClock(Math.max(0, total - elapsed))}`}
      rotulo={t('toolbar.remaining')}
      cor="var(--color-live-soft)"
      tamanho={corpo}
    />
  )

  // soltos no fundo da barra, sem o vidro do LCD em volta: com o mostrador de
  // progresso fora daqui (virou a linha de fora a fora), uma caixa só para
  // dois números seria moldura sem conteúdo. A legenda embaixo de cada um
  // continua sendo quem diz qual é qual.
  const relogios = (
    <div className="flex flex-none items-center gap-7">
      {decorrido}
      {restante}
    </div>
  )

  const velocidade = (
    // largura fixa, e não `flex-1`: com a saída na mesma ponta, esticar a
    // régua empurraria o Transmitir para fora da janela em vez de usar a
    // sobra. Quem equilibra as duas pontas — e com isso centraliza o play —
    // é a grade, não o conteúdo.
    <Lcd className={`${compacto ? 'h-12' : 'h-[52px]'} min-w-0 flex-none`}>
      {/* metade da largura de antes (186px). A palavra "VELOCIDADE" saiu da
          legenda junto: no espaço que sobrou ela truncaria, e ela já era a
          menos necessária das três coisas ali — o mostrador ao lado diz PPM
          por extenso. As pontas da faixa ficam, que são o que dá escala ao
          que a régua mostra; o nome inteiro continua no hover */}
      <div
        title={t('lcd.speed')}
        className="flex w-[93px] flex-col justify-center gap-1.5 border-r border-[var(--color-lcd-line)] px-2.5"
      >
        <SpeedRuler ppm={transport.ppm} onChange={(ppm) => dispatch({ type: 'transport/ppm', ppm })} />
        <div className="k-microcaps flex justify-between tracking-[0.1em] text-[var(--color-lcd-caption)]">
          <span>{PPM_MIN}</span>
          <span>{PPM_MAX}</span>
        </div>
      </div>
      <Digito valor={String(transport.ppm)} rotulo={t('toolbar.ppm')} tamanho={corpo} className="px-5" />
    </Lcd>
  )

  const teclado = <TecladoDeTransporte playing={transport.playing} loop={transport.loop} keymap={keymap} run={run} />
  const linha = <LinhaDeProgresso fracao={fracao} ticks={ticks} titulo={legenda} />

  if (position === 'topo') {
    // os cinco grupos da barra, cada um marcado para a medição. São os MESMOS
    // elementos nos dois arranjos, no mesmo tamanho — o que muda é só onde
    // cada um assenta
    const grupoArquivo = (
      <div data-grupo-barra className="flex flex-none items-center gap-2.5">
        <PocosDeArquivo tab={tab} keymap={keymap} run={run} onImport={onImport} onNewProject={onNewProject} />
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
        <PocoDeSaida displays={displays} output={state.output} dispatch={dispatch} run={run} grande />
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
        {cabeEmUmaLinha ? (
          // couberam todos: a barra de sempre, numa linha. O que é do MOMENTO
          // (relógios, velocidade) encosta no teclado, no meio; o que é de
          // PREPARAÇÃO (arquivos) ou de DESTINO (saída) vai para a borda.
          <div
            ref={barraRef}
            data-transporte="topo"
            data-linhas="1"
            className="grid flex-none items-center gap-2.5 border-b border-[var(--color-edge)] px-3 py-2"
            style={{ gridTemplateColumns: grade, background: fundo }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {grupoArquivo}
              <div className="min-w-0 flex-1" />
              {grupoRelogios}
            </div>
            {grupoTeclado}
            <div className="flex min-w-0 items-center gap-2.5">
              {grupoVelocidade}
              <div className="min-w-0 flex-1" />
              {grupoSaida}
            </div>
          </div>
        ) : (
          // não couberam: parte em duas, sem encolher nada. Em cima o que ARMA
          // o programa (arquivos e para onde ele vai); embaixo o console que se
          // toca com ele correndo, com o play de novo no centro geométrico
          <div
            ref={barraRef}
            data-transporte="topo"
            data-linhas="2"
            className="flex flex-none flex-col border-b border-[var(--color-edge)]"
            style={{ background: fundo }}
          >
            <div className="flex items-center gap-2.5 px-3 pt-2 pb-1">
              {grupoArquivo}
              <div className="min-w-0 flex-1" />
              {grupoSaida}
            </div>
            <div className="grid items-center gap-2.5 px-3 pt-1 pb-2" style={{ gridTemplateColumns: grade }}>
              <div className="flex min-w-0 items-center justify-end">{grupoRelogios}</div>
              {grupoTeclado}
              <div className="flex min-w-0 items-center">{grupoVelocidade}</div>
            </div>
          </div>
        )}
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
        // 84px, e não os 70 de antes: com o play em 60 o poço do teclado passa
        // a medir exatamente 70 (60 + os 5 de folga de cada lado), e ele
        // encostaria nas duas bordas da régua
        className="relative z-[2] grid h-[84px] flex-none items-center gap-2.5 border-t border-[var(--color-edge)] px-2.5"
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
