/**
 * A barra de busca nova: duas caixinhas dizem o que muda, e um botão aplica.
 *
 * O teste que dá sentido ao redesenho é o do ENCADEAMENTO. No desenho antigo a
 * cor pintava *o que a busca acha* — depois de trocar "agora" por "depois", a
 * busca continuava procurando "agora", achava zero, e pintar ficava impossível.
 * Aqui as duas caixinhas marcadas trocam E pintam no mesmo clique, e a cor cai
 * na palavra NOVA.
 *
 * O outro é o do SPEECH: por padrão, aplicar em todas pula as falas que já têm
 * cor de apresentador.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-busca-cor.mjs
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

/* a estreia cobre tudo com um véu escuro, e toda cor medida sai escurecida */
if (await ev(`!!document.querySelector('[data-welcome]')`)) {
  await ev(`document.querySelector('[data-welcome-acao="demo"]').click()`)
  await espera(900)
}

/*
 * Uma narração SEM dono e duas falas de HARI, todas com a palavra "alvo".
 *
 * A narração vem ANTES do primeiro nome, e isso não é arranjo do texto — é a
 * regra do app: o turno de quem fala continua até outro nome aparecer, então
 * um parágrafo depois de HARI ainda é de HARI, por mais que pareça narração.
 * Escrito na outra ordem, este script reprovava duas coisas certas.
 */
const TEXTO = 'Narração com alvo solto.\n\nHARI\nO alvo aparece aqui.\n\nHARI\nE o alvo de novo.'

const semear = async (texto) => {
  await ev(`
    window.valendo.getState().then((s) =>
      window.valendo.dispatch({ type: 'text/set', tabId: s.state.activeTabId, text: ${JSON.stringify(texto)} })
    )
  `)
  for (let i = 0; i < 40; i++) {
    if (await ev(`document.querySelector('[data-sem-roda] textarea')?.value === ${JSON.stringify(texto)}`)) return true
    await espera(150)
  }
  return false
}
ok('o roteiro de teste chegou ao editor', await semear(TEXTO))

/* HARI vira apresentador pelo caminho do operador: selecionar o nome e clicar */
await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    const i = area.value.indexOf('HARI')
    area.focus()
    area.setSelectionRange(i, i + 4)
    area.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    area.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })()
`)
await espera(400)
await ev(`document.querySelector('[data-ajuda="editor.presenter"]').click()`)
await espera(500)
ok('HARI virou apresentador', (await ev(`document.querySelectorAll('[data-apresentador-chip]').length`)) === 1)

/** Escreve num campo pelo caminho que o React observa. */
const escrever = async (seletor, texto) => {
  await ev(`
    (() => {
      const c = document.querySelector('${seletor}')
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(c, ${JSON.stringify(texto)})
      c.dispatchEvent(new Event('input', { bubbles: true }))
    })()
  `)
  await espera(400)
}

const abrirBusca = async (termo) => {
  if (!(await ev(`!!document.querySelector('[data-busca]')`))) {
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))`)
    await espera(400)
  }
  await escrever('[data-busca-campo]', termo)
}

const pintados = () =>
  ev(`[...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => s.textContent)`)

