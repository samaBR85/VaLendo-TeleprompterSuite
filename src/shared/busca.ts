/**
 * Procurar no roteiro — a conta, longe da tela.
 *
 * Mora aqui, e não dentro do editor, por uma razão de segurança e não de
 * arrumação: o resultado desta busca vira `setSelectionRange` num `textarea`,
 * e ali os índices são posições EXATAS. Um índice deslocado por um não
 * "seleciona quase certo" — seleciona a palavra errada, e num roteiro no ar
 * quem descobre é o apresentador.
 *
 * Por isso a dobra de maiúsculas e acentos é feita caractere a caractere, com
 * o tamanho garantido: normalizar a string inteira com `NFD` seria mais curto
 * de escrever e mudaria o comprimento em alguns casos, e todo índice depois do
 * primeiro acento passaria a apontar para o lugar errado.
 */

/**
 * A forma comparável de um texto: sem acento, sem caixa — e do MESMO tamanho.
 *
 * Ignorar acento é decisão de ofício, não capricho: quem procura "acao" num
 * roteiro em português quer achar "ação", e no meio de um programa ninguém
 * para para lembrar onde estava o til. Vale para as seis línguas do app, que
 * são todas latinas.
 *
 * Cada caractere só é trocado quando a troca cabe no mesmo espaço; o que não
 * couber fica como está. Perder uma ocorrência exótica é barato, deslocar
 * todos os índices depois dela não é.
 */
export function dobrar(texto: string): string {
  let fora = ''
  for (const ch of texto) {
    const semAcento = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const candidato = (semAcento.length === ch.length ? semAcento : ch).toLowerCase()
    fora += candidato.length === ch.length ? candidato : ch
  }
  return fora
}

export interface Ocorrencia {
  inicio: number
  fim: number
}

/**
 * Onde a agulha aparece no palheiro, na ordem, sem se sobrepor.
 *
 * Sem sobreposição porque é o que todo editor faz: procurar "aa" em "aaaa"
 * acha duas, não três. Quem aperta "próxima" espera atravessar o texto, não
 * andar um caractere.
 */
export function acharTodas(texto: string, agulha: string): Ocorrencia[] {
  if (agulha === '') return []
  const palheiro = dobrar(texto)
  const alvo = dobrar(agulha)
  const fora: Ocorrencia[] = []
  let de = 0
  for (;;) {
    const i = palheiro.indexOf(alvo, de)
    if (i === -1) return fora
    fora.push({ inicio: i, fim: i + alvo.length })
    de = i + alvo.length
  }
}

/**
 * Qual ocorrência é a "próxima", partindo de onde o cursor está.
 *
 * Dá a volta nas duas pontas: chegar ao fim e continuar apertando devolve à
 * primeira. É o que a mão espera, e evita o beco sem saída de "não achei mais"
 * quando o que falta está acima do cursor.
 *
 * Indo para a frente, uma ocorrência que COMEÇA no cursor conta como próxima —
 * é ela que acabou de ser selecionada quando se abre a busca em cima de uma
 * palavra. Indo para trás, não: senão "anterior" ficaria parado nela.
 */
export function indiceDaProxima(
  ocorrencias: Ocorrencia[],
  cursor: number,
  paraTras = false
): number {
  if (ocorrencias.length === 0) return -1
  if (paraTras) {
    for (let i = ocorrencias.length - 1; i >= 0; i -= 1) {
      if (ocorrencias[i].inicio < cursor) return i
    }
    return ocorrencias.length - 1
  }
  for (let i = 0; i < ocorrencias.length; i += 1) {
    if (ocorrencias[i].inicio >= cursor) return i
  }
  return 0
}

/**
 * Quais achados um "pintar todas" deve deixar em paz.
 *
 * O interruptor SPEECH do operador: por padrão, pintar todas as ocorrências
 * NÃO encosta nas que caem numa fala já colorida por um apresentador. É o
 * padrão certo porque a cor do apresentador é um sistema — quem lê a tela
 * associou aquela cor àquela pessoa —, e uma pintura em massa que atropela
 * isso desmancha o sistema inteiro num clique, sem aviso.
 *
 * Ligado, pinta por cima também. A marca manual sempre ganha da cor do dono na
 * hora de desenhar; o que este interruptor decide é se ela chega a existir.
 *
 * `donosDasLinhas` vem de `coresDasLinhas` — uma cor (ou `null`) por linha do
 * texto, na ordem. A linha de um achado sai de contar as quebras antes dele.
 */
export function achadosParaPintar(
  achados: Ocorrencia[],
  texto: string,
  donosDasLinhas: (string | null)[],
  sobrescrever: boolean
): Ocorrencia[] {
  if (sobrescrever) return achados
  return achados.filter((a) => {
    let linha = 0
    for (let i = 0; i < a.inicio && i < texto.length; i++) if (texto[i] === '\n') linha += 1
    return !donosDasLinhas[linha]
  })
}
