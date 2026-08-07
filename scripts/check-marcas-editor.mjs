/**
 * A marca aparece no editor — e NÃO mexe na largura de um só glifo.
 *
 * A segunda metade é a que importa. O editor é um `textarea` transparente por
 * cima de um `<pre>` colorido, alinhados caractere a caractere: se pintar uma
 * palavra empurrasse as letras seguintes um décimo de pixel que fosse, o
 * cursor passaria a cair ao lado da letra que se está vendo — num roteiro no
 * ar. Aqui o script mede a caixa de um caractere DEPOIS da marca, pinta, e
 * cobra que a caixa não tenha se movido.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-marcas-editor.mjs
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
    JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true }
    })
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

/*
 * Um parágrafo LONGO de propósito: a prova de largura só vale se o texto
 * envolver para a linha de baixo. Numa linha que cabe inteira, mudar a largura
 * de uma palavra não move nada, e o teste passaria sem provar coisa alguma.
 */
const TEXTO =
  'Alfa bravo charlie delta echo foxtrot golf hotel india juliett kilo lima mike november oscar papa quebec romeu sierra tango uniform victor whiskey xray yankee zulu.'

/*
 * A tela de boas-vindas primeiro.
 *
 * Num perfil novo ela cobre tudo com um véu escuro. Os cliques programáticos
 * atravessam o véu e o script passava mesmo assim — mas toda COR medida (ou
 * fotografada) saía escurecida, e eu perdi uma rodada achando que era o app.
 */
if (await ev(`!!document.querySelector('[data-welcome]')`)) {
  await ev(`document.querySelector('[data-welcome-acao="demo"]').click()`)
  await espera(900)
}

await ev(`
  window.valendo.getState().then((s) =>
    window.valendo.dispatch({ type: 'text/set', tabId: s.state.activeTabId, text: ${JSON.stringify(TEXTO)} })
  )
`)
for (let i = 0; i < 40; i++) {
  if (await ev(`document.querySelector('[data-sem-roda] textarea')?.value === ${JSON.stringify(TEXTO)}`)) break
  await espera(150)
}
ok('o roteiro de teste chegou ao editor', (await ev(`document.querySelector('[data-sem-roda] textarea').value`)) === TEXTO)

/** Seleciona um trecho como o mouse selecionaria. */
async function selecionar(trecho) {
  const pego = await ev(`
    (() => {
      const area = document.querySelector('[data-sem-roda] textarea')
      const i = area.value.indexOf(${JSON.stringify(trecho)})
      if (i < 0) return null
      area.focus()
      area.setSelectionRange(i, i + ${trecho.length})
      area.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      area.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      area.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
      return area.value.slice(area.selectionStart, area.selectionEnd)
    })()
  `)
  await espera(350)
  return pego
}

/**
 * A caixa de um trecho dentro do `<pre>` colorido, medida pelo navegador.
 *
 * É a mesma técnica que o editor usa para achar a marca de leitura e os
 * achados da busca: um `Range` sobre os nós de texto. Percorre TODOS os nós
 * porque pintar divide a linha em vários spans — e é exatamente por isso que
 * esta medida prova alguma coisa.
 */
const caixaDe = (trecho) =>
  ev(`
    (() => {
      const pre = document.querySelector('[data-sem-roda] pre')
      const inteiro = pre.textContent
      const alvo = inteiro.indexOf(${JSON.stringify(trecho)})
      if (alvo < 0) return null
      const w = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
      let visto = 0, no = w.nextNode(), r = document.createRange(), comeco = null
      while (no) {
        const fim = visto + no.length
        if (comeco === null && alvo < fim) { r.setStart(no, alvo - visto); comeco = true }
        if (comeco && alvo + ${trecho.length} <= fim) { r.setEnd(no, alvo + ${trecho.length} - visto); break }
        visto = fim
        no = w.nextNode()
      }
      const c = r.getBoundingClientRect()
      const m = pre.getBoundingClientRect()
      return JSON.stringify({
        left: Math.round((c.left - m.left) * 100) / 100,
        top: Math.round((c.top - m.top) * 100) / 100,
        width: Math.round(c.width * 100) / 100
      })
    })()
  `)

/** A pinta pelo botão de verdade do cabeçalho. */
async function clicar(ajudaId) {
  await ev(`document.querySelector('[data-ajuda="${ajudaId}"]').click()`)
  await espera(450)
}

/* a última palavra do parágrafo: se qualquer coisa antes dela mudar de
   largura, ela é a primeira a se mexer */
const SENTINELA = 'zulu.'
const ANTES = JSON.parse(await caixaDe(SENTINELA))
const LINHA_INTEIRA = JSON.parse(await caixaDe(TEXTO.slice(0, 40)))
ok('o parágrafo envolve (a prova de largura só vale assim)', ANTES.top > LINHA_INTEIRA.top, `sentinela em y=${ANTES.top}`)

console.log('\n— negrito —')
ok('selecionar "charlie"', (await selecionar('charlie')) === 'charlie')
await clicar('editor.bold')
const marcado = await ev(`!!document.querySelector('[data-sem-roda] pre [data-marca]')`)
ok('o trecho ganhou um pedaço marcado no <pre>', marcado === true)
const sombra = await ev(`getComputedStyle(document.querySelector('[data-sem-roda] pre [data-marca]')).textShadow`)
ok('o negrito virou sombra, não peso de fonte', sombra !== 'none', sombra)
const peso = await ev(`getComputedStyle(document.querySelector('[data-sem-roda] pre [data-marca]')).fontWeight`)
ok('e o peso da fonte NÃO mudou', peso === '400' || peso === 'normal', peso)

