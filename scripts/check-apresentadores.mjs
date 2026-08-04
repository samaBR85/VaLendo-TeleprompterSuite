/**
 * Dois apresentadores, cada um com a sua cor.
 *
 * Carrega o roteiro de teste de verdade, registra HARI e ROBSON pelo caminho
 * do operador (selecionar o nome no editor e clicar no botão) e confere que a
 * cor sai igual nas duas superfícies — a transmissão e o editor.
 *
 * A seleção é feita com mouseup depois de mexer no `selectionRange`: o React
 * não sintetiza `onSelect` a partir de um evento `select` disparado à mão, ele
 * o deriva de mouse e teclado. Dirigir por onde o operador dirige é o que faz
 * este teste provar alguma coisa.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-apresentadores.mjs
 */
import { readFileSync } from 'node:fs'

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

const roteiro = readFileSync('teste_projetos/ROTEIRO-2_apresentadores.txt', 'utf-8')
await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(area, ${JSON.stringify(roteiro)})
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })()
`)
await espera(900)

/** Seleciona um nome no editor como o mouse selecionaria, e clica no botão. */
async function registrar(nome) {
  const marca = `\n${nome}\n`
  const selecionado = await ev(`
    (() => {
      const area = document.querySelector('[data-sem-roda] textarea')
      const i = area.value.indexOf(${JSON.stringify(marca)}) + 1
      if (i <= 0) return null
      area.focus()
      area.setSelectionRange(i, i + ${nome.length})
      // o React deriva onSelect de mouse/teclado, não do evento 'select' — e
      // o par mousedown/mouseup é o que o plugin dele observa
      area.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      area.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      area.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
      document.dispatchEvent(new Event('selectionchange'))
      return area.value.slice(area.selectionStart, area.selectionEnd)
    })()
  `)
  await espera(300)
  const podeClicar = await ev(`!document.querySelector('[data-ajuda="editor.presenter"]').disabled`)
  ok(`selecionar "${nome}" acende o botão de apresentador`, selecionado === nome && podeClicar === true, String(selecionado))
  await ev(`document.querySelector('[data-ajuda="editor.presenter"]').click()`)
  await espera(400)
}

await registrar('HARI')
await registrar('ROBSON')

const chips = await ev(`[...document.querySelectorAll('[data-apresentador-chip]')].map((c) => c.innerText.trim())`)
ok('os dois chips aparecem nos Ajustes', chips.length === 2, JSON.stringify(chips))

/* a prova principal: na transmissão, a fala de cada um sai na cor dele, e o
   parágrafo sem nome continua com a cor de quem falava antes */
const palco = await ev(`
  (() => {
    const linhas = [...document.querySelectorAll('[data-line]')]
      .map((l) => ({ t: l.textContent.trim(), c: getComputedStyle(l).color }))
      .filter((x) => x.t)
    const acha = (inicio) => linhas.find((l) => l.t.startsWith(inicio))
    return {
      capitulo: acha('–') || acha('INÍCIO') || linhas[0],
      falaHari: acha('E agora The Bear'),
      continuacao: acha('O cara perde'),
      falaRobson: acha('Acima de tudo')
    }
  })()
`)
console.log(JSON.stringify(palco, null, 1))
ok('a fala do HARI ganhou cor própria', palco.falaHari && palco.falaHari.c !== 'rgb(255, 255, 255)', palco.falaHari?.c)
ok('o ROBSON tem cor diferente do HARI', palco.falaRobson?.c !== palco.falaHari?.c, `${palco.falaHari?.c} vs ${palco.falaRobson?.c}`)
ok('o parágrafo sem nome continua com quem falava', palco.continuacao?.c === palco.falaHari?.c, palco.continuacao?.c)
ok('o capítulo NÃO recebeu cor de apresentador', palco.capitulo?.c !== palco.falaHari?.c, palco.capitulo?.c)

/* e no editor a cor é a MESMA — é o que faz a prévia ser honesta */
const editor = await ev(`
  (() => {
    const spans = [...document.querySelectorAll('[data-sem-roda] pre span')]
    const i = spans.findIndex((s) => s.textContent.trim() === 'HARI')
    if (i === -1) return null
    return {
      nome: getComputedStyle(spans[i]).color,
      peso: getComputedStyle(spans[i]).fontWeight,
      fala: getComputedStyle(spans[i + 1]).color
    }
  })()
`)
ok('o editor pinta a fala com a cor do apresentador', editor && editor.nome === editor.fala, JSON.stringify(editor))
ok('e a cor do editor é a mesma da transmissão', editor && editor.fala === palco.falaHari?.c, `${editor?.fala} vs ${palco.falaHari?.c}`)
ok('o nome vem em negrito, para se distinguir da fala', editor?.peso === '700', String(editor?.peso))

socket.close()
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo')
process.exit(falhas ? 1 : 0)
