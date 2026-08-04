/**
 * Avançar e voltar capítulo NÃO dão a volta.
 *
 * Dirige pelos comandos de verdade (os mesmos que o atalho dispara) e cobra as
 * duas pontas: no último capítulo, "próximo" não pode levar de volta à
 * abertura; no primeiro, "anterior" não pode saltar para o fim. No meio de um
 * programa esse salto leva o apresentador para longe do que está sendo dito.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-capitulos.mjs
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

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
const ev = async (expression) => {
  const id = ++seq
  socket.send(
    JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })
  )
  const r = await new Promise((resolve, reject) => esperando.set(id, { resolve, reject }))
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}

let falhas = 0
const ok = (rotulo, cond, detalhe = '') => {
  if (!cond) falhas++
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

const ROTEIRO = [
  '## Abertura',
  'a primeira fala do programa, com palavras suficientes',
  '## Bloco do meio',
  'a fala do meio, também com um tanto de palavras',
  '## Encerramento',
  'a última fala, fechando o programa'
].join('\n\n')

await ev(`
  window.valendo.getState().then((s) =>
    window.valendo.dispatch({ type: 'text/set', tabId: s.state.activeTabId, text: ${JSON.stringify(ROTEIRO)} })
  )
`)
await espera(900)

/** O capítulo em que a leitura está agora, pelo que a coluna mostra aceso. */
const capituloAtual = `
  (() => {
    const atual = document.querySelector('[data-chapter][aria-current="true"]')
    return atual ? atual.textContent.replace(/\\s+/g, ' ').trim() : null
  })()
`
/*
 * Pelo TECLADO, e não chamando o comando por dentro: os comandos vivem no
 * renderer, e é o atalho que o operador aperta. Dirigir por onde ele dirige é
 * o que faz o teste valer.
 */
const tecla = async (key) => {
  await ev(`
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, code: ${JSON.stringify(key === 'ArrowDown' ? 'ArrowDown' : 'ArrowUp')}, ctrlKey: true, shiftKey: true, bubbles: true })
    )
  `)
  await espera(350)
}

await ev(`window.valendo.dispatch({ type: 'transport/restart' })`)
await espera(400)
ok('começa na abertura', (await ev(capituloAtual))?.includes('Abertura') === true, String(await ev(capituloAtual)))

await tecla('ArrowUp')
ok(
  'no PRIMEIRO, voltar não salta para o fim',
  (await ev(capituloAtual))?.includes('Abertura') === true,
  String(await ev(capituloAtual))
)

await tecla('ArrowDown')
await tecla('ArrowDown')
const ultimo = await ev(capituloAtual)
ok('avançar chega ao último', ultimo?.includes('Encerramento') === true, String(ultimo))

await tecla('ArrowDown')
ok(
  'no ÚLTIMO, avançar não volta para a abertura',
  (await ev(capituloAtual))?.includes('Encerramento') === true,
  String(await ev(capituloAtual))
)

await tecla('ArrowUp')
ok(
  'e voltar do último ainda funciona',
  (await ev(capituloAtual))?.includes('meio') === true,
  String(await ev(capituloAtual))
)

socket.close()
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo')
process.exit(falhas ? 1 : 0)
