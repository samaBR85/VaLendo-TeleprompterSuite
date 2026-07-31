import { createReadStream, existsSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import { extname, join, normalize } from 'node:path'
import type { WebviewFrame, WebviewInfo } from '@shared/api'

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
  })

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
  for (const cliente of clientes) cliente.end()
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