/** Liga ou desliga uma das duas caixinhas, sem depender de como ela estava. */
const caixinha = async (marca, queria) => {
  const agora = await ev(`document.querySelector('[data-${marca}]').getAttribute('aria-checked')`)
  if ((agora === 'true') !== queria) {
    await ev(`document.querySelector('[data-${marca}]').click()`)
    await espera(250)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— a barra tem os três blocos, e o ALL na PRIMEIRA linha —')
await abrirBusca('alvo')
ok('achou as três ocorrências', (await ev(`document.querySelector('[data-busca-contagem]').textContent`)).endsWith('/3'))
const alinhado = await ev(`
  (() => {
    const y = (s) => Math.round(document.querySelector(s).getBoundingClientRect().top)
    return JSON.stringify({ campo: y('[data-busca-campo]'), all: y('[data-find-all]') })
  })()
`)
const linhas = JSON.parse(alinhado)
ok('o ALL está na mesma linha do campo de busca', linhas.campo === linhas.all, alinhado)
const largura = await ev(`Math.round(document.querySelector('[data-busca]').getBoundingClientRect().width)`)
ok('a barra cabe em menos de 300px', largura < 300, `${largura}px`)
const quinze = await ev(`
  (() => {
    const c = document.querySelector('[data-busca-campo]')
    const e = getComputedStyle(c)
    const largura = c.getBoundingClientRect().width - parseFloat(e.paddingLeft) - parseFloat(e.paddingRight) - 2
    const lona = document.createElement('canvas').getContext('2d')
    lona.font = e.fontSize + ' ' + e.fontFamily
    return Math.round(largura / lona.measureText('0').width)
  })()
`)
ok('o campo mostra 15 caracteres', quinze === 15, `${quinze} caracteres`)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— o botão só acende quando o clique for mudar algo —')
await caixinha('usar-troca', false)
await caixinha('usar-cor', false)
ok('nada marcado: apagado', (await ev(`document.querySelector('[data-busca-aplicar]').disabled`)) === true)
await caixinha('usar-cor', true)
ok(
  'pintar marcado mas sem cor escolhida: segue apagado',
  (await ev(`document.querySelector('[data-busca-aplicar]').disabled`)) === true
)

/* a cor sai da PRÓPRIA grade — um hex escrito à mão pode não existir nela */
await ev(`document.querySelector('[data-busca-cor]').click()`)
await espera(300)
const COR = await ev(`
  (() => {
    const q = document.querySelectorAll('[data-seletor-de-cor] [data-cor]')[26]
    q.click()
    return q.getAttribute('data-cor')
  })()
`)
await espera(400)
ok('com a cor escolhida, acendeu', (await ev(`!document.querySelector('[data-busca-aplicar]').disabled`)) === true)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— SPEECH desligado: aplicar em todas pula as falas com dono —')
if ((await ev(`document.querySelector('[data-sobrescrever]').getAttribute('aria-pressed')`)) === 'true') {
  await ev(`document.querySelector('[data-sobrescrever]').click()`)
  await espera(250)
}
await ev(`document.querySelector('[data-busca-aplicar-todas]').click()`)
await espera(700)
const so1 = await pintados()
ok('pintou só a da narração, poupando as duas falas de HARI', so1.length === 1, JSON.stringify(so1))

console.log('\n— SPEECH ligado: pinta por cima —')
await ev(`document.querySelector('[data-sobrescrever]').click()`)
await espera(250)
await ev(`document.querySelector('[data-busca-aplicar-todas]').click()`)
await espera(700)
const tres = await pintados()
ok('agora as três', tres.length === 3, JSON.stringify(tres))
const cores = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => getComputedStyle(s).color)
`)
const esperada = (() => {
  const n = parseInt(COR.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
})()
ok(`todas em ${COR}`, cores.every((c) => c === esperada), JSON.stringify(cores))

console.log('\n— um Ctrl+Z devolve a varredura INTEIRA —')
await ev(`window.valendo.getState().then((s) => window.valendo.dispatch({ type: 'history/undo', tabId: s.state.activeTabId }))`)
await espera(800)
ok('sobrou o passo anterior, não metade deste', (await pintados()).length === 1, JSON.stringify(await pintados()))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— O ENCADEAMENTO: trocar e pintar num clique só —')
/*
 * O teste que dá sentido ao redesenho inteiro. Antes era impossível: a cor
 * pintava o que a BUSCA acha, e depois da troca a busca não achava mais nada.
 */
await semear('A palavra antiga aparece aqui.')
await abrirBusca('antiga')
await caixinha('usar-troca', true)
await caixinha('usar-cor', true)
await escrever('[data-troca-campo]', 'NOVISSIMA')
ok('o botão está aceso', (await ev(`!document.querySelector('[data-busca-aplicar]').disabled`)) === true)
await ev(`document.querySelector('[data-busca-aplicar]').click()`)
await espera(900)

const texto = await ev(`document.querySelector('[data-sem-roda] textarea').value`)
ok('a troca aconteceu', texto.includes('NOVISSIMA') && !texto.includes('antiga'), texto)
const pintadoAgora = await pintados()
ok(
  'e a cor caiu na palavra NOVA, não na velha',
  JSON.stringify(pintadoAgora) === JSON.stringify(['NOVISSIMA']),
  JSON.stringify(pintadoAgora)
)
const corNova = await ev(`
  (() => {
    const s = [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')][0]
    return s ? getComputedStyle(s).color : null
  })()
`)
ok(`na cor ${COR}`, corNova === esperada, String(corNova))

console.log('\n— trocar por uma palavra mais CURTA também cai no lugar certo —')
/* o caso que uma conta ingênua erraria: cada troca desloca as seguintes */
await semear('gato gato gato aqui')
await abrirBusca('gato')
await caixinha('usar-troca', true)
await caixinha('usar-cor', true)
await escrever('[data-troca-campo]', 'oi')
await ev(`document.querySelector('[data-busca-aplicar-todas]').click()`)
await espera(900)
const curtas = await pintados()
ok(
  'as três marcas cercam exatamente as três palavras novas',
  JSON.stringify(curtas) === JSON.stringify(['oi', 'oi', 'oi']),
  JSON.stringify(curtas)
)

console.log('\n— a seta que SOBE: leva o REPLACE para o FIND —')
/*
 * A continuação do encadeamento. Trocado "sirene" por "BUZINA", a pergunta
 * seguinte quase sempre é "e onde está o BUZINA?" — para conferir, pintar ou
 * trocar de novo. A seta leva a palavra para cima em vez de obrigar a
 * redigitá-la dois campos acima.
 */
await semear('Uma frase com sirene aqui.')
await abrirBusca('sirene')
await caixinha('usar-troca', true)
await escrever('[data-troca-campo]', 'BUZINA')
ok('a seta está acesa', (await ev(`!document.querySelector('[data-troca-sobe]').disabled`)) === true)
await ev(`document.querySelector('[data-troca-sobe]').click()`)
await espera(500)
const subiu = await ev(`document.querySelector('[data-busca-campo]').value`)
ok('o termo de busca virou a palavra que estava no REPLACE', subiu === 'BUZINA', String(subiu))
const sobrou = await ev(`document.querySelector('[data-troca-campo]').value`)
ok('e o REPLACE ficou vazio — foi recorte, não cópia', sobrou === '', JSON.stringify(sobrou))
ok(
  'com o campo vazio, a seta apaga',
  (await ev(`document.querySelector('[data-troca-sobe]').disabled`)) === true
)

console.log(`\n${falhas === 0 ? 'tudo certo' : `${falhas} falha(s)`}`)
socket.close()
process.exit(falhas === 0 ? 0 : 1)
