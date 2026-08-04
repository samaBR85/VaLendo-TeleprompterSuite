/**
 * Confere o cartão de TELA no app rodando.
 *
 * Perfil próprio (--user-data-dir): a checagem cria cartão, sobe ao ar e liga
 * a rede, e nada disso pode acontecer na mesa de trabalho de alguém.
 */
const PORT = Number(process.argv[2] ?? 9333)

const alvo = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) =>
  t.url.includes('operator.html')
)
if (!alvo) {
  console.error('app não está rodando com depuração')
  process.exit(2)
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
let seq = 0
const fila = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  const p = fila.get(m.id)
  if (p) {
    fila.delete(m.id)
    p(m.result)
  }
})
await new Promise((r) => ws.addEventListener('open', r))
const send = (method, params = {}) => {
  const id = ++seq
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((r) => fila.set(id, r))
}
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result?.value
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const acao = async (obj) => {
  await ev(`window.valendo.dispatch(${JSON.stringify(obj)})`)
  await wait(200)
}
const estado = () => ev(`(async () => (await window.valendo.getState()).state)()`)
const clicar = async (sel) => {
  const ok = await ev(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true })()`
  )
  if (!ok) throw new Error(`não achei para clicar: ${sel}`)
  await wait(350)
}

let passou = 0
const falhas = []
const check = (nome, ok, detalhe = '') => {
  if (ok) {
    passou += 1
    console.log(`  ok  ${nome}`)
  } else {
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
    console.log(`  XX  ${nome} ${detalhe}`)
  }
}

await send('Runtime.enable')
await wait(1500)

// sai da tela de boas-vindas, se ela estiver na frente
if (await ev(`Boolean(document.querySelector('[data-welcome-acao]'))`)) {
  await clicar('[data-welcome-acao="novo"]')
  await wait(1200)
}

// abre a gaveta
if (!(await ev(`Boolean(document.querySelector('[data-card-drop]'))`))) {
  await ev(`document.querySelector('[data-toggle-cards]')?.click()`)
  await wait(800)
}

/* ------------------------------------------------------- criar pelo botão */

const antes = (await estado()).cards.length
await clicar('[data-card-add-tela]')
await wait(600)

const dep = await estado()
const tela = dep.cards.find((c) => c.kind === 'tela')
check('o botão + Tela cria um cartão', dep.cards.length === antes + 1)
check('o cartão nasce com kind tela', Boolean(tela), tela ? '' : 'nenhum cartão de tela')
if (!tela) {
  console.log('\nsem cartão de tela não dá para seguir')
  process.exit(1)
}
check('nasce chapado, sem segunda cor', tela.fundo.ate === undefined, JSON.stringify(tela.fundo))
check('nasce sem recado', tela.recado.texto === '')
check(
  'não tem campo de arquivo nenhum',
  !('arquivo' in tela) && !('caminho' in tela) && !('poster' in tela),
  Object.keys(tela).join(',')
)
check('o editor abriu junto', await ev(`Boolean(document.querySelector('[data-tela-previa]'))`))

/* ------------------------------------------------------------- o editor */

await clicar('[data-tela-fundo="gradiente"]')
const comGrad = (await estado()).cards.find((c) => c.id === tela.id)
check('virar gradiente ganha a segunda cor', Boolean(comGrad.fundo.ate), JSON.stringify(comGrad.fundo))
check('e ganha um ângulo', Number.isFinite(comGrad.fundo.angulo), String(comGrad.fundo.angulo))
check(
  'a cor de partida não foi apagada no caminho',
  comGrad.fundo.de === tela.fundo.de,
  `${tela.fundo.de} -> ${comGrad.fundo.de}`
)

const fundoCss = await ev(
  `getComputedStyle(document.querySelector('[data-tela-previa] [data-card-tela]')).backgroundImage`
)
check('a prévia desenha o gradiente', fundoCss.includes('gradient'), fundoCss.slice(0, 60))

await acao({ type: 'card/tela', cardId: tela.id, recado: { texto: 'VOLTAMOS\nEM 2 MIN' } })
await wait(400)
const recadoNaPrevia = await ev(
  `document.querySelector('[data-tela-previa] [data-card-tela-recado]')?.textContent ?? ''`
)
check('o recado aparece na prévia', recadoNaPrevia.includes('VOLTAMOS'), recadoNaPrevia.slice(0, 40))

// o ângulo mexido sozinho não pode apagar as cores — é o motivo do remendo parcial
await acao({ type: 'card/tela', cardId: tela.id, fundo: { angulo: 20 } })
const soAngulo = (await estado()).cards.find((c) => c.id === tela.id)
check(
  'mexer só no ângulo preserva as duas cores',
  soAngulo.fundo.de === comGrad.fundo.de && soAngulo.fundo.ate === comGrad.fundo.ate,
  JSON.stringify(soAngulo.fundo)
)
check('e o texto continua lá', soAngulo.recado.texto.includes('VOLTAMOS'))

// ângulo ZERO é um ângulo, não a ausência de um
await acao({ type: 'card/tela', cardId: tela.id, fundo: { angulo: 0 } })
const zero = await ev(
  `getComputedStyle(document.querySelector('[data-tela-previa] [data-card-tela]')).backgroundImage`
)
check('ângulo 0 não vira o padrão', !zero.includes('135deg'), zero.slice(0, 50))
await acao({ type: 'card/tela', cardId: tela.id, fundo: { angulo: 135 } })

/* ------------------------------------------------- alinhamento do parágrafo */

for (const lado of ['left', 'right', 'center']) {
  await clicar(`[data-tela-alinhamento="${lado}"]`)
  const como = await ev(
    `getComputedStyle(document.querySelector('[data-tela-previa] [data-card-tela-recado]')).textAlign`
  )
  check(`alinhar ${lado} chega na prévia`, como === lado, como)
}

/* O bloco tem de ocupar a LARGURA toda: encolhido até o texto, alinhar à
   esquerda ou à direita não move nada, e o controle pareceria quebrado. */
const larguras = await ev(`(() => {
  const el = document.querySelector('[data-tela-previa] [data-card-tela-recado]')
  const pai = el.parentElement
  return { bloco: el.getBoundingClientRect().width, dentro: pai.clientWidth - parseFloat(getComputedStyle(pai).paddingLeft) * 2 }
})()`)
check(
  'o bloco do recado ocupa a largura toda',
  Math.abs(larguras.bloco - larguras.dentro) < 2,
  `${Math.round(larguras.bloco)} contra ${Math.round(larguras.dentro)}`
)

/* As bases desencontradas são a primeira coisa que o olho pega, e é o tipo de
   coisa que volta sozinha no próximo ajuste de espaçamento. */
const bases = await ev(`(() => {
  const campo = document.querySelector('[data-tela-texto]').getBoundingClientRect()
  const ultima = document.querySelector('[data-tela-alinhamento="right"]').getBoundingClientRect()
  return { campo: campo.bottom, ficha: ultima.bottom, topoCampo: campo.top, topoFicha: document.querySelector('[data-tela-alinhamento="left"]').getBoundingClientRect().top }
})()`)
check(
  'a base do campo e a do último botão coincidem',
  Math.abs(bases.campo - bases.ficha) < 1.5,
  `campo ${bases.campo.toFixed(1)} contra botão ${bases.ficha.toFixed(1)}`
)
check(
  'e os topos também',
  Math.abs(bases.topoCampo - bases.topoFicha) < 1.5,
  `campo ${bases.topoCampo.toFixed(1)} contra botão ${bases.topoFicha.toFixed(1)}`
)

/* Uma tela feita ANTES deste controle existir não tem o campo. Ela foi escrita
   centralizada, e não pode amanhecer encostada na esquerda. */
await acao({
  type: 'card/add',
  card: {
    id: 'tela-sem-campo',
    kind: 'tela',
    nome: 'Antiga',
    fundo: { de: '#16253f' },
    recado: { texto: 'ANTIGA', corpoPct: 11, cor: '#ffffff', posicao: 'meio' }
  }
})
await wait(600)
const antiga = await ev(
  `getComputedStyle(document.querySelector('[data-card-tile="tela-sem-campo"] [data-card-tela-recado]')).textAlign`
)
check('tela sem o campo continua centralizada', antiga === 'center', antiga)
await acao({ type: 'card/remove', cardId: 'tela-sem-campo' })

// fecha o editor
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
await ev(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
await wait(400)

/* ------------------------------------------------ a miniatura não mente */

const miniatura = await ev(`(() => {
  const el = document.querySelector('[data-card-tile=${JSON.stringify(tela.id)}] [data-card-tela]')
  if (!el) return null
  const s = getComputedStyle(el)
  const recado = el.querySelector('[data-card-tela-recado]')
  return { fundo: s.backgroundImage, texto: recado?.textContent ?? '', corpo: recado ? getComputedStyle(recado).fontSize : null }
})()`)
check('o ladrilho desenha a mesma tela', Boolean(miniatura?.fundo?.includes('gradient')), JSON.stringify(miniatura?.fundo)?.slice(0, 50))
check('com o mesmo recado', Boolean(miniatura?.texto?.includes('VOLTAMOS')))

/* ----------------------------------------------------------- ao ar */

await acao({ type: 'card/show', cardId: tela.id })
await wait(900)

/*
 * A altura vem do `style` inline, e não de getBoundingClientRect: a prévia do
 * operador desenha o palco no tamanho REAL da saída e depois o encolhe com um
 * transform. O retângulo devolve o tamanho já encolhido, o corpo do texto está
 * em pixel de palco, e comparar os dois dá uma proporção que não existe.
 */
const naPrevia = await ev(`(() => {
  const sup = document.querySelector('[data-prompter-surface="preview"]') || document.querySelector('[data-prompter-surface]')
  const el = sup?.querySelector('[data-card-tela]')
  if (!el) return null
  const recado = el.querySelector('[data-card-tela-recado]')
  return {
    fundo: getComputedStyle(el).backgroundImage,
    corpo: recado ? parseFloat(getComputedStyle(recado).fontSize) : 0,
    altura: parseFloat(sup.style.height)
  }
})()`)
check('a tela vai ao ar na prévia', Boolean(naPrevia), 'nenhuma superfície com a tela')
if (naPrevia) {
  check('com o gradiente', naPrevia.fundo.includes('gradient'))
  /* o corpo é proporcional à ALTURA do quadro: é isso que faz o cartão parecer
     o mesmo no ladrilho de 90px e numa saída de 1080 */
  const proporcao = naPrevia.corpo / naPrevia.altura
  check(
    'o corpo do recado acompanha a altura do quadro',
    Math.abs(proporcao * 100 - 11) < 1.5,
    `${(proporcao * 100).toFixed(2)}% esperado ~11%`
  )
}

/* --------------------------------------------------------- a rede */

await acao({ type: 'webview/set', enabled: true })
await wait(2000)
/*
 * `/estado` é um fluxo SSE: ele NUNCA fecha, então `res.text()` fica pendurado
 * para sempre. O jeito de ler é pegar o primeiro pedaço e desistir do resto —
 * e a leitura é feita daqui, do Node, e não de dentro do renderer, porque a
 * página do operador não tem por que poder falar com a porta 7777.
 */
const daRede = await (async () => {
  const corte = AbortSignal.timeout(4000)
  try {
    const r = await fetch('http://127.0.0.1:7777/estado', { signal: corte })
    const leitor = r.body.getReader()
    let junto = ''
    while (junto.length < 8000) {
      const { value, done } = await leitor.read()
      if (done) break
      junto += new TextDecoder().decode(value)
      if (junto.includes('\n\n')) break
    }
    await leitor.cancel()
    return junto
  } catch {
    return null
  }
})()
const temTelaNaRede = typeof daRede === 'string' && daRede.includes('"kind":"tela"')
check('a rede recebe o cartão de tela', temTelaNaRede, daRede ? 'sem kind tela no quadro' : 'sem resposta')
await acao({ type: 'webview/set', enabled: false })

/* ------------------------------------------- o projeto leva a tela inteira */

const salvo = await ev(`(async () => {
  const s = (await window.valendo.getState()).state
  return JSON.stringify(s.cards.find((c) => c.kind === 'tela'))
})()`)
check(
  'o cartão inteiro cabe em pouca coisa',
  typeof salvo === 'string' && salvo.length < 400,
  `${salvo?.length} caracteres`
)

await acao({ type: 'card/show', cardId: null })
await acao({ type: 'card/remove', cardId: tela.id })

console.log(`\n${passou} de ${passou + falhas.length}`)
if (falhas.length) {
  console.log('falhas:')
  for (const f of falhas) console.log('  *', f)
}
ws.close()
process.exit(falhas.length ? 1 : 0)
