import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ProjetoRecente } from '@shared/api'

/**
 * Os últimos projetos abertos ou salvos, gravados por MÁQUINA.
 *
 * Arquivo próprio, e não `AppState`: o estado inteiro viaja dentro do
 * `.valendo`, e mandar um projeto para um colega levaria junto a lista dos
 * caminhos do seu disco — nomes de clientes, pastas de trabalho, a estrutura da
 * sua máquina. Isso não é do programa, é de quem opera.
 *
 * Cinco é o teto porque é uma lista para RECONHECER, não para procurar: acima
 * disso o operador lê em vez de bater o olho, e para procurar já existe o
 * diálogo de abrir.
 */
export const RECENTES_MAX = 5

/**
 * O nome como a pessoa chama o projeto: sem a pasta e SEM a extensão.
 *
 * A lista só tem `.valendo` — a extensão não distingue um item do outro, e o
 * chip existe para ser reconhecido de relance. "PROGRAMETES - 2608" é o que o
 * operador diria em voz alta; ".valendo" é ruído em cima disso, e é também o
 * nome que o cabeçalho do app já mostra, sem extensão.
 *
 * A remoção ignora maiúsculas porque no Windows o arquivo pode estar gravado
 * como `X.VALENDO` — a mesma razão pela qual a lista compara caminhos sem
 * diferenciar caixa.
 */
function nomeDoProjeto(caminho: string): string {
  return basename(caminho).replace(/\.valendo$/i, '')
}

function recentesPath(dir: string): string {
  return join(dir, 'recentes.json')
}

/**
 * A lista, já sem o que não existe mais.
 *
 * A limpeza acontece na LEITURA, e não na gravação: o arquivo pode ter sido
 * movido, renomeado ou apagado com o app fechado, e oferecer um atalho que
 * abre um erro é pior do que não oferecer atalho nenhum.
 */
export function loadRecentes(dir: string): ProjetoRecente[] {
  const path = recentesPath(dir)
  if (!existsSync(path)) return []
  try {
    const saved = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (!Array.isArray(saved)) return []
    return saved
      .filter((item): item is ProjetoRecente => typeof (item as ProjetoRecente)?.caminho === 'string')
      .filter((item) => existsSync(item.caminho))
      .slice(0, RECENTES_MAX)
      .map((item) => ({ caminho: item.caminho, nome: nomeDoProjeto(item.caminho) }))
  } catch {
    return []
  }
}

/** Grava em .tmp e renomeia, como os outros arquivos do app. */
function save(dir: string, lista: ProjetoRecente[]): void {
  const path = recentesPath(dir)
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${JSON.stringify(lista, null, 2)}\n`, 'utf8')
  renameSync(tmp, path)
}

/**
 * Põe este projeto no topo da lista. Serve tanto para abrir quanto para salvar.
 *
 * A comparação de caminho é sem diferenciar maiúsculas porque no Windows
 * `C:\Roteiros\x.valendo` e `c:\roteiros\X.VALENDO` são o mesmo arquivo — sem
 * isso o mesmo projeto apareceria duas vezes na lista, com grafias diferentes.
 */
export function registrarRecente(dir: string, caminho: string): ProjetoRecente[] {
  const chave = caminho.toLowerCase()
  const anterior = loadRecentes(dir).filter((item) => item.caminho.toLowerCase() !== chave)
  const lista = [{ caminho, nome: nomeDoProjeto(caminho) }, ...anterior].slice(0, RECENTES_MAX)
  try {
    save(dir, lista)
  } catch {
    // a lista é conveniência; não conseguir gravá-la não pode atrapalhar o
    // salvamento do projeto, que é o que realmente importava naquele clique
  }
  return lista
}

/** Esvazia a lista — o operador que trabalha em máquina emprestada precisa disso. */
export function limparRecentes(dir: string): void {
  try {
    save(dir, [])
  } catch {
    // idem
  }
}
