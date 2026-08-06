/**
 * A roda das quatro cores recentes, e o gatilho que devolve a cor da seleção.
 *
 * As duas coisas que o operador não conseguia fazer antes: saber, olhando,
 * QUAL cor está pintando o trecho selecionado, e repetir a cor de ontem sem
 * ter de reencontrá-la na grade.
 *
 * Tudo é dirigido pelo caminho do operador — selecionar com o par
 * mousedown/mouseup (o React deriva `onSelect` de mouse e teclado, não de um
 * evento `select` disparado à mão) e clicar nos botões de verdade.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-cores.mjs
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

/** '#e5484d' -> 'rgb(229, 72, 77)', que é como o navegador devolve a cor calculada */
const hexParaRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

let falhas = 0
const ok = (rotulo, cond, detalhe = '') => {
  if (!cond) falhas++
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

const TEXTO = 'Alfa bravo charlie.\n\nDelta echo foxtrot.'

/* semeia pela AÇÃO, não pelo textarea: escrever no `value` depende do
   rastreador interno do React e já falhou em silêncio noutros scripts */
await ev(`
  window.valendo.getState().then((s) =>
    window.valendo.dispatch({ type: 'text/set', tabId: s.state.activeTabId, text: ${JSON.stringify(TEXTO)} })
  )
`)
/* espera o texto CHEGAR na tela, em vez de apostar num tempo fixo: um respiro
   curto demais faz o script reprovar coisas que estão certas */
for (let i = 0; i < 40; i++) {
  const pronto = await ev(`document.querySelector('[data-sem-roda] textarea')?.value === ${JSON.stringify(TEXTO)}`)
  if (pronto) break
  await espera(150)
}
ok(
  'o roteiro de teste chegou ao editor',
  (await ev(`document.querySelector('[data-sem-roda] textarea').value`)) === TEXTO
)

/** Seleciona um pedaço do editor como o mouse selecionaria. */
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

/** A cor que o quadradinho do gatilho está mostrando agora. */
const corDoGatilho = () =>
  ev(`getComputedStyle(document.querySelector('[data-conta-gotas] span')).backgroundColor`)

/** As quatro casas da roda, na ordem, com `null` onde ainda está vazia. */
const roda = () =>
  ev(`
    [...document.querySelectorAll('[data-cores-recentes] button')]
      .filter((b) => b.hasAttribute('data-cor-recente') || b.hasAttribute('data-cor-recente-vazia'))
      .map((b) => b.getAttribute('data-cor-recente'))
  `)

/** Escolhe uma cor pela grade do seletor: abre, clica no quadrado, ele fecha. */
async function pintarPelaGrade(cor) {
  await ev(`document.querySelector('[data-conta-gotas]').click()`)
  await espera(250)
  const achou = await ev(`
    (() => {
      const q = document.querySelector('[data-seletor-de-cor] [data-cor="${cor}"]')
      if (!q) return false
      q.click()
      return true
    })()
  `)
  await espera(400)
  return achou
}

console.log('\n— a roda começa vazia, e o gatilho não mostra cor nenhuma —')
const inicio = await roda()
ok('a roda tem quatro casas', inicio.length === 4, JSON.stringify(inicio))

/*
 * As cores de teste saem da PRÓPRIA grade, não de constantes aqui.
 *
 * A grade é calculada (12 matizes × 5 luminosidades), então um hex escrito à
 * mão neste script pode simplesmente não existir lá — e foi o que aconteceu na
 * primeira rodada: quatro falhas seguidas que não eram do app, eram minhas.
 *
 * A seleção antes de abrir também não é enfeite: sem trecho selecionado o
 * gatilho está DESLIGADO, e o clique não abre nada — custou a segunda rodada.
 */
await selecionar('Alfa')
await ev(`document.querySelector('[data-conta-gotas]').click()`)
await espera(250)
const paleta = await ev(`
  [...document.querySelectorAll('[data-seletor-de-cor] [data-cor]')].map((b) => b.getAttribute('data-cor'))
`)
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
await espera(200)
ok('a grade tem as 71 casas de sempre', paleta.length === 71, `${paleta.length} casas`)
/* espalhadas pela grade, para serem visivelmente diferentes entre si */
const CORES = [paleta[20], paleta[26], paleta[32], paleta[38]]
const QUINTA = paleta[44]
const TRECHOS = ['Alfa', 'bravo', 'charlie', 'Delta']
for (let i = 0; i < CORES.length; i++) {
  const pego = await selecionar(TRECHOS[i])
  ok(`selecionar "${TRECHOS[i]}"`, pego === TRECHOS[i], String(pego))
  const pintou = await pintarPelaGrade(CORES[i])
  ok(`escolher ${CORES[i]} na grade`, pintou === true)
}
const cheia = await roda()
ok('as quatro casas na ordem em que foram usadas', JSON.stringify(cheia) === JSON.stringify(CORES), JSON.stringify(cheia))

console.log('\n— o gatilho devolve a cor de quem está selecionado —')
await selecionar('Alfa')
const noAlfa = await corDoGatilho()
ok(`sobre "Alfa" o gatilho mostra ${CORES[0]}`, noAlfa === hexParaRgb(CORES[0]), noAlfa)
await selecionar('foxtrot')
const noFoxtrot = await corDoGatilho()
/* sem marca o gatilho volta ao multicores, que é um `conic-gradient` — o
   `backgroundColor` calculado de um gradiente é transparente */
ok('sobre um trecho sem marca ele volta ao multicores', noFoxtrot === 'rgba(0, 0, 0, 0)', noFoxtrot)

console.log('\n— a quinta cor recomeça na PRIMEIRA casa, sem reordenar as outras —')
await selecionar('echo')
await pintarPelaGrade(QUINTA)
const virou = await roda()
ok(
  'o roxo tomou a casa 1 e as três outras não se mexeram',
  JSON.stringify(virou) === JSON.stringify([QUINTA, CORES[1], CORES[2], CORES[3]]),
  JSON.stringify(virou)
)

console.log('\n— clicar numa bolinha da roda pinta com aquela cor —')
await selecionar('foxtrot')
await ev(`document.querySelector('[data-cores-recentes] [data-cor-recente="${CORES[2]}"]').click()`)
await espera(400)
await selecionar('foxtrot')
const pintadoPelaRoda = await corDoGatilho()
ok(`a cor ${CORES[2]} da roda pintou o trecho`, pintadoPelaRoda === hexParaRgb(CORES[2]), pintadoPelaRoda)
const semDuplicar = await roda()
ok(
  'usar uma cor que já está na roda não gasta uma casa',
  JSON.stringify(semDuplicar) === JSON.stringify(virou),
  JSON.stringify(semDuplicar)
)

console.log('\n— o × pontilhado tira a marca —')
await selecionar('foxtrot')
await ev(`document.querySelector('[data-cores-recentes] [data-cor-limpar]').click()`)
await espera(400)
await selecionar('foxtrot')
const limpo = await corDoGatilho()
ok('sem marca, o gatilho volta ao multicores', limpo === 'rgba(0, 0, 0, 0)', limpo)

console.log('\n— o painel não tem mais a amostra duplicada no topo —')
await ev(`document.querySelector('[data-conta-gotas]').click()`)
await espera(250)
const altura = await ev(`document.querySelector('[data-seletor-de-cor]').offsetHeight`)
const dentroDaTela = await ev(`
  (() => {
    const r = document.querySelector('[data-seletor-de-cor]').getBoundingClientRect()
    return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth
  })()
`)
ok('o painel encolheu (menos de 240px)', altura < 240, `${altura}px`)
ok('e continua inteiro dentro da janela', dentroDaTela === true)
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)

console.log(`\n${falhas === 0 ? 'tudo certo' : `${falhas} falha(s)`}`)
socket.close()
process.exit(falhas === 0 ? 0 : 1)
