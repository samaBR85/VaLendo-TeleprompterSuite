import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import { basename, extname, join, normalize } from 'node:path'
import type { WebviewFrame, WebviewInfo } from '@shared/api'
import { conteudoDaFaixa, faixaPedida, tamanhoDaFaixa } from '@shared/range'
import { tipoDoVideo } from '@shared/video'
import { cardMimeType, cardPath, caminhoDoVideoNaRede } from './cards'

export const WEBVIEW_PORT = 7777

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
}

/** Onde ficam os arquivos que o vite construiu. */
function rendererDir(): string {
  return join(__dirname, '../renderer')
}

let server: Server | null = null
let error: string | null = null
let onChange: (() => void) | null = null

/**
 * O main usa isto para reemitir o estado quando o servidor muda por conta
 * própria.
 *
 * `listen` falha de forma assíncrona: quando o erro chega, o instantâneo já foi
 * mandado para a tela, e sem este aviso o operador veria o botão verde e
 * nenhum endereço, sem nada explicando por quê.
 */
export function onWebviewChange(handler: () => void): void {
  onChange = handler
}
const clientes = new Set<ServerResponse>()
let ultimoQuadro: WebviewFrame | null = null
let batida: NodeJS.Timeout | null = null

/**
 * Endereços em que a página responde, prontos para digitar num telefone.
 *
 * Só IPv4 e só de rede de verdade: `127.0.0.1` só funciona nesta máquina, e
 * IPv6 ninguém digita.
 */
export function addresses(): string[] {
  const encontrados: string[] = []
  for (const placas of Object.values(networkInterfaces())) {
    for (const placa of placas ?? []) {
      if (placa.family === 'IPv4' && !placa.internal) encontrados.push(placa.address)
    }
  }
  return encontrados
}

export function webviewInfo(): WebviewInfo {
  return { running: server !== null, port: WEBVIEW_PORT, addresses: addresses(), error }
}

function servirArquivo(caminhoPedido: string, res: ServerResponse): void {
  // normaliza e prende dentro da pasta do renderer: sem isso, um pedido com
  // ".." leria qualquer arquivo do disco de quem está transmitindo
  const raiz = rendererDir()
  const alvo = normalize(join(raiz, caminhoPedido))
  if (!alvo.startsWith(raiz) || !existsSync(alvo)) {
    res.writeHead(404).end('não encontrado')
    return
  }

  res.writeHead(200, {
    'Content-Type': TIPOS[extname(alvo)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store'
  })
  createReadStream(alvo).pipe(res)
}

function abrirFluxo(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive'
  })
  clientes.add(res)
  res.on('close', () => clientes.delete(res))
  if (ultimoQuadro) enviar(res, ultimoQuadro)
}

function enviar(res: ServerResponse, quadro: WebviewFrame): void {
  res.write(`data: ${JSON.stringify({ ...quadro, now: Date.now() })}\n\n`)
}

/** Manda o quadro para quem está assistindo. Chamado a cada mudança de estado. */
export function publish(quadro: WebviewFrame): void {
  ultimoQuadro = quadro
  for (const cliente of clientes) enviar(cliente, quadro)
}

/**
 * Entrega o arquivo, ou só o pedaço pedido.
 *
 * Sem responder a pedido de faixa, o celular que abre a página não consegue
 * arrastar a barra do vídeo — o tocador precisa poder pedir o trecho do meio e
 * receber justamente aquele trecho, com a conta de quanto é de quanto.
 */
function servirComFaixa(alvo: string, tipo: string, req: IncomingMessage, res: ServerResponse): void {
  const tamanho = statSync(alvo).size
  const faixa = faixaPedida(req.headers.range, tamanho)

  if (faixa === 'invalida') {
    res.writeHead(416, { 'Content-Range': `bytes */${tamanho}`, 'Accept-Ranges': 'bytes' }).end()
    return
  }

  const inicio = faixa ? faixa.inicio : 0
  const fim = faixa ? faixa.fim : tamanho - 1
  res.writeHead(faixa ? 206 : 200, {
    'Content-Type': tipo,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Content-Length': String(faixa ? tamanhoDaFaixa(faixa) : tamanho),
    ...(faixa ? { 'Content-Range': conteudoDaFaixa(faixa, tamanho) } : {})
  })
  createReadStream(alvo, { start: inicio, end: fim }).pipe(res)
}

