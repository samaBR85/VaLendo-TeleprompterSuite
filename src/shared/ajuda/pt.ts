import type { Ajuda } from './en'

export const ajudaPt = {
  /* ------------------------------------------------------------ cabeçalho */
  'header.version': {
    nome: 'Sobre o Valendo',
    texto: 'Versão, créditos e licença. Fica verde quando existe uma versão mais nova — o Valendo nunca baixa nada sozinho.'
  },
  'header.shortcuts': {
    nome: 'Atalhos',
    texto: 'Todo comando e a tecla que o executa. Clique numa tecla para regravar; as dicas do app seguem o que você definir.'
  },
  'header.palette': {
    nome: 'Busca de comandos',
    texto: 'Digite o nome de um comando e rode sem caçar o botão dele. Mais rápido que o mouse quando você já sabe o nome.',
    comando: 'palette.open'
  },
  'header.uiScale': {
    nome: 'Escala da interface',
    texto: 'Aumenta ou diminui a janela do operador — texto, teclas e espaçamento juntos. A tela do apresentador nunca muda com isso.'
  },
  'header.uiScaleSlider': {
    nome: 'Escala da interface',
    texto: 'Arraste para redimensionar toda a mesa. Útil num painel 4K, onde o tamanho padrão fica pequeno à distância de operação.'
  },
  'header.uiScaleReset': {
    nome: 'Voltar a 100%',
    texto: 'Volta a interface ao tamanho natural. Fica apagado quando você já está nele.'
  },
  'header.uiScaleDown': {
    nome: 'Diminuir a interface',
    texto: 'Um clique, um degrau de 5%. O slider atravessa a faixa inteira num gesto, mas acertar exatamente 105% nele é sorte.'
  },
  'header.uiScaleUp': {
    nome: 'Aumentar a interface',
    texto: 'Um clique, um degrau de 5%. Vai até 160% — útil num painel 4K, onde o tamanho normal fica pequeno à distância de operação.'
  },
  'header.dismissNotice': {
    nome: 'Dispensar este aviso',
    texto: 'Limpa um aviso sobre algo que já aconteceu. Um problema que ainda está acontecendo não tem botão de dispensar — some quando é corrigido.'
  },
  'header.languageOption': {
    nome: 'Escolher este idioma',
    texto: 'Cada idioma está escrito nele mesmo, porque quem precisa trocar é justamente quem não lê o idioma atual.'
  },
  'header.language': {
    nome: 'Idioma',
    texto: 'Troca o idioma da interface. Seu roteiro nunca é tocado — só os rótulos ao redor dele.'
  },

  /* --------------------------------------------------------------- PROJECT */
  'project.open': {
    nome: 'Abrir projeto',
    texto: 'Abre um arquivo .valendo: todas as abas, aparência, marcadores, cartões e ritmo, exatamente como a máquina que salvou deixou.',
    comando: 'project.open'
  },
  'project.recent': {
    nome: 'Projetos recentes',
    texto: 'Os últimos projetos abertos ou salvos. Arquivos que não existem mais no disco somem da lista sozinhos.'
  },
  'project.recentItem': {
    nome: 'Abrir este projeto',
    texto: 'Reabre direto do disco, sem caixa de diálogo. Passe o mouse para ver o caminho completo — dois projetos podem ter o mesmo nome em pastas diferentes.'
  },
  'project.saveAsItem': {
    nome: 'Salvar projeto como',
    texto: 'Sempre pergunta onde gravar, sem tocar no original. Daqui em diante, o arquivo novo é o que está sendo salvo.',
    comando: 'project.saveAs'
  },
  'project.save': {
    nome: 'Salvar projeto',
    texto: 'Grava o programa inteiro de volta no .valendo já aberto. Só pergunta onde da primeira vez.',
    comando: 'project.save'
  },
  'project.saveAs': {
    nome: 'Salvar projeto como',
    texto: 'Sempre pergunta onde gravar, sem tocar no original. Daqui em diante, o arquivo novo é o que está sendo salvo.',
    comando: 'project.saveAs'
  },
  'project.new': {
    nome: 'Novo projeto',
    texto: 'Começa um programa vazio. Oferece salvar o atual primeiro, se ele tiver mudanças que nunca chegaram a um arquivo.',
    comando: 'project.new'
  },

  /* ---------------------------------------------------------------- SCRIPT */
  'script.import': {
    nome: 'Importar roteiro',
    texto: 'Lê .docx, .pdf, .rtf ou texto puro numa aba nova. A formatação é removida; capítulos e direções você marca depois.'
  },
  'script.save': {
    nome: 'Exportar roteiro',
    texto: 'Grava a aba ativa como um arquivo de texto — só o roteiro, sem o projeto em volta.',
    comando: 'document.save'
  },
  'script.exportAs': {
    nome: 'Exportar como…',
    texto: 'Abre o diálogo de novo, para escolher outro nome ou outro formato. O \'exportar\' ao lado regrava o último arquivo sem perguntar; este é o caminho para trocar de formato.',
    comando: 'document.saveAs'
  },

  /* ----------------------------------------------------------------- VIEWS */
  'view.transportTop': {
    nome: 'Transporte no topo',
    texto: 'Põe a mesa de transporte sob a barra de abas, em tamanho cheio — o arranjo com mais espaço para os relógios.',
    comando: 'view.transportPosition'
  },
  'view.transportStrip': {
    nome: 'Transporte em régua',
    texto: 'Move o transporte para uma régua fina no rodapé, liberando o topo da janela para roteiro e saída.',
    comando: 'view.transportPosition'
  },
  'view.sidebar': {
    nome: 'Coluna de assets',
    texto: 'Mostra ou esconde a coluna esquerda: capítulos do roteiro, cartões do programa e esta ajuda rápida.',
    comando: 'view.sidebar'
  },
  'view.cards': {
    nome: 'Gaveta de cartões',
    texto: 'Mostra ou esconde a gaveta onde ficam imagens, vídeos e recados — os que você põe na tela do apresentador.',
    comando: 'view.cards'
  },
  'view.inspector': {
    nome: 'Painel de ajustes',
    texto: 'Mostra ou esconde o painel direito: como o texto aparece, como ele lê e como sai pelo vidro.',
    comando: 'view.inspector'
  },

  /* ------------------------------------------------------------------ TABS */
  'tabs.tab': {
    nome: 'Aba de roteiro',
    texto: 'Cada aba é um roteiro separado, com aparência e marcadores próprios. Só a ativa vai ao ar. Botão direito para duplicar, renomear ou fechar.'
  },
  'tabs.close': {
    nome: 'Fechar aba',
    texto: 'Remove este roteiro da sessão. Ele continua no arquivo do projeto até você salvar de novo.'
  },
  'tabs.new': {
    nome: 'Nova aba',
    texto: 'Abre um roteiro vazio ao lado dos atuais — um segundo bloco do mesmo programa, não um projeto novo.',
    comando: 'tab.new'
  },

  /* -------------------------------------------------------------------- AR */
  'ar.blackout': {
    nome: 'Tela preta',
    texto: 'Apaga a tela do apresentador para o preto, na hora, mantendo a leitura onde está. Vence qualquer cartão no ar.',
    comando: 'output.blackout'
  },
  'ar.freeze': {
    nome: 'Congelar',
    texto: 'Para o texto onde está enquanto o relógio continua correndo. Para uma pausa fora do roteiro, sem perder o lugar.',
    comando: 'transport.freeze'
  },
  'ar.webview': {
    nome: 'Ver na rede',
    texto: 'Publica uma página na rede local: qualquer aparelho com navegador lê o mesmo roteiro. Abre o painel com o endereço e o QR code.'
  },
  'ar.webviewSound': {
    nome: 'Som pela rede',
    texto: 'Se um cartão de vídeo manda o áudio pela rede. Desligado, a página nem oferece tirar o mudo. Apagado até a rede subir.'
  },

  /* ---------------------------------------------------------------- OUTPUT */
  'output.identify': {
    nome: 'Identificar monitores',
    texto: 'Pisca um número grande em cada tela para você saber qual é qual. Desativado durante a transmissão — piscaria no ar também.'
  },
  'output.identifyRun': {
    nome: 'Mostrar os números',
    texto: 'Pisca o número de cada monitor por alguns segundos. Nada é enviado ao apresentador; é só uma etiqueta no vidro.'
  },
  'output.monitor': {
    nome: 'Escolher monitor',
    texto: 'De qual tela o apresentador lê. Escolha antes de transmitir — é a única coisa que o Transmitir espera.'
  },
  'output.broadcast': {
    nome: 'Transmitir',
    texto: 'Põe a leitura no monitor escolhido, em tela cheia. O ponto é o estado: apagado é fora do ar, vermelho aceso é no ar.',
    comando: 'output.toggle'
  },

  /* ------------------------------------------------------------- TRANSPORT */
  'transport.restart': {
    nome: 'Voltar ao início',
    texto: 'Manda a leitura de volta à primeira palavra e zera os relógios. Continua rodando se já estava rodando.',
    comando: 'transport.restart'
  },
  'transport.back': {
    nome: 'Recuar',
    texto: 'Move a leitura algumas linhas para trás sem parar — para quando o apresentador repete uma frase.',
    comando: 'transport.jumpBack'
  },
  'transport.playPause': {
    nome: 'Iniciar / Pausar',
    texto: 'Inicia e para a rolagem. A maior tecla da mesa porque é a única que você alcança sem olhar.',
    comando: 'transport.playPause'
  },
  'transport.forward': {
    nome: 'Avançar',
    texto: 'Move a leitura algumas linhas para frente sem parar — para quando o apresentador pula um trecho.',
    comando: 'transport.jumpForward'
  },
  'transport.marker': {
    nome: 'Criar marcador',
    texto: 'Cria um marcador onde a leitura está agora. Marcadores aparecem na linha de progresso e dá para saltar até eles no programa.',
    comando: 'marker.create'
  },
  'transport.speed': {
    nome: 'Ritmo de leitura',
    texto: 'Palavras por minuto — a velocidade da rolagem. A roda do mouse funciona em qualquer lugar do app, não só sobre esta régua.'
  },
  'status.target': {
    nome: 'Duração-alvo',
    texto: 'Quanto tempo o roteiro leva no ritmo atual. Clique e digite outro — "2:00" ou só segundos — e o ritmo muda para se encaixar.'
  },
  'transport.elapsed': {
    nome: 'Decorrido',
    texto: 'Há quanto tempo a leitura está rodando. O que ele conta depende do modo de relógio em Ajustes › Saída.'
  },
  'transport.remaining': {
    nome: 'Restante',
    texto: 'Quanto falta no ritmo atual. Mudar o ritmo muda este número na hora — é para isso que ele serve.'
  },
  'markers.chip': {
    nome: 'Marcador',
    texto: 'Clique para mandar a leitura para cá. Botão direito remove o marcador. O número é a tecla que salta até ele no programa.'
  },
  'transport.progress': {
    nome: 'Linha de progresso',
    texto: 'O roteiro inteiro de ponta a ponta. Traços âmbar são capítulos, traços vermelhos são marcadores que você criou.'
  },

  /* ---------------------------------------------------------------- EDITOR */
  'editor.chapter': {
    nome: 'Capítulo',
    texto: 'Transforma a linha atual em capítulo — vira ## no texto. Capítulos aparecem na coluna esquerda, na linha de progresso e no rundown.',
    comando: 'insert.chapter'
  },
  'editor.chapterAll': {
    nome: 'Capitular todas as iguais',
    texto: 'Vira capítulo toda linha cujo texto INTEIRO é igual ao selecionado, num passo de desfazer só. Palavra no meio de uma fala nunca entra — só a linha onde ela está sozinha.'
  },
  'editor.direction': {
    nome: 'Direção',
    texto: 'Marca a linha como direção de cena — vira [colchetes] no texto. Uma instrução ao apresentador, nunca contada como palavra falada.',
    comando: 'insert.direction'
  },
  'editor.find': {
    nome: 'Procurar no roteiro',
    texto: 'Enter vai para a próxima, Shift+Enter para a anterior, Esc fecha na que você vê. Ignora caixa e acento: "acao" acha "ação". Mexe só no editor — a posição de leitura não sai do lugar.',
    comando: 'edit.find'
  },
  'editor.replace': {
    nome: 'Trocar por',
    texto: 'O que entra no lugar do que você achou. Enter troca a atual, Shift+Enter troca todas. Trocar todas é UM passo de desfazer, não trinta.'
  },
  'editor.findAll': {
    nome: 'Marcar todas as ocorrências',
    texto: 'Desenha a caixa em todas de uma vez, a atual mais forte que as outras. Útil antes de trocar todas: você vê o que vai mudar.'
  },
  'editor.overwrite': {
    nome: 'Pintar por cima das falas do apresentador',
    texto: 'Desligado, pintar todas pula as linhas que já têm a cor de um apresentador — essa cor é um sistema em que quem lê confia. Ligado, pinta essas também.'
  },
  'editor.bold': {
    nome: 'Negrito',
    texto: 'Negrito de verdade na tela do apresentador. Aqui a letra engrossa sem alargar, senão o editor desalinharia. Sobre um trecho já negrito o botão acende, e o clique tira.'
  },
  'editor.italic': {
    nome: 'Itálico',
    texto: 'Itálico de verdade na tela do apresentador; aqui um traço ondulado, pelo mesmo motivo do negrito. O botão acende sobre um trecho já em itálico, e o clique tira.'
  },
  'editor.underline': {
    nome: 'Sublinhado',
    texto: 'Igual nos dois — sublinhar não muda a largura de letra nenhuma. O botão acende sobre um trecho já sublinhado, e o clique tira.'
  },
  'editor.color': {
    nome: 'Cor do texto',
    texto: 'Abre a paleta: 71 tons, mais as quatro últimas que você usou. Vale para o que estiver selecionado no roteiro.'
  },
  'editor.findStep': {
    nome: 'Achado anterior / próximo',
    texto: 'Anda entre os achados sem tocar na posição de leitura — o apresentador não vê a tela saltar enquanto você procura.'
  },
  'editor.replaceToFind': {
    nome: 'Levar para a busca',
    texto: 'Recorta o que está em Trocar e faz dele o termo procurado. Depois de trocar uma palavra, é assim que se acha a nova sem redigitá-la.'
  },
  'editor.apply': {
    nome: 'Aplicar',
    texto: 'Faz tudo o que está marcado acima, num passo só: trocar, pintar, ou as duas coisas. O da esquerda age neste achado, o da direita em todos.'
  },
  'editor.findClose': {
    nome: 'Fechar a busca',
    texto: 'Deixa o cursor no achado em que você estava, para continuar digitando ali mesmo. O Esc faz o mesmo.'
  },
  'editor.paintWith': {
    nome: 'Pintar os achados',
    texto: 'Marcado, aplicar também pinta o que foi achado. Junto com Trocar, a cor cai na palavra NOVA — não na que deixou de existir.'
  },
  'editor.recentColors': {
    nome: 'Cores recentes',
    texto: 'As quatro últimas que você escolheu, em roda: uma cor nova ocupa a casa seguinte e recomeça na primeira. A pontilhada tira a cor.'
  },
  'editor.clearFormat': {
    nome: 'Remover formatação',
    texto: 'Com um trecho selecionado, tira dele capítulo, direção, cor e ênfase. Sem seleção, abre o menu para limpar o roteiro inteiro. As palavras ficam; desfazer traz tudo de volta.',
    comando: 'edit.clearFormat'
  },
  'editor.presenter': {
    nome: 'Criar apresentador',
    texto: 'Selecione um nome já escrito no roteiro e clique: dali para baixo, essa pessoa fala — até o próximo nome. Nada é escrito no seu texto.'
  },
  'editor.allCaps': {
    nome: 'Caixa alta no editor',
    texto: 'Desenha o editor em maiúsculas sem mudar uma letra sequer armazenada. Independente do mesmo switch em Ajustes › Texto.'
  },
  'editor.undo': {
    nome: 'Desfazer',
    texto: 'Volta um passo nas suas edições do roteiro.',
    comando: 'edit.undo'
  },
  'editor.redo': {
    nome: 'Refazer',
    texto: 'Avança de novo pelo que você desfez.',
    comando: 'edit.redo'
  },
  'editor.catch': {
    nome: 'Catch',
    texto: 'A marca de leitura segue o seu cursor enquanto você digita, a cada pausa. Um Ir Para que nunca se desliga sozinho.'
  },
  'editor.goTo': {
    nome: 'Ir Para',
    texto: 'Manda a leitura para onde está o cursor no editor, uma vez. Para saltar até um trecho que você acabou de achar.'
  },
  'editor.marker': {
    nome: 'Criar marcador',
    texto: 'O mesmo marcador da mesa de transporte, ao alcance do roteiro que você já está olhando.',
    comando: 'marker.create'
  },
  'editor.loop': {
    nome: 'Loop',
    texto: 'Ao chegar ao fim, volta ao início e continua rodando. Para um stand ou ensaio que não pode parar nunca.'
  },
  'editor.loopDelay': {
    nome: 'Espera do loop',
    texto: 'Segundos de espera no fim antes de recomeçar. Zero reinicia na hora.'
  },
  'editor.fontSmaller': {
    nome: 'Fonte menor',
    texto: 'Um ponto menor no editor. A tela do apresentador não muda — isto é o conforto de quem digita.'
  },
  'editor.fontSize': {
    nome: 'Tamanho da fonte do editor',
    texto: 'O tamanho do texto que você digita. Não tem relação com o tamanho que o apresentador lê, que fica em Ajustes › Texto.'
  },
  'editor.fontFamily': {
    nome: 'Fonte do editor',
    texto: 'Com que letra você DIGITA — a do apresentador é outra, e fica nos Ajustes. Vale só nesta máquina: mandar o projeto a um colega não troca a fonte dele.'
  },
  'editor.fontBigger': {
    nome: 'Fonte maior',
    texto: 'Um ponto maior no editor. A tela do apresentador não muda — isto é o conforto de quem digita.'
  },
  'editor.script': {
    nome: 'Roteiro',
    texto: 'Digite ou cole aqui. Uma linha começando com ## é um capítulo; texto em [colchetes] é direção, nunca contada como falada.'
  },
  'editor.split': {
    nome: 'Divisória edição / transmissão',
    texto: 'Arraste para dar mais espaço ao roteiro ou à prévia. Duplo clique volta ao meio exato.'
  },
  'panel.goToReading': {
    nome: 'Ir para a leitura',
    texto: 'Traz o editor até a palavra sendo lida agora, uma vez, e põe o cursor lá. O espelho do Ir Para de baixo do roteiro.'
  },
  'panel.follow': {
    nome: 'Seguir a leitura',
    texto: 'O editor rola junto com a transmissão e marca a linha sendo lida. Nunca move seu cursor, e sai do caminho por 4s quando você digita ou rola.'
  },
  'panel.focusToggle': {
    nome: 'Modo foco',
    texto: 'Esconde o editor e deixa só a visão do apresentador na tela — o arranjo para rodar, não para escrever.',
    comando: 'view.focus'
  },

  /* --------------------------------------------------------------- SIDEBAR */
  'sidebar.chapter': {
    nome: 'Capítulo',
    texto: 'Clique para mandar a leitura ao início deste capítulo. O tempo à direita é quanto ele leva no ritmo atual.'
  },
  'sidebar.card': {
    nome: 'Cartão',
    texto: 'Clique para pôr este cartão na tela do apresentador, ou tirar se já estiver lá. Arraste para reordenar.'
  },
  'sidebar.cardOverlay': {
    nome: 'Overlay neste cartão',
    texto: 'O texto rola sobre este cartão em vez de ser substituído por ele. Travado enquanto o OVERLAY global força todo cartão.'
  },
  'sidebar.overlayGlobal': {
    nome: 'Overlay global',
    texto: 'Força o texto sobre TODO cartão, seja qual for o ajuste de cada um. Desligado, cada cartão decide por si.'
  },
  /* também um id por opção: faixa, sombra e nada resolvem legibilidades
     diferentes, e é justamente a diferença entre elas que o operador precisa
     saber para escolher */
  'overlay.styleBand': {
    nome: 'Overlay: faixa escura',
    texto: 'Põe uma faixa escura sobre o cartão inteiro, atrás do texto. O único que garante legibilidade em qualquer imagem.'
  },
  'overlay.styleShadow': {
    nome: 'Overlay: sombra',
    texto: 'Põe uma sombra em volta de cada letra em vez de uma faixa — o cartão fica todo visível, o texto legível na maioria.'
  },
  'overlay.styleNone': {
    nome: 'Overlay: sem tratamento',
    texto: 'Texto direto sobre o cartão, sem tratamento. Só para artes escolhidas sabendo onde o texto vai cair.'
  },
  'sidebar.thumbSmaller': {
    nome: 'Miniaturas menores',
    texto: 'Encolhe as miniaturas dos cartões nesta coluna em 10%, cabendo mais programa na tela.'
  },
  'sidebar.thumbSize': {
    nome: 'Tamanho das miniaturas',
    texto: 'O tamanho das imagens dos cartões nesta coluna. Um conforto local — nunca viaja dentro do arquivo do projeto.'
  },
  'sidebar.thumbBigger': {
    nome: 'Miniaturas maiores',
    texto: 'Aumenta as miniaturas dos cartões nesta coluna em 10%, para reconhecer um quadro num relance.'
  },
  'sidebar.helpToggle': {
    nome: 'Ajuda rápida',
    texto: 'Recolhe esta caixa. O que você lê aqui é o último controle que o mouse apontou — fica até você apontar outro.'
  },

  /* ----------------------------------------------------------------- CARDS */
  'cards.addImage': {
    nome: 'Adicionar imagem',
    texto: 'Copia uma imagem para dentro do projeto, para que ela viaje dentro do .valendo e sobreviva à máquina de origem.'
  },
  'cards.addVideo': {
    nome: 'Adicionar vídeo',
    texto: 'Aponta para um vídeo onde ele já está — não é copiado. Mover ou renomear o arquivo depois quebra o cartão.'
  },
  'cards.addText': {
    nome: 'Adicionar recado',
    texto: 'Um cartão de texto simples — um recado ao apresentador, grande na tela. Nada para importar; você digita aqui mesmo.'
  },
  'cards.addScreen': {
    nome: 'Adicionar tela',
    texto: 'Um cartão que o app desenha: uma cor ou gradiente, com recado por cima se quiser. Sem arquivo, sem importar — uma tela de espera sem abrir editor de imagem.'
  },
  'cards.editScreen': {
    nome: 'Editar a tela',
    texto: 'Abre a tela com uma prévia grande. Cor escolhida num quadrado de 176px não é a cor que você vê num monitor de estúdio.'
  },
  'cards.background': {
    nome: 'Fundo',
    texto: 'Chapado é uma cor só. Gradiente soma uma segunda cor e um ângulo entre elas.'
  },
  'cards.colours': {
    nome: 'Cores',
    texto: 'Abre o seletor de cores do sistema, com conta-gotas incluído. Cores escuras e dessaturadas leem melhor atrás do vidro do teleprompter.'
  },
  'cards.angle': {
    nome: 'Ângulo do gradiente',
    texto: 'Para que lado as duas cores correm. 0° vai para cima, 90° vai para a direita.'
  },
  'cards.screenText': {
    nome: 'Recado da tela',
    texto: 'O que é escrito sobre o fundo. Onde você aperta Enter é onde a linha quebra no ar. Deixe vazio para um fundo liso.'
  },
  'cards.screenEffect': {
    nome: 'Fundo animado',
    texto: 'Seis formas das duas cores se moverem. Todas lentas de propósito — um fundo inquieto briga com quem lê. Cada tela roda sua própria cópia, sem sincronismo entre elas.'
  },
  'cards.speed': {
    nome: 'Velocidade do efeito',
    texto: 'Acelera ou desacelera os seis efeitos juntos. Escala o ritmo próprio de cada um em vez de forçar uma duração única — eles não têm o mesmo número.'
  },
  'cards.intensity': {
    nome: 'Intensidade do efeito',
    texto: 'O quanto o movimento aparece sobre a cor base. Baixo é quase imperceptível, o que um fundo que fica meia hora no ar costuma querer.'
  },
  'cards.fade': {
    nome: 'Onde as cores se encontram',
    texto: 'Quanto do quadro a transição ocupa. Cheio é um degradê de ponta a ponta; zero é uma linha limpa entre duas metades sólidas.'
  },
  'cards.screenAlign': {
    nome: 'Alinhamento do parágrafo',
    texto: 'Como as linhas se alinham entre si. Independente de onde o bloco fica na tela — isso é a Posição.'
  },
  'cards.size': {
    nome: 'Tamanho do recado',
    texto: 'Uma fração da altura da tela, não um tamanho em pixels — para o cartão parecer igual na miniatura e num monitor de 55 polegadas.'
  },
  'cards.place': {
    nome: 'Onde fica',
    texto: 'Topo, meio ou pé. Nenhum toca a borda: atrás do vidro, o último centímetro da tela é o primeiro a sumir.'
  },
  'cards.close': {
    nome: 'Fechar gaveta',
    texto: 'Esconde a gaveta de cartões. Os cartões continuam no programa; só a gaveta some.'
  },
  'cards.shortcut': {
    nome: 'Atalho do cartão',
    texto: 'A tecla que põe este cartão no ar durante o programa. Segue a posição na gaveta — reordenar renumera.'
  },
  'cards.name': {
    nome: 'Nome do cartão',
    texto: 'Como você chama este cartão. É o que a coluna de assets e o rundown mostram — o nome do arquivo não significa nada na correria.'
  },
  'cards.message': {
    nome: 'Recado',
    texto: 'O texto que o apresentador lê neste cartão. É desenhado grande e centralizado, sem rolagem.'
  },
  'cards.onAir': {
    nome: 'No ar',
    texto: 'Põe este cartão na tela do apresentador, ou tira. As únicas duas portas são esta caixa e o botão de tocar vídeo.'
  },
  'cards.overlay': {
    nome: 'Overlay neste cartão',
    texto: 'O texto rola sobre este cartão em vez de ser substituído por ele. Travado enquanto o OVERLAY global força todo cartão.'
  },
  'cards.remove': {
    nome: 'Excluir cartão',
    texto: 'Remove este cartão do programa. Imagens importadas são limpas da pasta do projeto quando você salva.'
  },
  'cards.relink': {
    nome: 'Reapontar arquivo',
    texto: 'O arquivo que este cartão aponta sumiu — movido, renomeado ou num drive que não está aqui. Clique para reapontar o cartão.'
  },
  'cards.videoNetwork': {
    nome: 'Vídeo na rede',
    texto: 'Se navegadores na rede conseguem tocar este arquivo. Alguns formatos um navegador recusa mesmo o app tocando bem.'
  },
  'cards.videoPlay': {
    nome: 'Tocar vídeo',
    texto: 'Fora do ar, isto sobe o cartão e começa a tocar. No ar, toca e pausa o que já está rodando.'
  },
  'cards.videoStartPaused': {
    nome: 'Subir pausado',
    texto: 'Manda o cartão para a tela congelado no quadro atual — para preparar uma cena antes de ela realmente rodar.'
  },
  'cards.videoSeek': {
    nome: 'Posição do vídeo',
    texto: 'Arraste para avançar ou voltar o vídeo. Ele se move na tela do apresentador também — arrastar no ar é arrastar no ar.'
  },
  'cards.videoMute': {
    nome: 'Silenciar',
    texto: 'Silencia o áudio do cartão nesta máquina e devolve ao volume que você tinha. O som pela rede tem switch próprio.'
  },
  'cards.videoVolume': {
    nome: 'Volume do cartão',
    texto: 'O quão alto os cartões de vídeo tocam nesta máquina. Uma preferência local — nunca viaja dentro do arquivo do projeto.'
  },
  'cards.videoLoop': {
    nome: 'Repetir vídeo',
    texto: 'Este clipe recomeça ao chegar ao fim, enquanto o cartão estiver no ar.'
  },

  /* ---------------------------------------------------------------- SETTINGS */
  'insp.tabText': {
    nome: 'Texto',
    texto: 'Como a tela do apresentador é desenhada: fonte, tamanho, peso, alinhamento e cores.'
  },
  'insp.tabReading': {
    nome: 'Leitura',
    texto: 'Como o texto lê: onde ele fica, quantas palavras por linha, onde está a marca de leitura e como o ritmo se comporta.'
  },
  'insp.tabOutput': {
    nome: 'Saída',
    texto: 'O que só existe na tela do apresentador: os relógios e o espelhamento que o vidro de um teleprompter de verdade exige.'
  },
  'insp.font': {
    nome: 'Fonte',
    texto: 'A família que o apresentador lê. As opções oferecidas são as que sobrevivem à leitura a distância, espelhada.'
  },
  'insp.allCaps': {
    nome: 'Caixa alta na saída',
    texto: 'Desenha a tela do apresentador em maiúsculas sem mudar uma letra armazenada. Independente do switch do editor.'
  },
  'insp.body': {
    nome: 'Corpo',
    texto: 'O tamanho que o apresentador lê. O número mais importante daqui — tudo o resto é ajuste em volta dele.'
  },
  'insp.weight': {
    nome: 'Peso da fonte',
    texto: 'O quão grossos são os traços. Mais pesado sobrevive a uma sala clara; mais leve é mais calmo num vidro escuro.'
  },
  'insp.lineHeight': {
    nome: 'Entrelinha',
    texto: 'A distância entre as linhas. Solta lê mais calma e rola mais suave; apertada cabe mais texto na tela.'
  },
  'insp.letterSpacing': {
    nome: 'Espaçamento entre letras',
    texto: 'O respiro entre as letras. Um pouco ajuda na distância; demais quebra as palavras.'
  },
  'insp.align': {
    nome: 'Alinhamento',
    texto: 'Onde cada linha fica dentro da caixa de texto. Independente da Posição, que move a caixa em si.'
  },
  'insp.textColor': {
    nome: 'Cor do texto',
    texto: 'A cor das palavras na tela do apresentador.'
  },
  'insp.bgColor': {
    nome: 'Cor de fundo',
    texto: 'A cor atrás das palavras. Num vidro de prompter de verdade, quanto mais escura, menos a sala reflete de volta.'
  },
  'insp.preset': {
    nome: 'Paleta de cores',
    texto: 'Uma dupla testada de texto e fundo. Mexer em qualquer cor depois só desmarca a paleta.'
  },
  'insp.invert': {
    nome: 'Inverter',
    texto: 'Troca as cores de texto e fundo — claro no escuro vira escuro no claro, num clique.'
  },
  'insp.presenterHide': {
    nome: 'Esconder este nome',
    texto: 'Tira o nome deste apresentador da tela do apresentador — a fala continua, na cor dele. Seu roteiro nunca é tocado.'
  },
  'insp.presenterHideAll': {
    nome: 'Esconder todos os nomes',
    texto: 'Tira todo nome de apresentador da saída de uma vez, e trava os switches individuais enquanto vigora. O editor sempre os mantém.'
  },
  'insp.presenterColor': {
    nome: 'Cor do apresentador',
    texto: 'A cor das falas desta pessoa, no roteiro e no vidro. Segure para experimentar, solte para confirmar — soltar fora desiste.'
  },
  'color.short': {
    nome: 'Synergy',
    texto: 'Troca a grade completa por oito cores escolhidas por busca para se distinguirem umas das outras no vidro. A grade volta com um clique.'
  },
  'color.tone': {
    nome: 'Tom da grade',
    texto: 'SAT e a grade cheia; PAS e a mesma em tom pastel. Nao alcanca o Synergy: dessaturar as oito destruiria a separacao que as define.'
  },
  'color.contrast': {
    nome: 'Contraste',
    texto: 'Apaga o que nao alcanca 7:1 no fundo de agora, e meio-apaga o que se confunde com uma cor ja usada no roteiro. Aviso, nao proibicao.'
  },
  'insp.presenterRename': {
    nome: 'Renomear apresentador',
    texto: 'Duplo clique para renomear. Reescreve o nome no roteiro também — só as deixas, nunca uma menção dentro de uma fala. Um desfazer devolve os dois.'
  },
  'insp.presenterRelink': {
    nome: 'Reapontar apresentador',
    texto: 'O nome mudou no roteiro. Selecione o novo no editor e clique: mesmo apresentador, mesma cor, nome novo — nada do que já foi pintado se perde.'
  },
  'insp.presenterRemove': {
    nome: 'Remover apresentador',
    texto: 'Descarta este apresentador. As palavras ficam exatamente como estão — só a cor vai embora.'
  },
  'insp.position': {
    nome: 'Posição horizontal',
    texto: 'Desliza a caixa de texto inteira para a esquerda ou direita sem redimensionar. Encaixa no centro exato perto de 50%.'
  },
  'insp.presentersToggle': {
    nome: 'Apresentadores',
    texto: 'Quem fala este roteiro, e de que cor. Fechada, os pontinhos continuam dizendo quantos estão registrados e de que cores.'
  },
  'insp.presetsToggle': {
    nome: 'Presets',
    texto: 'Cinco lugares para guardar um jeito inteiro — letra, cores, margens e os apresentadores. Fechado, ainda mostra aquele com que abas novas nascem.'
  },
  'insp.presetSlot': {
    nome: 'Um preset',
    texto: 'Um clique veste esta aba com ele. Botão direito para renomear, trocar a cor, marcar a estrela ou apagar. Ctrl+Z desfaz num passo só.'
  },
  'insp.presetSave': {
    nome: 'Guardar preset',
    texto: 'Fotografa a aba ativa e pergunta em qual dos cinco guardar. Dois passos de propósito: escrever por cima de um preset nomeado não pode ser um clique torto.'
  },
  'insp.margin': {
    nome: 'Margem',
    texto: 'Quanto da borda da tela fica vazio de cada lado. Texto mais estreito significa linhas mais curtas e menos movimento dos olhos.'
  },
  'insp.minWords': {
    nome: 'Mínimo de palavras por linha',
    texto: 'O piso de quão poucas palavras uma linha pode ter. O Valendo quebra o texto por sentido, não pela largura da tela.'
  },
  'insp.maxWords': {
    nome: 'Máximo de palavras por linha',
    texto: 'O teto de quantas palavras uma linha pode ter. Alto demais e as linhas quebram sozinhas, o que o painel avisa.'
  },
  'insp.readingMark': {
    nome: 'Marca de leitura',
    texto: 'A que altura da tela o apresentador lê. Mais para cima deixa mais texto abaixo para ver chegando.'
  },
  'insp.markOnOutput': {
    nome: 'Marca na saída',
    texto: 'Se a marca de leitura também é desenhada na tela do apresentador. Aqui na prévia ela sempre aparece.'
  },
  'insp.focusDim': {
    nome: 'Esmaecer o resto',
    texto: 'Esmaece o que está longe da marca de leitura, para o olho pousar na linha atual em vez de vagar.'
  },
  'insp.focusDimPct': {
    nome: 'Nível do esmaecimento',
    texto: 'A força do esmaecimento. Baixo deixa uma janela larga e legível em volta da marca; alto estreita até uma fresta. A janela segue a marca.'
  },
  'insp.uniform': {
    nome: 'Velocidade constante',
    texto: 'Toda linha recebe o mesmo tempo, seja qual for o peso dela. Desligado, uma linha pesada demora mais que uma curta — mais perto da fala real.'
  },
  'insp.wrappingFix': {
    nome: 'Ajustar o corpo',
    texto: 'Reduz o corpo ao maior tamanho em que nenhuma linha quebra sozinha, acabando com o descompasso que o aviso descreve.'
  },
  'insp.clockElapsed': {
    nome: 'Relógio decorrido',
    texto: 'Mostra o tempo decorrido na tela do apresentador — a que ele olha, não a da sua mesa.'
  },
  'insp.clockElapsedColor': {
    nome: 'Cor do decorrido',
    texto: 'A cor do relógio de tempo decorrido na tela do apresentador.'
  },
  'insp.clockRemaining': {
    nome: 'Relógio restante',
    texto: 'Mostra o tempo restante na tela do apresentador — o número que diz para acelerar ou ir com calma.'
  },
  'insp.clockRemainingColor': {
    nome: 'Cor do restante',
    texto: 'A cor do relógio de tempo restante na tela do apresentador.'
  },
  /* Um id por opção, e não um para o trio: "fórmula", "cronômetro" e "livre"
     mudam o SIGNIFICADO dos dois relógios, cada um do seu jeito. Uma
     descrição só para os três seria a frase genérica que ninguém lê. */
  'insp.clockModeWords': {
    nome: 'Relógio: pelo roteiro',
    texto: 'Decorrido e restante vêm das palavras lidas e do ritmo atual. Mude o ritmo e os dois números mudam junto.'
  },
  'insp.clockModeStopwatch': {
    nome: 'Relógio: cronômetro',
    texto: 'Decorrido conta segundos reais a partir do play; restante conta regressivamente a partir do tempo-alvo definido abaixo.'
  },
  'insp.clockModeFree': {
    nome: 'Relógio: livre',
    texto: 'Os relógios correm contra o alvo, independentes do roteiro — para um trecho ao vivo onde as palavras não são o plano.'
  },
  'insp.clockTarget': {
    nome: 'Tempo-alvo',
    texto: 'Quanto tempo a matéria deve durar. Digite os números e os dois-pontos se posicionam sozinhos — "320" vira 03:20.'
  },
  'insp.clockPosition': {
    nome: 'Posição do relógio',
    texto: 'Em que canto da tela do apresentador os relógios ficam. A grade tem o formato da própria tela.'
  },
  'insp.clockSize': {
    nome: 'Tamanho do relógio',
    texto: 'O tamanho dos relógios, como fração da altura da tela. Grande o bastante para ler, pequeno o bastante para não brigar com o texto.'
  },
  'insp.mirrorH': {
    nome: 'Espelhar horizontal',
    texto: 'Inverte a tela do apresentador da esquerda para a direita — o que o vidro divisor de feixe na frente da lente exige. Sua prévia não espelha.'
  },
  'insp.mirrorV': {
    nome: 'Espelhar vertical',
    texto: 'Inverte a tela do apresentador de cima para baixo, para rigs com o monitor voltado para cima, contra o vidro. Sua prévia nunca é espelhada.'
  },
  'insp.rotation': {
    nome: 'Rotação',
    texto: 'Gira a tela do apresentador em quartos de volta — para um monitor montado de lado. Sua prévia e a página de rede mantêm a imagem em pé.'
  },

  /* -------------------------------------------------------------- RODAPÉ */
  'status.modeSplit': {
    nome: 'Split',
    texto: 'Editor e visão do apresentador lado a lado — o arranjo para escrever e rodar ao mesmo tempo.'
  },
  'status.modeFocus': {
    nome: 'Foco',
    texto: 'Só a visão do apresentador, do maior tamanho que a janela permite. Para rodar um roteiro já pronto.'
  },
  'status.modeDeck': {
    nome: 'Mesa',
    texto: 'Troca o editor pelo rundown: todo capítulo com sua duração, para acompanhar um programa longo.'
  },
  'status.storage': {
    nome: 'Estado de salvamento',
    texto: 'Diz se o Valendo está conseguindo gravar seu trabalho no disco. Fica âmbar no instante em que não consegue — silêncio pareceria igual a funcionando.'
  },
  'status.palette': {
    nome: 'Paleta de comandos',
    texto: 'Todo comando do app, buscável pelo nome, com o atalho ao lado. O jeito mais rápido de achar algo que você usa raramente.',
    comando: 'palette.open'
  }
} as const satisfies Partial<Record<string, Ajuda>>
