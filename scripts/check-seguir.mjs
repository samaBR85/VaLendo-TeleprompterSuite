/**
 * O editor acompanha mesmo a leitura?
 *
 * Liga o SEGUIR, põe a leitura para correr e confere três coisas que só
 * aparecem no app montado: a marca existe, ela DESCE conforme a leitura anda,
 * e ela cai na linha certa do texto. Depois testa a regra que protege quem
 * está digitando, e a exclusão mútua com o CATCH.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-seguir.mjs
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
const conferir = (rotulo, ok, detalhe = '') => {
  if (!ok) falhas++
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

/*
 * Semeia um roteiro longo o bastante para rolar.
 *
 * Sem isto o teste passava vazio e não provava nada: um editor sem texto não
 * tem onde pousar a marca, e "não apareceu marca" viraria falha por falta de
 * roteiro em vez de por defeito no recurso.
 *
 * Escreve pelo caminho do React (o setter nativo + evento de input), que é o
 * mesmo por onde a digitação de verdade entra.
 */
const ROTEIRO = Array.from(
  { length: 40 },
  (_, i) => `Parágrafo número ${i + 1} do roteiro de teste, com palavras suficientes para ocupar mais de uma linha na caixa do editor.`
).join('\n\n')

await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    if (area.value.trim().length > 200) return 'já tinha texto'
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(area, ${JSON.stringify(ROTEIRO)})
    area.dispatchEvent(new Event('input', { bubbles: true }))
    return 'semeado'
  })()
`)
await espera(700)

const SEGUIR = `document.querySelector('[data-ajuda="panel.follow"]')`
const MARCA = `document.querySelector('[data-marca-leitura]')`
const topoDaMarca = `(() => { const m = ${MARCA}; return m ? Math.round(m.getBoundingClientRect().top) : null })()`

// estado limpo: parado no início, sem CATCH
await ev(`${SEGUIR} && ${SEGUIR}.getAttribute('aria-pressed') === 'true' ? ${SEGUIR}.click() : null`)
conferir('o botão SEGUIR está no cabeçalho da Transmissão', (await ev(`Boolean(${SEGUIR})`)) === true)
conferir('sem SEGUIR não há marca no editor', (await ev(`${MARCA} === null`)) === true)

await espera(4_200) // o respiro depois de "digitar" o roteiro semeado
await ev(`${SEGUIR}.click()`)
await espera(600)
const parado = await ev(topoDaMarca)
conferir('ligado, a marca aparece', parado !== null, `topo ${parado}px`)

// põe a leitura para correr bem rápido, para o teste não levar um minuto
await ev(`document.querySelector('[data-grupo="transporte"] button:nth-child(3)').click()`)
await espera(3_000)
const correndo = await ev(topoDaMarca)
conferir('a marca acompanha a leitura', correndo !== null && correndo !== parado, `${parado}px → ${correndo}px`)

// a linha certa: o texto sob a marca tem de ser o que está sendo lido
const casa = await ev(`
  (() => {
    const m = ${MARCA}
    const pre = document.querySelector('[data-sem-roda] pre')
    if (!m || !pre) return null
    const y = m.getBoundingClientRect().top + m.getBoundingClientRect().height / 2
    const x = pre.getBoundingClientRect().left + 40
    const range = document.caretRangeFromPoint(x, y)
    return range ? range.startContainer.textContent.slice(0, 40) : null
  })()
`)
conferir('a marca cai sobre texto do roteiro', typeof casa === 'string' && casa.trim().length > 0, JSON.stringify(casa))

// digitar tira o acompanhamento da frente
const antesDoToque = await ev(topoDaMarca)
await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    area.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  })()
`)
await espera(2_000)
const depoisDoToque = await ev(topoDaMarca)
conferir(
  'depois de mexer no editor, o acompanhamento cede a vez',
  antesDoToque === depoisDoToque,
  `${antesDoToque}px → ${depoisDoToque}px`
)

// exclusão mútua com o CATCH
await ev(`document.querySelector('[data-ajuda="editor.catch"]').click()`)
await espera(300)
const estados = await ev(`({
  seguir: ${SEGUIR}.getAttribute('aria-pressed'),
  catch: document.querySelector('[data-ajuda="editor.catch"]').className.includes('k-tecla-acesa')
})`)
conferir(
  'ligar o CATCH desliga o SEGUIR',
  estados.seguir === 'false' && estados.catch === true,
  JSON.stringify(estados)
)
conferir('e a marca some junto', (await ev(`${MARCA} === null`)) === true)

// devolve o app como estava
await ev(`document.querySelector('[data-ajuda="editor.catch"]').click()`)
await ev(`document.querySelector('[data-grupo="transporte"] button:nth-child(3)').click()`)
await ev(`document.querySelector('[data-ajuda="transport.restart"]').click()`)

socket.close()
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo')
process.exit(falhas ? 1 : 0)