function atender(req: IncomingMessage, res: ServerResponse): void {
  const caminho = (req.url ?? '/').split('?')[0]

  if (caminho === '/estado') {
    abrirFluxo(res)
    return
  }
  if (caminho === '/' || caminho === '/index.html') {
    servirArquivo('webview.html', res)
    return
  }
  // as imagens dos cartões: quem confere pela rede precisa ver o mesmo
  // standby que está na tela do apresentador
  if (caminho.startsWith('/cartao/')) {
    const arquivo = basename(decodeURIComponent(caminho.slice('/cartao/'.length)))
    const alvo = cardPath(arquivo)
    if (!arquivo || !existsSync(alvo)) {
      res.writeHead(404).end('não encontrado')
      return
    }
    servirComFaixa(alvo, cardMimeType(arquivo), req, res)
    return
  }

  // o vídeo do cartão, pelo id — nunca pelo caminho no disco, que não sai
  // daqui. Só o que o operador autorizou nesta máquina chega até a rede.
  if (caminho.startsWith('/video/')) {
    const alvo = caminhoDoVideoNaRede(basename(decodeURIComponent(caminho.slice('/video/'.length))))
    if (!alvo) {
      res.writeHead(404).end('não encontrado')
      return
    }
    servirComFaixa(alvo, tipoDoVideo(alvo), req, res)
    return
  }

  if (caminho === '/favicon.ico') {
    res.writeHead(204).end()
    return
  }
  servirArquivo(caminho, res)
}

export function startWebview(): WebviewInfo {
  if (server) return webviewInfo()
  error = null

  const novo = createServer(atender)
  novo.on('error', (erro: NodeJS.ErrnoException) => {
    error =
      erro.code === 'EADDRINUSE'
        ? `A porta ${WEBVIEW_PORT} já está ocupada por outro programa nesta máquina.`
        : `Não deu para abrir a página na rede: ${erro.message}`
    server = null
    onChange?.()
  })

  novo.on('listening', () => onChange?.())
  novo.listen(WEBVIEW_PORT, '0.0.0.0')
  server = novo

  // batida de dois em dois segundos: mantém a conexão viva e reacerta o
  // relógio de quem assiste, que pode estar com a hora errada
  batida = setInterval(() => {
    if (ultimoQuadro) publish(ultimoQuadro)
  }, 2_000)

  return webviewInfo()
}

export function stopWebview(): void {
  if (batida) {
    clearInterval(batida)
    batida = null
  }

  /*
   * Um "acabou" explícito antes de cortar.
   *
   * Cortar a conexão calada não apaga nada do outro lado: o navegador de quem
   * assiste fica com o último quadro na mão e continua sozinho, porque a
   * rolagem é derivada do relógio e o vídeo em loop se repete no próprio
   * tocador. Fechar o Valendo deixava um vídeo rodando para sempre e um texto
   * empacado no fim, com cara de programa no ar.
   *
   * Também não adianta contar com o `close` da conexão: o EventSource tenta
   * reconectar sozinho e, para a página, uma queda de wi-fi e um app fechado
   * são o mesmo evento. Este recado diz qual dos dois é.
   */
  for (const cliente of clientes) {
    try {
      cliente.write('event: fim\ndata: {}\n\n')
    } catch {
      // conexão já morta do outro lado: o `end` abaixo resolve o resto
    }
    cliente.end()
  }
  clientes.clear()
  ultimoQuadro = null

  // `close()` sozinho só para de aceitar conexões novas: um navegador que já
  // tinha uma conexão aberta continuaria sendo atendido depois de o operador
  // desligar. Desligar tem que desligar.
  server?.closeAllConnections()
  server?.close()
  server = null
  error = null
}
