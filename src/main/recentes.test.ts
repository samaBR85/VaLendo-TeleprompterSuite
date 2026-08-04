import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadRecentes, registrarRecente } from './recentes'

/**
 * A lista dos últimos projetos.
 *
 * `recentes.ts` recebe a pasta por parâmetro em vez de perguntar ao Electron,
 * e é isso que deixa cobri-la com arquivos de verdade num diretório temporário
 * — sem mock nenhum, testando o que roda.
 */
function pasta(): string {
  return mkdtempSync(join(tmpdir(), 'valendo-recentes-'))
}

/** Um `.valendo` que existe no disco: a lista descarta o que sumiu. */
function projeto(dir: string, nomeDoArquivo: string): string {
  const caminho = join(dir, nomeDoArquivo)
  writeFileSync(caminho, '{}', 'utf8')
  return caminho
}

describe('o nome que aparece no chip', () => {
  it('não traz a extensão', () => {
    // ".valendo" não distingue um item do outro numa lista só de .valendo, e o
    // cabeçalho do app já mostra o mesmo projeto sem ela
    const dir = pasta()
    const lista = registrarRecente(dir, projeto(dir, 'PROGRAMETES - 2608.valendo'))
    expect(lista[0].nome).toBe('PROGRAMETES - 2608')
  })

  it('nem quando a extensão está em maiúsculas', () => {
    // no Windows o mesmo arquivo pode estar gravado como .VALENDO
    const dir = pasta()
    const lista = registrarRecente(dir, projeto(dir, 'Piloto.VALENDO'))
    expect(lista[0].nome).toBe('Piloto')
  })

  it('não corta um ponto que faz parte do nome', () => {
    // só o sufixo sai; "Ep. 3" continua sendo "Ep. 3"
    const dir = pasta()
    const lista = registrarRecente(dir, projeto(dir, 'Ep. 3 - final.valendo'))
    expect(lista[0].nome).toBe('Ep. 3 - final')
  })

  it('vale também para a lista relida do disco', () => {
    // o nome é DERIVADO do caminho a cada leitura, e não lido do arquivo: uma
    // lista gravada por uma versão anterior (com a extensão dentro) tem de
    // aparecer limpa mesmo assim, sem migração nenhuma
    const dir = pasta()
    const caminho = projeto(dir, 'Estúdio.valendo')
    writeFileSync(
      join(dir, 'recentes.json'),
      JSON.stringify([{ caminho, nome: 'Estúdio.valendo' }]),
      'utf8'
    )
    expect(loadRecentes(dir)[0].nome).toBe('Estúdio')
  })

  it('o caminho inteiro continua ali, que é o que abre o arquivo', () => {
    const dir = pasta()
    const caminho = projeto(dir, 'Aberto.valendo')
    expect(registrarRecente(dir, caminho)[0].caminho).toBe(caminho)
  })
})
