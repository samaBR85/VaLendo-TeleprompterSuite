/**
 * Marcas de cor e formatação sobre trechos do roteiro.
 *
 * É o primeiro recurso do app que guarda algo COLADO ao texto, e é por isso
 * que este arquivo existe separado da tela: o texto se move o tempo todo —
 * quem corrige uma vírgula no primeiro parágrafo empurra tudo o que vem
 * depois —, e uma marca guardada como "do caractere 118 ao 122" passaria a
 * pintar a palavra errada no primeiro ajuste.
 *
 * A posição de leitura já resolve esse problema há um ano, com a âncora
 * semântica. A diferença é de quantidade: lá é UMA âncora, aqui são quantas
 * marcas o operador criar. A conta é a mesma, e mora aqui, longe do desenho,
 * porque um erro nela aparece como palavra pintada fora do lugar — na tela do
 * apresentador, no meio de um programa.
 */

export interface Marca {
  /** começo, em caracteres, dentro do texto do bloco */
  de: number
  /** fim, exclusivo */
  ate: number
  cor?: string
  negrito?: boolean
  italico?: boolean
  sublinhado?: boolean
}

/**
 * Uma edição do texto, na forma em que a conta precisa dela.
 *
 * Não é "o texto novo": é ONDE mexeu, quanto saiu e quanto entrou. Digitar uma
 * letra é `{ posicao, removido: 0, inserido: 1 }`; apagar uma seleção é
 * `removido > 0, inserido: 0`; colar por cima é os dois.
 */
export interface Edicao {
  posicao: number
  removido: number
  inserido: number
}

/** Marca sem nada dentro não é marca — é só um par de números. */
export function marcaVazia(marca: Marca): boolean {
  return (
    marca.ate <= marca.de ||
    (marca.cor === undefined && !marca.negrito && !marca.italico && !marca.sublinhado)
  )
}

/**
 * Onde cada marca vai parar depois de uma edição.
 *
 * As seis regras aprovadas, e o porquê de cada uma:
 *
 * - **Digitar DENTRO** da marca faz ela crescer. Você está corrigindo uma
 *   palavra que escolheu pintar; ela não pode sair pintada pela metade.
 * - **Digitar logo DEPOIS do fim** faz ela crescer. É continuar a palavra, e é
 *   o que todo editor de texto do mundo faz.
 * - **Digitar logo ANTES do começo** NÃO faz ela crescer. Se crescesse dos dois
 *   lados, seria impossível escrever ao lado de uma palavra pintada sem pintar
 *   junto — e escrever ao lado é muito mais frequente que continuar dentro.
 * - **Apagar o trecho marcado inteiro** mata a marca. Marca sem texto embaixo
 *   não existe.
 * - **Colar por cima** mata a marca. Você trocou o conteúdo, não corrigiu:
 *   manter pintaria um texto que ninguém escolheu pintar.
 * - **Comer só uma ponta** encolhe a marca até o que sobrou.
 *
 * Recebe uma LISTA de edições porque "trocar todas" mexe em vários lugares de
 * uma vez, e tratar isso como uma edição só — do primeiro ao último ponto —
 * apagaria todas as marcas que estivessem no meio do caminho, sem ninguém ter
 * pedido. As edições são aplicadas de trás para a frente, então cada uma vê os
 * índices ainda no sistema de coordenadas antigo.
 */
export function remapearMarcas(marcas: Marca[], edicoes: Edicao[]): Marca[] {
  if (marcas.length === 0) return marcas

  const ordenadas = [...edicoes].sort((a, b) => b.posicao - a.posicao)
  let fora = marcas.map((m) => ({ ...m }))

  for (const { posicao, removido, inserido } of ordenadas) {
    const fimDaEdicao = posicao + removido
    const delta = inserido - removido

    fora = fora.map((marca) => {
      // a edição acabou antes do começo da marca: ela inteira desliza
      if (fimDaEdicao <= marca.de) {
        // inserir EXATAMENTE no começo empurra a marca para a frente em vez de
        // engoli-la — é a regra do "digitar logo antes não cresce"
        return { ...marca, de: marca.de + delta, ate: marca.ate + delta }
      }

      // a edição começou depois do fim da marca: nada muda...
      if (posicao >= marca.ate) {
        // ...exceto colar/digitar EXATAMENTE no fim, que continua a palavra
        if (posicao === marca.ate && removido === 0) {
          return { ...marca, ate: marca.ate + inserido }
        }
        return marca
      }

      // a edição cobre a marca inteira: ela morre
      if (posicao <= marca.de && fimDaEdicao >= marca.ate) {
        return { ...marca, de: 0, ate: 0 }
      }

      // a edição está toda dentro da marca: ela cresce ou encolhe junto
      if (posicao >= marca.de && fimDaEdicao <= marca.ate) {
        return { ...marca, ate: marca.ate + delta }
      }

      // comeu a ponta de cima: o que sobrou começa onde a edição terminou
      if (posicao < marca.de) {
        return { ...marca, de: posicao + inserido, ate: marca.ate + delta }
      }

      // comeu a ponta de baixo: o que sobrou termina onde a edição começou
      return { ...marca, ate: posicao }
    })
  }

  return fora.filter((m) => !marcaVazia(m))
}

