import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ajudaDe, ajudaEn, temAjuda, type Ajuda } from './index'

/* `as const` deixa cada entrada com o tipo literal dela, então quem não tem
   `comando` não tem a propriedade — esta visão uniforme é só para varrer. */
const TODAS = ajudaEn as Record<string, Ajuda>

/** Todo .ts/.tsx do renderer e do shared, para varrer os usos de verdade. */
function fontes(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) fontes(caminho, acc)
    else if (/\.tsx?$/.test(entrada.name) && !entrada.name.endsWith('.test.ts')) acc.push(caminho)
  }
  return acc
}

const CODIGO = fontes(join(process.cwd(), 'src', 'renderer'))
  .concat(fontes(join(process.cwd(), 'src', 'shared')))
  .map((p) => readFileSync(p, 'utf-8'))
  .join('\n')

describe('o dicionário da Ajuda rápida', () => {
  it('não guarda texto de controle que não existe mais', () => {
    /*
     * O risco real desta ajuda é o mesmo que ela veio consertar: a dica antiga
     * da coluna descrevia uma barra que já tinha sido reorganizada. Aqui, um
     * controle que sai do app deixa a entrada órfã — e é este teste que avisa,
     * em vez de o texto seguir vivo descrevendo um botão que ninguém vê.
     */
    const orfas = Object.keys(ajudaEn).filter((id) => !CODIGO.includes(`'${id}'`) && !CODIGO.includes(`"${id}"`))
    expect(orfas).toEqual([])
  })

  it('cabe na caixa de altura fixa', () => {
    // 200 caracteres é o que coube na medição: o texto mais longo desse
    // tamanho ocupa cinco linhas na coluna mais estreita (180px), que é a
    // altura para a qual a caixa foi dimensionada em `Sidebar.tsx`
    for (const [id, { texto }] of Object.entries(TODAS)) {
      expect(texto.length, `${id}: ${texto.length} caracteres`).toBeLessThanOrEqual(200)
    }
  })

  it('tem nome curto o bastante para virar tooltip', () => {
    for (const [id, { nome }] of Object.entries(TODAS)) {
      expect(nome.length, `${id}: "${nome}"`).toBeLessThanOrEqual(40)
      expect(nome.trim().length, id).toBeGreaterThan(0)
    }
  })

  it('só aponta comandos que existem', async () => {
    const { COMMANDS } = await import('../commands')
    const ids = new Set(COMMANDS.map((c) => c.id))
    for (const [id, { comando }] of Object.entries(TODAS)) {
      if (comando) expect(ids.has(comando), `${id} → ${comando}`).toBe(true)
    }
  })
})

describe('a reserva no inglês', () => {
  it('responde em qualquer idioma enquanto a tradução não existe', () => {
    // é isto que permite escrever só o inglês agora: nenhum idioma fica com a
    // caixa vazia por não ter sido traduzido ainda
    expect(ajudaDe('pt-BR', 'transport.playPause').nome).toBe(ajudaEn['transport.playPause'].nome)
    expect(ajudaDe('de', 'ar.blackout').texto.length).toBeGreaterThan(0)
  })

  it('reconhece um id de verdade e recusa um inventado', () => {
    expect(temAjuda('transport.playPause')).toBe(true)
    expect(temAjuda('transport.naoExiste')).toBe(false)
  })
})
