import { app, protocol } from 'electron'
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { extname, join, basename } from 'node:path'
import { conteudoDaFaixa, faixaPedida, tamanhoDaFaixa } from '@shared/range'
import { tipoDoVideo } from '@shared/video'
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
 * Onde ficam os vídeos que o operador autorizou.
 *
 * Referenciar em vez de copiar tem um preço: o protocolo passa a poder abrir
 * arquivo de qualquer lugar do disco, e a página da rede local serve para
 * quem estiver no wifi. Sem trava, um projeto vindo de fora poderia apontar um
 * cartão para um documento seu e publicá-lo no ar.
 *
 * A trava é esta lista: só vale caminho que o operador escolheu ele mesmo na
 * janela de abrir arquivo, nesta máquina. Um `.valendo` de outra pessoa carrega
 * o caminho escrito, mas ele não vale nada até alguém apontar o arquivo — e aí
 * quem autorizou foi uma pessoa, não um arquivo.
 */
function registroPath(): string {
  return join(app.getPath('userData'), 'videos.json')
}

function lerAutorizados(): Set<string> {
  try {
    const cru = JSON.parse(readFileSync(registroPath(), 'utf8')) as { caminhos?: unknown }
    if (!Array.isArray(cru.caminhos)) return new Set()
    return new Set(cru.caminhos.filter((c): c is string => typeof c === 'string').map(normalizar))
  } catch {
    // sem arquivo, arquivo corrompido, disco ocupado: nada autorizado ainda,
    // que é o estado seguro — o operador reaponta e volta ao normal
    return new Set()
  }
}

/** No Windows o mesmo arquivo aparece com maiúsculas diferentes e com / ou \. */
function normalizar(caminho: string): string {
  const trocado = caminho.replace(/\\/g, '/')
  return process.platform === 'win32' ? trocado.toLowerCase() : trocado
}

export function autorizarVideo(caminho: string): void {
  const lista = lerAutorizados()
  lista.add(normalizar(caminho))
  try {
    writeFileSync(registroPath(), JSON.stringify({ caminhos: [...lista] }, null, 2))
  } catch {
    // não poder gravar a autorização não pode impedir o vídeo desta sessão de
    // tocar: o operador acabou de escolher o arquivo na frente do app
  }
}

export function videoAutorizado(caminho: string): boolean {
  return lerAutorizados().has(normalizar(caminho))
}

/** O arquivo existe, está autorizado e dá para servir. */
export function videoVinculado(caminho: string): boolean {
  return Boolean(caminho) && videoAutorizado(caminho) && existsSync(caminho)
}

/**
 * Onde ficam as cópias tocáveis dos vídeos que não tocam direto.
 *
 * Separada da pasta das imagens porque a limpeza é outra: imagem órfã se
 * apaga a cada projeto aberto, e uma conversão que custou minutos de
 * recodificação não pode evaporar só porque o operador abriu outro programa.
 */
