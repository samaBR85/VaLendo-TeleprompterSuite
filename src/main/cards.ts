import { app, protocol, net } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Cartao } from '@shared/types'

export const PROTOCOLO = 'valendo'

/** Formatos que o Chromium desenha sem ajuda. */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif']

const TIPOS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif'
}

export function cardsDir(): string {
  const dir = join(app.getPath('userData'), 'cartoes')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function cardPath(arquivo: string): string {
  // só o nome do arquivo, nunca um caminho: um "arquivo" com ".." num projeto
  // vindo de fora leria o disco de quem abriu
  return join(cardsDir(), basename(arquivo))
}

/**
 * Copia a imagem escolhida para dentro da pasta do app.
 *
 * Guardar o caminho de origem parecia mais simples, mas quebra sozinho: o
 * operador move a pasta das artes, esvazia a área de trabalho, ou traz o
 * projeto de outra máquina — e no meio do programa o cartão não aparece. A
 * cópia é a diferença entre um cartão que existe e um que existia.
 */
export function importCardImage(origem: string, id: string): string {
  const ext = (extname(origem) || '.png').toLowerCase()
  const arquivo = `${id}${ext}`
  writeFileSync(cardPath(arquivo), readFileSync(origem))
  return arquivo
}

/** Grava bytes que vieram de dentro de um .valendo. */
export function writeCardImage(arquivo: string, dados: Buffer): void {
  writeFileSync(cardPath(arquivo), dados)
}

export function readCardImage(arquivo: string): Buffer | null {
  const caminho = cardPath(arquivo)
  return existsSync(caminho) ? readFileSync(caminho) : null
}

export function deleteCardImage(arquivo: string): void {
  try {
    rmSync(cardPath(arquivo), { force: true })
  } catch {
    // apagar é higiene, não requisito: se o arquivo estiver preso, o cartão
    // já saiu da lista e o que sobra é um resto que ninguém vê
  }
}

/**
 * Apaga imagens que nenhum cartão referencia mais.
 *
 * Abrir um projeto troca a lista inteira de cartões, e sem esta varredura a
 * pasta cresceria para sempre com as artes de todos os programas já abertos.
 */
export function pruneCardImages(cards: Cartao[]): void {
  const usados = new Set(cards.filter((c) => c.kind === 'image').map((c) => c.arquivo))
  for (const nome of readdirSync(cardsDir())) {
    if (!usados.has(nome)) deleteCardImage(nome)
  }
}

/**
 * `valendo://cartao/<arquivo>` para o renderer desenhar a imagem.
 *
 * `file://` não serve: em desenvolvimento a janela é servida por http, e o
 * Chromium bloqueia http lendo file. Um protocolo próprio funciona igual nos
 * dois, e não abre o disco inteiro — só esta pasta.
 */
export function registerCardProtocol(): void {
  protocol.handle(PROTOCOLO, (request) => {
    const url = new URL(request.url)
    if (url.hostname !== 'cartao') return new Response('não encontrado', { status: 404 })

    const arquivo = basename(decodeURIComponent(url.pathname).replace(/^\//, ''))
    const caminho = cardPath(arquivo)
    if (!arquivo || !existsSync(caminho)) return new Response('não encontrado', { status: 404 })

    return net.fetch(pathToFileURL(caminho).toString(), { headers: { 'Cache-Control': 'no-store' } })
  })
}

/** Declarado antes de o app ficar pronto, senão o protocolo não vale como seguro. */
export function registerCardScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: PROTOCOLO, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
  ])
}

export function cardMimeType(arquivo: string): string {
  return TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream'
}
