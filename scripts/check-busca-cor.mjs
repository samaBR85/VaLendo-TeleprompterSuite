/**
 * A terceira linha da barra de busca: pintar os achados.
 *
 * E o interruptor SPEECH, que é o que decide se uma varredura de cor atropela
 * o sistema de cores dos apresentadores. Desligado (o padrão) ela pula as
 * falas com dono; ligado, pinta por cima.
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

/*
 * Uma narração sem dono e duas falas de HARI, todas com a palavra "alvo".
 * É o que separa os dois lados do interruptor: com SPEECH desligado, só a
 * narração deve ser pintada.
 *
 * A narração vem ANTES do primeiro nome, e isso não é arranjo do texto — é a
 * regra do app. O turno de quem fala CONTINUA até outro nome aparecer, então
 * um parágrafo depois de HARI ainda é de HARI, por mais que pareça narração.
 * Escrito na outra ordem, este teste reprovava duas coisas certas — e foi
 * exatamente o que ele fez na primeira rodada.
 */
const TEXTO = 'Narração com alvo solto.\n\nHARI\nO alvo aparece aqui.\n\nHARI\nE o alvo de novo.'

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

/** Abre a busca e digita o termo. */
async function procurar(termo) {
  await ev(`
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }))
  `)
  await espera(350)
  await ev(`
    (() => {
      const c = document.querySelector('[data-busca-campo]')
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(c, ${JSON.stringify(termo)})
      c.dispatchEvent(new Event('input', { bubbles: true }))
    })()
  `)
  await espera(400)
}

const pintados = () =>
  ev(`[...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => s.textContent)`)

console.log('\n— a barra virou grade de quatro colunas —')
await procurar('alvo')
ok('achou as três ocorrências', (await ev(`document.querySelector('[data-busca-contagem]').textContent`)).endsWith('/3'))
const colunas = await ev(`getComputedStyle(document.querySelector('[data-busca]')).gridTemplateColumns`)
ok('quatro colunas', colunas.split(' ').length === 4, colunas)
/* as seis casas da direita: três pares alinhados em duas colunas */
const alinhadas = await ev(`
  (() => {
    const nomes = ['proxima','trocar-todas','pintar-todas']
    const xs = nomes.map((n) => document.querySelector('[data-busca-' + n + ']')?.getBoundingClientRect().left)
    return JSON.stringify(xs)
  })()
`)
const xs = JSON.parse(alinhadas)
ok('as três teclas "todas" caem na MESMA coluna', xs.every((x) => x === xs[0]), alinhadas)

const fechar = await ev(`
  (() => {
    const b = document.querySelector('[data-busca-fechar]').getBoundingClientRect()
    const barra = document.querySelector('[data-busca]').getBoundingClientRect()
    return JSON.stringify({ dx: Math.round(barra.right - b.right), dy: Math.round(b.top - barra.top) })
  })()
`)
const canto = JSON.parse(fechar)
ok('o × está solto no canto de cima, fora da grade', canto.dx <= 6 && canto.dy <= 6, fechar)

console.log('\n— SPEECH desligado: pula as falas com dono —')
/*
 * O estado da barra vive no componente e sobrevive entre rodadas do script:
 * o SPEECH que a rodada anterior deixou ligado fazia a seguinte reprovar
 * quatro coisas certas. Ligar de volta ao começo é o que torna este script
 * repetível — o valor de FÁBRICA do interruptor é coisa do teste de unidade,
 * não deste, que roda contra um app já em uso.
 */
if ((await ev(`document.querySelector('[data-sobrescrever]').getAttribute('aria-pressed')`)) === 'true') {
  await ev(`document.querySelector('[data-sobrescrever]').click()`)
  await espera(250)
}
ok(
  'SPEECH está desligado',
  (await ev(`document.querySelector('[data-sobrescrever]').getAttribute('aria-pressed')`)) === 'false'
)

await ev(`document.querySelector('[data-busca] [data-busca-cor]').click()`)
await espera(300)
const COR = await ev(`
  (() => {
    const q = document.querySelectorAll('[data-seletor-de-cor] [data-cor]')[26]
    q.click()
    return q.getAttribute('data-cor')
  })()
`)
await espera(350)
ok('agora o pintar acendeu', (await ev(`!document.querySelector('[data-busca-pintar-todas]').disabled`)) === true)

await ev(`document.querySelector('[data-busca-pintar-todas]').click()`)
await espera(600)
const so1 = await pintados()
ok(
  'pintou SÓ a ocorrência da narração, poupando as duas falas de HARI',
  so1.length === 1,
  JSON.stringify(so1)
)

console.log('\n— SPEECH ligado: pinta por cima —')
await ev(`document.querySelector('[data-sobrescrever]').click()`)
await espera(250)
await ev(`document.querySelector('[data-busca-pintar-todas]').click()`)
await espera(600)
const todas3 = await pintados()
ok('agora as três estão pintadas', todas3.length === 3, JSON.stringify(todas3))
const cores = await ev(`
  [...document.querySelectorAll('[data-sem-roda] pre [data-marca]')].map((s) => getComputedStyle(s).color)
`)
const esperada = (() => {
  const n = parseInt(COR.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
})()
ok(`todas em ${COR}`, cores.every((c) => c === esperada), JSON.stringify(cores))

console.log('\n— pintar todas custa UM passo de desfazer —')
const antes = await ev(`window.valendo.getState().then((s) => s.history.canUndo)`)
ok('há o que desfazer', antes === true)
await ev(`window.valendo.getState().then((s) => window.valendo.dispatch({ type: 'history/undo', tabId: s.state.activeTabId }))`)
await espera(700)
const depoisDoUndo = await pintados()
ok(
  'um Ctrl+Z devolve a varredura INTEIRA, não metade',
  depoisDoUndo.length === 1,
  JSON.stringify(depoisDoUndo)
)

console.log('\n— a pontilhada TIRA a marca —')
await ev(`document.querySelector('[data-busca-cor-limpar]').click()`)
await espera(250)
await ev(`document.querySelector('[data-busca-pintar-todas]').click()`)
await espera(600)
const limpo = await pintados()
ok('nenhuma marca sobrou', limpo.length === 0, JSON.stringify(limpo))

console.log('\n— a roda da barra é a MESMA do cabeçalho —')
const naBarra = await ev(`
  [...document.querySelectorAll('[data-busca-cor-recente]')].map((b) => b.getAttribute('data-busca-cor-recente'))
`)
const noCabecalho = await ev(`
  [...document.querySelectorAll('[data-cores-recentes] [data-cor-recente]')].map((b) => b.getAttribute('data-cor-recente'))
`)
ok(
  'as duas mostram as mesmas cores',
  JSON.stringify(naBarra) === JSON.stringify(noCabecalho) && naBarra.length > 0,
  `barra ${JSON.stringify(naBarra)} · cabeçalho ${JSON.stringify(noCabecalho)}`
)
ok('e a cor usada na busca entrou na roda', naBarra.includes(COR), JSON.stringify(naBarra))

console.log(`\n${falhas === 0 ? 'tudo certo' : `${falhas} falha(s)`}`)
socket.close()
process.exit(falhas === 0 ? 0 : 1)