/*
 * NENHUM pedaço do <pre> tem peso de fonte — nem os que não são marca.
 *
 * A conferência acima olhava só os `[data-marca]`, e por isso nunca alcançou a
 * linha da DEIXA: o nome de quem fala era desenhado com `fontWeight: 700`
 * direto no `<span>` da linha, sem ser marca nenhuma. Não incomodava enquanto a
 * fonte do editor era monoespaçada — Consolas desenha o negrito com o mesmo
 * avanço do regular. Com as fontes proporcionais que o menu agora oferece, esse
 * peso alarga os glifos SÓ nesta camada, e o cursor do `textarea` por baixo
 * passa a cair à esquerda da letra que se está vendo.
 *
 * Varrer o `<pre>` inteiro é o que teria pego aquilo, e é o que impede que
 * volte pela porta de trás de um `<span>` novo qualquer.
 */
const pesados = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre *')]
    .map((e) => getComputedStyle(e).fontWeight)
    .filter((p) => p !== '400' && p !== 'normal')
`)
ok(
  'e nenhum pedaço do <pre> usa peso de fonte, nem fora das marcas',
  pesados.length === 0,
  pesados.length ? `pesos encontrados: ${[...new Set(pesados)].join(', ')}` : 'todos em 400'
)
const depoisNegrito = JSON.parse(await caixaDe(SENTINELA))
ok(
  'a sentinela não se moveu um pixel',
  depoisNegrito.left === ANTES.left && depoisNegrito.top === ANTES.top,
  `${JSON.stringify(ANTES)} → ${JSON.stringify(depoisNegrito)}`
)

console.log('\n— itálico e sublinhado —')
ok('selecionar "november"', (await selecionar('november')) === 'november')
await clicar('editor.italic')
const ondulado = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')]
    .map((s) => getComputedStyle(s).textDecorationStyle)
`)
ok('o itálico virou traço ondulado', ondulado.includes('wavy'), JSON.stringify(ondulado))
const estilo = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')]
    .map((s) => getComputedStyle(s).fontStyle)
`)
ok('e nenhum pedaço ficou em itálico de verdade', estilo.every((e) => e === 'normal'), JSON.stringify(estilo))

ok('selecionar "sierra"', (await selecionar('sierra')) === 'sierra')
await clicar('editor.underline')
const reto = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')]
    .map((s) => getComputedStyle(s).textDecorationLine + ':' + getComputedStyle(s).textDecorationStyle)
`)
ok('o sublinhado virou traço reto', reto.includes('underline:solid'), JSON.stringify(reto))

const depoisTudo = JSON.parse(await caixaDe(SENTINELA))
ok(
  'com as três marcas no parágrafo, a sentinela continua no mesmo lugar',
  depoisTudo.left === ANTES.left && depoisTudo.top === ANTES.top,
  `${JSON.stringify(ANTES)} → ${JSON.stringify(depoisTudo)}`
)

console.log('\n— a cor —')
ok('selecionar "kilo"', (await selecionar('kilo')) === 'kilo')
await ev(`document.querySelector('[data-conta-gotas]').click()`)
await espera(300)
const cor = await ev(`
  (() => {
    const q = document.querySelectorAll('[data-seletor-de-cor] [data-cor]')[26]
    q.click()
    return q.getAttribute('data-cor')
  })()
`)
await espera(450)
const pintado = await ev(`
  (() => {
    const pre = document.querySelector('[data-sem-roda] pre')
    const s = [...pre.querySelectorAll('[data-marca]')].find((x) => x.textContent === 'kilo')
    return s ? getComputedStyle(s).color : null
  })()
`)
const esperado = (() => {
  const n = parseInt(cor.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
})()
ok(`"kilo" ficou ${cor} no editor`, pintado === esperado, String(pintado))

const depoisCor = JSON.parse(await caixaDe(SENTINELA))
ok(
  'e a sentinela SEGUE parada',
  depoisCor.left === ANTES.left && depoisCor.top === ANTES.top,
  `${JSON.stringify(ANTES)} → ${JSON.stringify(depoisCor)}`
)

console.log('\n— a marca acompanha o texto ao digitar antes dela —')
const antesDeDigitar = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => s.textContent)
`)
await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    area.focus()
    area.setSelectionRange(0, 0)
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(area, 'PRIMEIRO. ' + area.value)
    area.dispatchEvent(new Event('input', { bubbles: true }))
    area.setSelectionRange(10, 10)
  })()
`)
await espera(300)
const logoDepois = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => s.textContent)
`)
ok(
  'as marcas continuam cercando as MESMAS palavras, sem esperar o main',
  JSON.stringify(logoDepois) === JSON.stringify(antesDeDigitar),
  `${JSON.stringify(antesDeDigitar)} → ${JSON.stringify(logoDepois)}`
)
await espera(900)
const depoisDoMain = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => s.textContent)
`)
ok(
  'e continuam iguais depois do main responder',
  JSON.stringify(depoisDoMain) === JSON.stringify(antesDeDigitar),
  JSON.stringify(depoisDoMain)
)

console.log(`\n${falhas === 0 ? 'tudo certo' : `${falhas} falha(s)`}`)
socket.close()
process.exit(falhas === 0 ? 0 : 1)
