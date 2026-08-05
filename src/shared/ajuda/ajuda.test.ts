import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ajudaDe, ajudaEn, temAjuda, type Ajuda } from './index'
import { ajudaPt } from './pt'
import { ajudaEs } from './es'
import { ajudaDe as ajudaDeDicionario } from './de'
import { ajudaFr } from './fr'
import { ajudaIt } from './it'

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

describe('os cinco dicionários traduzidos', () => {
  const DICIONARIOS: [string, Partial<Record<string, Ajuda>>][] = [
    ['pt-BR', ajudaPt],
    ['es', ajudaEs],
    ['de', ajudaDeDicionario],
    ['fr', ajudaFr],
    ['it', ajudaIt]
  ]

  it('têm exatamente as mesmas chaves do inglês, nem uma a mais nem a menos', () => {
    const chavesEn = Object.keys(ajudaEn).sort()
    for (const [lang, dicionario] of DICIONARIOS) {
      expect(Object.keys(dicionario).sort(), lang).toEqual(chavesEn)
    }
  })

  it('nunca traduzem o campo `comando` — é um id de código, não texto', () => {
    for (const [lang, dicionario] of DICIONARIOS) {
      for (const [id, entrada] of Object.entries(TODAS)) {
        expect(dicionario[id]?.comando, `${lang} → ${id}`).toBe(entrada.comando)
      }
    }
  })

  it('já respondem com a própria tradução, e não caem mais na reserva', () => {
    // se isto voltar a ser igual ao inglês, ou a chave sumiu do dicionário
    // traduzido ou a entrada nunca foi escrita — os dois merecem alarme
    expect(ajudaDe('pt-BR', 'transport.playPause').nome).not.toBe(ajudaEn['transport.playPause'].nome)
    expect(ajudaDe('es', 'ar.blackout').texto.length).toBeGreaterThan(0)
  })
})

describe('a reserva no inglês', () => {
  it('ainda cobre uma chave que falte num idioma traduzido', async () => {
    // os seis dicionários estão completos hoje, mas a reserva existe para o
    // dia em que uma chave nova nascer em `en.ts` antes de chegar aos outros
    // cinco — simulado aqui com um dicionário parcial, sem tocar nos de verdade
    vi.resetModules()
    vi.doMock('./de', () => ({
      ajudaDe: { 'ar.blackout': { nome: 'Prova', texto: 'Só esta chave existe neste teste.' } }
    }))
    const { ajudaDe: ajudaDeComReserva, ajudaEn: enDepoisDoMock } = await import('./index')
    expect(ajudaDeComReserva('de', 'ar.blackout').nome).toBe('Prova')
    expect(ajudaDeComReserva('de', 'transport.playPause').nome).toBe(enDepoisDoMock['transport.playPause'].nome)
    vi.doUnmock('./de')
    vi.resetModules()
  })

  it('reconhece um id de verdade e recusa um inventado', () => {
    expect(temAjuda('transport.playPause')).toBe(true)
    expect(temAjuda('transport.naoExiste')).toBe(false)
  })
})