/**
 * A edição que transforma um texto no outro, quando ela é uma só.
 *
 * Prefixo e sufixo em comum: o que sobra no meio é exatamente o que saiu e o
 * que entrou. Serve para digitar, apagar e colar — que são um ponto só.
 *
 * NÃO serve para "trocar todas", que mexe em vários pontos: ali a conta daria
 * uma edição gigante do primeiro ao último ponto, e levaria junto tudo o que
 * estivesse no meio. Quem troca todas conhece os pontos exatos e monta a lista
 * de edições à mão — por isso `remapearMarcas` recebe lista, e não uma.
 */
export function edicaoEntre(antigo: string, novo: string): Edicao | null {
  if (antigo === novo) return null

  let inicio = 0
  const menor = Math.min(antigo.length, novo.length)
  while (inicio < menor && antigo[inicio] === novo[inicio]) inicio += 1

  let fimA = antigo.length
  let fimN = novo.length
  while (fimA > inicio && fimN > inicio && antigo[fimA - 1] === novo[fimN - 1]) {
    fimA -= 1
    fimN -= 1
  }

  return { posicao: inicio, removido: fimA - inicio, inserido: fimN - inicio }
}

/** Junta o que a marca nova manda por cima do que já havia. */
function fundir(base: Marca, patch: Partial<Marca>): Marca {
  const junto: Marca = { ...base, ...patch }
  // `cor: undefined` no patch é "tirar a cor", e o spread não distingue isso de
  // "não mencionei a cor" — por isso a chave é conferida à mão
  if ('cor' in patch) junto.cor = patch.cor
  return junto
}

/**
 * Aplica cor/formatação sobre um trecho, respeitando o que já estava lá.
 *
 * O trecho pedido é recortado das marcas que ele cruza, e uma marca nova cobre
 * exatamente ele. Assim pintar metade de uma palavra já negrito devolve duas
 * marcas — a metade só negrito e a metade negrito e colorida — em vez de
 * perder o negrito ou pintar a palavra toda.
 */
export function aplicarMarca(marcas: Marca[], de: number, ate: number, patch: Partial<Marca>): Marca[] {
  if (ate <= de) return marcas

  const fora: Marca[] = []
  let dentro: Marca | null = null

  for (const marca of marcas) {
    // fora do trecho: passa intacta
    if (marca.ate <= de || marca.de >= ate) {
      fora.push(marca)
      continue
    }
    // o pedaço que sobra antes do trecho
    if (marca.de < de) fora.push({ ...marca, ate: de })
    // o pedaço que sobra depois
    if (marca.ate > ate) fora.push({ ...marca, de: ate })
    // o miolo empresta o que tinha para a marca nova — a primeira que cruzar
    // manda, e é a escolha certa: quem pinta uma seleção quer UM resultado, não
    // uma colcha do que havia embaixo
    if (!dentro) dentro = fundir({ ...marca, de, ate }, patch)
  }

  fora.push(dentro ?? fundir({ de, ate }, patch))
  return fora.filter((m) => !marcaVazia(m)).sort((a, b) => a.de - b.de)
}

/** Tira toda a marcação de um trecho — o conta-gotas pontilhado e o "limpar". */
export function limparMarcas(marcas: Marca[], de: number, ate: number): Marca[] {
  if (ate <= de) return marcas
  const fora: Marca[] = []
  for (const marca of marcas) {
    if (marca.ate <= de || marca.de >= ate) {
      fora.push(marca)
      continue
    }
    if (marca.de < de) fora.push({ ...marca, ate: de })
    if (marca.ate > ate) fora.push({ ...marca, de: ate })
  }
  return fora.filter((m) => !marcaVazia(m)).sort((a, b) => a.de - b.de)
}

/**
 * As marcas de uma fatia do bloco, com os índices contados a partir dela.
 *
 * É o que a composição de linhas precisa: uma marca que atravessa a quebra de
 * linha vira duas, uma em cada linha, cada uma medida do começo da SUA linha.
 * Sem isto, a segunda metade da palavra pintada apareceria sem cor — ou pior,
 * pintaria o começo da linha seguinte.
 */
export function marcasDaFatia(marcas: Marca[], de: number, ate: number): Marca[] {
  const fora: Marca[] = []
  for (const marca of marcas) {
    const inicio = Math.max(marca.de, de)
    const fim = Math.min(marca.ate, ate)
    if (fim <= inicio) continue
    fora.push({ ...marca, de: inicio - de, ate: fim - de })
  }
  return fora
}
