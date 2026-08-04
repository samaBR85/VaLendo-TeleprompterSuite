/**
 * A Ajuda rápida responde ao que o ponteiro aponta?
 *
 * Roda contra o app de verdade (CDP), porque o que se quer provar aqui é a
 * DELEGAÇÃO: um ouvinte único no documento, um `closest('[data-ajuda]')`, e o
 * quadro da coluna trocando de texto. Nada disso aparece num teste de unidade —
 * é evento de mouse atravessando a árvore montada.
 *
 * E a segunda metade: varrer a mesa inteira atrás de controle sem marca. É a
 * conta que diz se "todo botão e slider" foi mesmo cumprido, em vez de eu
 * afirmar que sim.
 *
 *   1. npm run build
 *   2. npm run start:debug   (num terminal)
 *   3. node scripts/check-ajuda.mjs
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function operador() {
  const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const alvo = lista.find((t) => t.type === 'page' && t.url.includes('operator'))
  if (!alvo) throw new Error('janela do operador não encontrada — o app está rodando com --remote-debugging-port?')
  return alvo
}

function conectar(alvo) {
  const socket = new WebSocket(alvo.webSocketDebuggerUrl)
  const esperando = new Map()
  let seq = 0
  socket.addEventListener('message', (evento) => {
    const msg = JSON.parse(evento.data)
    const pendente = esperando.get(msg.id)
    if (!pendente) return
    esperando.delete(msg.id)
    if (msg.error) pendente.reject(new Error(JSON.stringify(msg.error)))
    else pendente.resolve(msg.result)
  })
  const send = (method, params = {}) => {
    const id = ++seq
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => esperando.set(id, { resolve, reject }))
  }
  return {
    socket,
    ready: new Promise((resolve) => socket.addEventListener('open', resolve)),
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
      return r.result.value
    }
  }
}

/** Dispara o `mouseover` no primeiro elemento que casar, e devolve o que a caixa passou a dizer. */
const apontar = (seletor) => `
  (async () => {
    const alvo = document.querySelector(${JSON.stringify(seletor)})
    if (!alvo) return { erro: 'não achei ${seletor}' }
    alvo.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 260))
    const caixa = document.querySelector('[data-ajuda-corpo]')
    return caixa
      ? { id: caixa.dataset.ajudaCorpo, texto: caixa.innerText.replace(/\\s+/g, ' ').trim() }
      : { erro: 'a caixa da ajuda não apareceu' }
  })()
`

const VARREDURA = `
  (() => {
    /* interativo de verdade: o que se clica, arrasta ou digita. Um <div> com
       onClick não entra aqui — nem deveria: a mesa é feita de teclas. */
    const seletor = 'button, input, select, textarea, [role="button"]'
    const mudos = []
    for (const el of document.querySelectorAll(seletor)) {
      if (el.closest('[data-ajuda]')) continue
      if (el.closest('[data-inspector-corpo] label')) continue
      const caminho = el.getAttribute('data-mode') || el.getAttribute('aria-label') ||
        el.getAttribute('title') || el.textContent.trim().slice(0, 24) || el.type || el.tagName
      mudos.push(caminho)
    }
    const marcados = document.querySelectorAll('[data-ajuda]').length
    return { marcados, mudos }
  })()
`

const alvo = await operador()
const cdp = conectar(alvo)
await cdp.ready
await wait(300)

let falhas = 0
const conferir = async (rotulo, seletor, idEsperado) => {
  const r = await cdp.evaluate(apontar(seletor))
  const ok = r.id === idEsperado
  if (!ok) falhas++
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${rotulo} → ${r.id ?? r.erro}`)
  if (ok) console.log(`       "${r.texto}"`)
}

// três superfícies diferentes, para provar que a delegação alcança a mesa toda
await conferir('play do transporte', '[data-grupo="transporte"] button:nth-child(3)', 'transport.playPause')
await conferir('tela preta (poço AR)', '[data-pill="ar"] button', 'ar.blackout')
await conferir('seletor de idioma', '[data-language-picker]', 'header.language')
await conferir('aba dos Ajustes', '[data-aba="leitura"]', 'insp.tabReading')
await conferir('modo de trabalho', '[data-mode="focus"]', 'status.modeFocus')

const { marcados, mudos } = await cdp.evaluate(VARREDURA)
console.log(`\nmarcados na tela: ${marcados}`)
console.log(`sem marca: ${mudos.length}`)
for (const m of mudos) console.log(`  · ${m}`)

cdp.socket.close()
process.exit(falhas ? 1 : 0)