export function convertidosDir(): string {
  const dir = join(app.getPath('userData'), 'convertidos')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function convertidoPath(arquivo: string): string {
  return join(convertidosDir(), basename(arquivo))
}

export function deleteVideoConversion(arquivo: string): void {
  try {
    rmSync(convertidoPath(arquivo), { force: true })
  } catch {
    // apagar é higiene: se o arquivo estiver preso, o cartão já saiu da lista
  }
}

/**
 * O arquivo convertido existe mesmo no disco.
 *
 * O cartão guarda o NOME da cópia, e nome não é prova: o operador pode ter
 * limpado a pasta, ou o projeto pode ter vindo de outra máquina com o nome
 * escrito e nada por trás. Sem conferir o disco, a fila olhava só o perfil
 * anotado, concluía "já está feita" e nunca refazia.
 */
export function conversaoExiste(arquivo: string): boolean {
  return existsSync(convertidoPath(arquivo))
}

/** Apaga conversões que nenhum cartão do projeto aberto referencia. */
export function pruneVideoConversions(cards: Cartao[]): void {
  const usados = new Set(
    cards.flatMap((c) =>
      c.kind === 'video' ? [c.convertido, c.proxy?.arquivo].filter((n): n is string => Boolean(n)) : []
    )
  )
  for (const nome of readdirSync(convertidosDir())) {
    if (!usados.has(nome)) deleteVideoConversion(nome)
  }
}

/**
 * De id de cartão para caminho no disco.
 *
 * O renderer nunca vê caminho de arquivo numa URL — pede `valendo://video/<id>`
 * e quem traduz é o main, consultando o estado. Assim não existe URL que possa
 * ser forjada para ler outro arquivo, nem caminho de disco vazando para a
 * página que a rede local serve.
 */
let resolverVideo: (cardId: string) => { caminho: string; convertido?: string; proxy?: string } | null = () =>
  null

export function registerVideoResolver(
  fn: (cardId: string) => { caminho: string; convertido?: string; proxy?: string } | null
): void {
  resolverVideo = fn
}

/**
 * O arquivo que vai de fato ser servido.
 *
 * Quando existe uma conversão, é ela que toca — mas a autorização continua
 * valendo pelo original, que é o que o operador escolheu na janela de abrir.
 * A conversão nasceu de dentro do app; autorizá-la à parte não acrescentaria
 * segurança nenhuma e criaria um segundo caminho por onde algo poderia entrar.
 */
export function caminhoDoVideo(cardId: string): string | null {
  const card = resolverVideo(cardId)
  if (!card || !videoAutorizado(card.caminho)) return null

  if (card.convertido) {
    const convertido = convertidoPath(card.convertido)
    return existsSync(convertido) ? convertido : null
  }
  return existsSync(card.caminho) ? card.caminho : null
}

/**
 * O arquivo que a REDE deve receber.
 *
 * Separado de `caminhoDoVideo` de propósito: a tela do apresentador recebe
 * sempre o original, porque ali não há rede no caminho. Só a página de
 * conferência ganha a cópia leve — e enquanto ela não existe, a rede recebe o
 * original, que é pesado mas funciona. Nunca deixar de servir por causa disso.
 */
export function caminhoDoVideoNaRede(cardId: string): string | null {
  const card = resolverVideo(cardId)
  if (!card || !videoAutorizado(card.caminho)) return null

  if (card.proxy) {
    const leve = convertidoPath(card.proxy)
    if (existsSync(leve)) return leve
  }
  return caminhoDoVideo(cardId)
}

/** O cartão tem um arquivo tocável agora, aqui. */
export function videoPronto(card: { caminho: string; convertido?: string }): boolean {
  if (!videoAutorizado(card.caminho)) return false
  return existsSync(card.convertido ? convertidoPath(card.convertido) : card.caminho)
}

/**
 * Serve um arquivo respondendo a pedido de faixa de bytes.
 *
 * Entregar sempre o arquivo inteiro basta para foto e não basta para vídeo:
 * sem esta resposta o tocador conclui que ali não dá para pular e a barra
 * volta ao zero a cada arrasto. Medido — o trecho navegável vinha vazio.
 */
function servirComFaixa(caminho: string, tipo: string, rangeHeader: string | null): Response {
  const tamanho = statSync(caminho).size
  const faixa = faixaPedida(rangeHeader, tamanho)

  const comuns = {
    'Content-Type': tipo,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    /*
     * Para o app poder tirar um quadro do vídeo e usar como miniatura.
     *
     * Sem este cabeçalho o desenho do vídeo num canvas fica marcado como de
     * outra origem e o navegador proíbe ler os pixels de volta — a miniatura
     * morreria com erro de segurança. Não abre nada: uma página da web não
     * tem como pedir `valendo://`, que só existe dentro deste app.
     */
    'Access-Control-Allow-Origin': '*'
  }

  if (faixa === 'invalida') {
    return new Response(null, { status: 416, headers: { ...comuns, 'Content-Range': `bytes */${tamanho}` } })
  }

  const inicio = faixa ? faixa.inicio : 0
  const fim = faixa ? faixa.fim : tamanho - 1
  const corpo = Readable.toWeb(createReadStream(caminho, { start: inicio, end: fim })) as ReadableStream

  return new Response(corpo, {
    status: faixa ? 206 : 200,
    headers: {
      ...comuns,
      'Content-Length': String(faixa ? tamanhoDaFaixa(faixa) : tamanho),
      ...(faixa ? { 'Content-Range': conteudoDaFaixa(faixa, tamanho) } : {})
    }
  })
}

/**
 * `valendo://cartao/<arquivo>` para a imagem, `valendo://video/<id>` para o vídeo.
 *
 * `file://` não serve: em desenvolvimento a janela é servida por http, e o
 * Chromium bloqueia http lendo file. Um protocolo próprio funciona igual nos
 * dois, e não abre o disco inteiro — só esta pasta e os vídeos autorizados.
 */
export function registerCardProtocol(): void {
  protocol.handle(PROTOCOLO, (request) => {
    const url = new URL(request.url)
    const pedido = decodeURIComponent(url.pathname).replace(/^\//, '')
    const range = request.headers.get('range')

    if (url.hostname === 'video') {
      const caminho = caminhoDoVideo(basename(pedido))
      if (!caminho) return new Response('não encontrado', { status: 404 })
      return servirComFaixa(caminho, tipoDoVideo(caminho), range)
    }

    if (url.hostname !== 'cartao') return new Response('não encontrado', { status: 404 })

    const arquivo = basename(pedido)
    const caminho = cardPath(arquivo)
    if (!arquivo || !existsSync(caminho)) return new Response('não encontrado', { status: 404 })

    return servirComFaixa(caminho, cardMimeType(arquivo), range)
  })
}

/** Declarado antes de o app ficar pronto, senão o protocolo não vale como seguro. */
export function registerCardScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PROTOCOLO,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        // sem isto, pedir o vídeo com `crossOrigin` nem carrega, e pedir sem
        // ele carrega mas deixa o canvas marcado como de outra origem — nos
        // dois casos não há como tirar um quadro para servir de miniatura
        corsEnabled: true
      }
    }
  ])
}

export function cardMimeType(arquivo: string): string {
  return TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream'
}
