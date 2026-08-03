export type IconName =
  | 'play'
  | 'goTo'
  | 'pause'
  | 'restart'
  | 'up'
  | 'down'
  | 'mirror'
  | 'contrast'
  | 'blackout'
  | 'freeze'
  | 'monitor'
  | 'expand'
  | 'collapse'
  | 'plus'
  | 'close'
  | 'marker'
  | 'undo'
  | 'redo'
  | 'keyboard'
  | 'rotate'
  | 'search'
  | 'info'
  | 'import'
  | 'chapter'
  | 'direction'
  | 'sliders'
  | 'alert'
  | 'export'
  | 'project'
  | 'projectOpen'
  | 'webview'
  | 'layoutSplit'
  | 'layoutFocus'
  | 'layoutDeck'
  | 'transportTop'
  | 'transportBottom'
  | 'text'
  | 'readingLine'
  | 'globe'
  | 'card'
  | 'volume'
  | 'volumeOff'
  | 'trash'
  | 'sidebarLeft'
  | 'uiScale'
  | 'clearFormat'
  | 'catch'
  | 'loop'

const PATHS: Record<IconName, string> = {
  volume: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6',
  // o mesmo alto-falante, com as ondas de som trocadas por um X — mudo
  volumeOff: 'M4 9v6h4l5 4V5L8 9zM15 9l6 6M21 9l-6 6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  play: 'M8 5l11 7-11 7z',
  /**
   * O "Go To": a seta do play com uma barra encostada à direita — o mesmo
   * desenho universal de "pula até aqui" de qualquer player. Dois subpaths
   * FECHADOS, porque este ícone é desenhado com `filled`: uma barra feita de
   * linha (como a do pause) não teria área e sumiria.
   */
  goTo: 'M4.5 5L15 12 4.5 19z M17 5h2.5v14H17z',
  pause: 'M9 5v14M15 5v14',
  /**
   * Voltar ao início: a volta anti-horária com a ponta de seta no canto.
   *
   * O desenho antigo era `M4 12a8 8 0 1 0 8-8M4 12V6M4 12h6` — o arco estava
   * certo, mas os dois traços seguintes tinham 6 unidades cada e saíam do
   * ponto onde o arco COMEÇA, formando um "L" gigante pendurado fora do
   * círculo em vez de uma seta.
   *
   * O que segura o desenho agora é a ABERTURA do arco. Ele vai de (3.51,15)
   * até (5.64,5.64) pelo caminho longo, deixando o pedaço de cima à esquerda
   * sem traço — e é exatamente ali que a seta mora. Sem essa abertura a perna
   * horizontal cruzaria o círculo (em x≈3.2 na altura y=10) e a ponta ficaria
   * encostada nele, que era o defeito. As pernas têm 4,5 unidades: o
   * suficiente para ler como seta, sem virar um "L".
   */
  restart: 'M2.5 5.5v4.5h4.5M3.51 15a9 9 0 1 0 2.13-9.36L2.5 10',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  mirror: 'M12 3v18M8 7L4 12l4 5M16 7l4 5-4 5',
  contrast: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  blackout: 'M4 4h16v16H4zM4 4l16 16',
  freeze: 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  expand: 'M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6',
  collapse: 'M10 4v6H4M14 20v-6h6M4 10l6-6M20 14l-6 6',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  marker: 'M6 3h12v18l-6-5-6 5z',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12H8',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h6',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
  rotate: 'M3 12a9 9 0 1 1 3 6.7M3 12V7M3 12h5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v5h1',
  import: 'M12 3v12M8 11l4 4 4-4M4 19h16',
  // "H" de heading para capítulo, e colchetes literais para direção: o ícone
  // repete a marcação que o operador digitaria à mão
  chapter: 'M6 4v16M18 4v16M6 12h12',
  direction: 'M9 4H5v16h4M15 4h4v16h-4',
  sliders: 'M4 7h16M4 12h16M4 17h16M9 5v4M16 10v4M7 15v4',
  alert: 'M12 3L2 20h20zM12 10v4M12 17h.01',
  // espelho do ícone de importar: a seta sai do documento em vez de entrar
  export: 'M12 16V4M8 8l4-4 4 4M4 19h16',
  // caixa fechada para salvar o projeto: leva o programa inteiro dentro, não só
  // o texto. Abrir é uma pasta, e não outra caixa: dois ícones de caixa lado a
  // lado ficam indistinguíveis a 17px, que é o tamanho em que eles vivem
  project: 'M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10',
  projectOpen: 'M3 7h6l2 2h10v10H3zM3 9h18',
  // ondas saindo de um ponto: o sinal do wi-fi, que é como as pessoas na
  // gravação vão chegar até a página
  webview: 'M12 19h.01M8.5 15.5a5 5 0 0 1 7 0M5 12a10 10 0 0 1 14 0M2 8.5a15 15 0 0 1 20 0',
  // os três modos: duas colunas lado a lado, uma tela só, e uma trilha fina em
  // cima de linhas de lista — a mesma leitura visual do que cada um mostra
  layoutSplit: 'M3 5h8v14H3zM13 5h8v14H13z',
  layoutFocus: 'M3 5h18v10H3zM7 19h10',
  layoutDeck: 'M3 4h18v5H3zM3 13h8M3 17h8M13 13h8M13 17h5',
  /**
   * Onde a barra de transporte fica: a janela inteira, com a faixa do console
   * destacada em cima ou embaixo, e os botõezinhos dentro dela.
   *
   * Estes dois botões reusavam `layoutSplit` e `layoutDeck` — ícones do MODO
   * DE LAYOUT, que é outra decisão (quantos painéis aparecem). O desenho não
   * dizia nada sobre a posição da barra, que é o que eles de fato mudam.
   *
   * O que muda entre os dois é só a altura da faixa e a das teclas: a moldura
   * é idêntica, para o par ser lido como "em cima" contra "embaixo" e não
   * como dois desenhos diferentes.
   */
  transportTop: 'M3 5h18v14H3zM3 10h18M6.5 7.5h3M11.5 7.5h6',
  transportBottom: 'M3 5h18v14H3zM3 14h18M6.5 16.5h3M11.5 16.5h6',
  text: 'M4 6h16M4 12h11M4 18h14',
  // linhas de texto atravessadas pela marca de leitura, com as cunhas das pontas
  readingLine: 'M7 6h10M7 18h10M2 12h20M4 10l2 2-2 2M20 10l-2 2 2 2',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18',
  // um quadro com uma montanha dentro: a arte que entra no lugar do texto
  card: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  // a moldura da janela com uma coluna estreita separada à esquerda: a
  // mesma leitura do "toggle sidebar" de qualquer editor de código
  sidebarLeft: 'M3 5h18v14H3zM9 5v14',
  // a moldura da janela com uma seta de dois sentidos dentro: não é o zoom de
  // uma imagem (lupa), é o tamanho da interface inteira
  uiScale: 'M3 5h18v14H3zM9.5 10l-2 2 2 2M14.5 10l2 2-2 2M7.5 12h9',
  // o "T" da formatação de texto riscado por um X: o mesmo desenho que
  // qualquer editor usa para "voltar ao texto simples"
  clearFormat: 'M4 6V4h9v2M8.5 4v13M6 17h5M15 12l6 6M21 12l-6 6',
  // uma mira: o alvo que a rolagem persegue continuamente enquanto o CATCH
  // está ligado — quatro travessões em volta de um ponto central
  catch: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12h.01',
  /**
   * O loop de reprodução: as duas setas em ciclo de qualquer player.
   *
   * Era o caractere `∞` escrito como texto no botão — e um glifo é desenhado
   * dentro da caixa da LETRA, que tem alto e fundo que o infinito não usa;
   * ele ficava visivelmente acima do meio, ao lado de vizinhos que são todos
   * SVG. Como ícone, o desenho ocupa o `viewBox` de 2 a 22, simétrico em
   * torno de 12, e centra sozinho em qualquer escala da interface.
   */
  loop: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3'
}

interface Props {
  name: IconName
  size?: number
  className?: string
  style?: React.CSSProperties
  /**
   * Sólido em vez de contorno — só faz sentido para um path FECHADO (que
   * termina em `z`), como o triângulo do play. Um path aberto (as barras do
   * pause, por exemplo) não tem área para preencher e desapareceria.
   */
  filled?: boolean
}

export function Icon({ name, size = 16, className, style, filled }: Props): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
