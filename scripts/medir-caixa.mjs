/**
 * A caixa da Ajuda rápida comporta o texto inteiro?
 *
 * Aponta um controle de descrição longa e compara o que o parágrafo PRECISA
 * com o que ele MOSTRA. `scrollHeight > clientHeight` significa frase cortada —
 * que foi exatamente o defeito que este script veio medir.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/medir-caixa.mjs
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)

const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const alvo = lista.find((t) => t.type === 'page' && t.url.includes('operator'))
if (!alvo) throw new Error('janela do operador não encontrada')
const socket = new WebSocket(alvo.webSocketDebuggerUrl)
const esperando = new Map()
let seq = 0
socket.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  const p = esperando.get(m.id)
  if (!p) return
  esperando.delete(m.id)
  if (m.error) p.reject(new Error(JSON.stringify(m.error)))
  else p.resolve(m.result)
})
await new Promise((r) => socket.addEventListener('open', r))
const evaluate = async (expression) => {
  const id = ++seq
  socket.send(
    JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })
  )
  const r = await new Promise((resolve, reject) => esperando.set(id, { resolve, reject }))
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}

/* a tecla de marcador do transporte: é a descrição que aparecia cortada em
   "can be jumped to during the programme" */
const r = await evaluate(`
  (async () => {
    const tecla = document.querySelector('[data-grupo="transporte"] button:nth-child(5)')
    if (!tecla) return { erro: 'teclado de transporte não está na tela' }
    tecla.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 260))
    const caixa = document.querySelector('[data-ajuda-corpo]')
    if (!caixa) return { erro: 'a caixa da ajuda não está aberta' }
    const paragrafo = caixa.querySelector('p')
    return {
      id: caixa.dataset.ajudaCorpo,
      caixa: Math.round(caixa.getBoundingClientRect().height),
      visivel: paragrafo.clientHeight,
      precisa: paragrafo.scrollHeight,
      texto: paragrafo.innerText.replace(/\\s+/g, ' ').trim()
    }
  })()
`)

socket.close()
if (r.erro) {
  console.log(r.erro)
  process.exit(1)
}
console.log(`controle:  ${r.id}`)
console.log(`caixa:     ${r.caixa}px`)
console.log(`parágrafo: precisa ${r.precisa}px, mostra ${r.visivel}px`)
console.log(`texto:     "${r.texto}"`)
console.log(r.precisa <= r.visivel ? '\nok — cabe inteiro' : '\nFALHA — ainda corta')
process.exit(r.precisa <= r.visivel ? 0 : 1)
