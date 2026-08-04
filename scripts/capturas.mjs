/**
 * A campanha de capturas do README, do site e da wiki.
 *
 * Roda contra um app com PERFIL PRÓPRIO (--user-data-dir), nunca contra o
 * workspace de quem está usando: as capturas mexem em aba, cartão, modo e
 * ritmo, e nada disso pode voltar para a mesa de trabalho de alguém.
 *
 * Três regras que o operador pediu, e que valem para tudo aqui:
 *   - escala da interface em 125%
 *   - transporte na RÉGUA do rodapé, nunca no topo
 *   - a linha de progresso aparece PREENCHIDA — barra preta não é exemplo
 *
 * Cada captura confere alguma coisa antes de disparar. Uma foto errada não
 * dá erro: ela sai bonita e mente, e só se descobre quando já está publicada.
 *
 *   node campanha.mjs <porta> <pasta-de-saida> [passo]
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const PORT = Number(process.argv[2])
const SAIDA = process.argv[3]
const SO = process.argv[4] ?? null
/* O roteiro e as mídias moram no REPOSITÓRIO, não numa pasta de trabalho: uma
   campanha que depende do temp de uma máquina só é irreproduzível, e refazer
   as capturas é coisa que acontece a cada versão. */
const RAIZ = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')
const ROTEIRO_ARQ = `${RAIZ}docs/roteiro-de-capturas.txt`
/* o importador de cartões recebe caminho do sistema, e no Windows ele é com
   barra invertida — a URL de módulo entrega com barra normal */
const MIDIA = `${RAIZ}docs/midia-de-capturas`.replace(/\//g, '\\')

mkdirSync(SAIDA, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/* O enquadramento das capturas antigas. O README e o site foram diagramados
   contra esta proporção; trocá-la mexeria no corte de todas as imagens de uma
   vez. A escala de 125% mora DENTRO disto — é zoom do app, não do viewport. */
const LARGURA = 2318
const ALTURA = 1118

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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result?.value
}
const acao = async (obj) => {
  await ev(`window.valendo.dispatch(${JSON.stringify(obj)})`)
  await wait(180)
}
const estado = () => ev(`(async () => (await window.valendo.getState()).state)()`)
const clicar = async (sel) => {
  const ok = await ev(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true })()`
  )
  if (!ok) throw new Error(`não achei para clicar: ${sel}`)
  await wait(350)
}

const feitas = []
const problemas = []

/** Dispara a foto só se a condição de sanidade passar. */
async function foto(nome, checagem = null) {
  if (checagem) {
    const ok = await ev(`(() => { try { return Boolean(${checagem}) } catch { return false } })()`)
    if (!ok) {
      problemas.push(`${nome}: a tela não estava no estado esperado (${checagem.slice(0, 70)})`)
      console.log(`  !! ${nome} — PULADA`)
      return
    }
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${SAIDA}/${nome}.png`, Buffer.from(shot.data, 'base64'))
  feitas.push(nome)
  console.log(`  -> ${nome}`)
}

/**
 * Recorte de detalhe.
 *
 * O retângulo vem do DOM em pixel do documento AMPLIADO, e a imagem sai em
 * pixel de janela: com a escala em 125% as duas réguas não coincidem, e um
 * recorte sem converter pousa noutro lugar da tela — com a agravante de sair
 * um PNG plausível, que ninguém confere.
 */
async function recorte(nome, expr, folga = 10) {
  const acharElemento = expr.trim().startsWith('(') || expr.includes('=>') || expr.includes('document.')
    ? expr
    : `document.querySelector(${JSON.stringify(expr)})`
  const caixa = await ev(`(() => {
    const el = ${acharElemento}
    if (!el) return null
    /* Um wrapper com display:contents NAO tem retangulo: ele some da caixa e
       deixa os filhos no lugar dele. É o caso dos poços sem rótulo do kit
       (PROJETO, SAÍDA, transporte), e medir esse wrapper devolve 0x0 — que
       antes virava "não achei", escondendo uma peça que estava na tela.
       Quando não há caixa, o recorte usa a UNIÃO dos filhos. */
    let b = el.getBoundingClientRect()
    if (b.width < 2 || b.height < 2) {
      const filhos = [...el.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 1)
      if (!filhos.length) return null
      const left = Math.min(...filhos.map((r) => r.left))
      const top = Math.min(...filhos.map((r) => r.top))
      const right = Math.max(...filhos.map((r) => r.right))
      const bottom = Math.max(...filhos.map((r) => r.bottom))
      b = { left, top, width: right - left, height: bottom - top }
    }
    const z = window.devicePixelRatio
    const f = ${folga}
    return {
      x: Math.max(0, (b.left - f) * z),
      y: Math.max(0, (b.top - f) * z),
      width: (b.width + f * 2) * z,
      height: (b.height + f * 2) * z
    }
  })()`)
  if (!caixa) {
    problemas.push(`${nome}: não achei "${expr}" na tela`)
    console.log(`  !! ${nome} — PULADA`)
    return
  }
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { ...caixa, scale: 2 }
  })
  writeFileSync(`${SAIDA}/${nome}.png`, Buffer.from(shot.data, 'base64'))
  feitas.push(nome)
  console.log(`  -> ${nome} (${Math.round(caixa.width)}x${Math.round(caixa.height)})`)
}

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: LARGURA,
  height: ALTURA,
  deviceScaleFactor: 1,
  mobile: false
})
await wait(2500)

/* ------------------------------------------------------- boas-vindas */

const temModal = await ev(`Boolean(document.querySelector('[data-welcome-acao]'))`)
if (temModal) {
  await ev(`document.querySelector('[data-welcome-lang="en"]')?.click()`)
  await wait(900)
  await foto('01-welcome', `document.querySelector('[data-welcome-acao]')`)
  await recorte('d16-welcome-paths', '[data-welcome-acao="novo"]', 0)
  await recorte('d15-languages', '[data-welcome-lang="en"]', 0)
  await clicar('[data-welcome-acao="novo"]')
  await wait(1400)
}

/* ------------------------------------------------- preferências da mesa */

/* 125% de escala. Ela NÃO mora no estado do app: precisa ser lida antes de a
   janela existir, para nascer no tamanho certo, e por isso vive em `ui.json`,
   do lado do main. Quem a muda em tempo de execução é `setZoom`. */
await ev(`window.valendo.setZoom(1.25)`)
await wait(600)
await acao({ type: 'layout/transportPosition', position: 'regua' })
await acao({ type: 'layout/mode', mode: 'split' })
await wait(900)

const conferido = await estado()
console.log('escala', await ev(`window.devicePixelRatio`), '· transporte', conferido.transportPosition)

/* ------------------------------------------------------------ roteiro */

const ROTEIRO = readFileSync(ROTEIRO_ARQ, 'utf8').trim()
const abaAtiva = conferido.activeTabId
await acao({ type: 'text/set', tabId: abaAtiva, text: ROTEIRO })
await acao({ type: 'tab/rename', tabId: abaAtiva, title: 'Programme' })
await wait(1200)

// uma segunda aba, para a fileira de abas não parecer um recurso de uma só
await acao({ type: 'tab/add' })
await wait(500)
const comDuas = await estado()
const abaExtra = comDuas.activeTabId
await acao({ type: 'tab/rename', tabId: abaExtra, title: 'Headlines' })
await acao({ type: 'text/set', tabId: abaExtra, text: '## Headlines\n\nGood evening. These are tonight’s headlines.' })
await acao({ type: 'tab/activate', tabId: abaAtiva })
await wait(800)

/* ---------------------------------------------------------- apresentadores */

for (const nome of ['ALEX', 'JORDAN']) {
  await acao({ type: 'presenter/add', tabId: abaAtiva, nome })
}
await wait(700)
const comApres = await estado()
const apres = comApres.tabs.find((t) => t.id === abaAtiva)?.apresentadores ?? []
console.log('apresentadores:', apres.map((a) => `${a.nome} ${a.cor}`).join(', ') || 'NENHUM')
if (apres.length !== 2) problemas.push('os dois apresentadores não entraram — as fotos de cor vão sair erradas')

/* --------------------------------------------------------------- cartões */


await ev(`window.valendo.importCardPath('shot-img', ${JSON.stringify(MIDIA + '\\backdrop.png')}).then((r) => {
  window.valendo.dispatch({ type: 'card/add', card: { id: 'shot-img', kind: 'image', nome: 'Lower third', arquivo: r.arquivo } })
})`)
await wait(1400)
await ev(`window.valendo.importCardPath('shot-vid', ${JSON.stringify(MIDIA + '\\motion.mp4')}).then((r) => {
  window.valendo.dispatch({ type: 'card/add', card: { id: 'shot-vid', kind: 'video', nome: 'Opening titles', caminho: r.caminho, arquivoNome: r.arquivoNome, vinculado: true } })
})`)
await wait(2600)
await acao({ type: 'card/add', card: { id: 'shot-txt', kind: 'text', nome: 'Standby', texto: 'BACK IN 2 MIN' } })
await wait(600)

const comCartoes = await estado()
console.log('cartões:', comCartoes.cards.map((c) => `${c.kind}:${c.nome}`).join(', ') || 'NENHUM')
if (comCartoes.cards.length !== 3) problemas.push('os três cartões não entraram')

/* ------------------------------------------------------------ marcadores */

// dois marcadores, para a linha de progresso ter as marcas vermelhas
const blocos = (await estado()).tabs.find((t) => t.id === abaAtiva)?.blocks ?? []
for (const [i, rotulo] of [[7, 'The guest'], [15, 'Music under']]) {
  if (blocos[i]) await acao({ type: 'marker/add', tabId: abaAtiva, blockId: blocos[i].id, label: rotulo })
}
await wait(400)

/* ------------------------------------- a leitura ANDA antes de qualquer foto */

/*
 * A regra que o operador cravou: barra preta não é exemplo.
 *
 * A leitura anda de verdade e depois pausa, em vez de eu forjar a posição por
 * fora: assim a barra, os dois relógios e a marca de leitura contam todos a
 * MESMA história. Forjar um deles deixaria os outros denunciando a montagem
 * na foto publicada.
 */
/* `seekAnchor` leva a leitura ao bloco escolhido e TUDO acompanha — barra,
   relógios, marca. Tocar e esperar daria o mesmo, mas custaria um minuto de
   relógio por execução e deixaria a posição diferente a cada rodada, o que
   faz a foto de hoje não bater com a de amanhã. */
const paraOnde = (await estado()).tabs.find((t) => t.id === abaAtiva)?.blocks ?? []
const alvoDaLeitura = paraOnde[Math.floor(paraOnde.length * 0.38)]
if (alvoDaLeitura) {
  await acao({ type: 'transport/seekAnchor', anchor: { blockId: alvoDaLeitura.id, wordOffset: 0 } })
}
await wait(1200)

const andou = await ev(`(() => {
  const p = document.querySelector('[data-progresso] div')
  return p ? parseFloat(getComputedStyle(p).width) : 0
})()`)
console.log('progresso preenchido:', Math.round(andou), 'px')
if (andou < 8) problemas.push('a linha de progresso continua vazia — as fotos dela não servem')

/* =================================================== TELAS CHEIAS ======= */

if (!SO || SO === 'telas') {
  await foto('02-split', `document.querySelector('[data-mode="split"]')`)

  // FOCO
  await acao({ type: 'layout/mode', mode: 'focus' })
  await wait(1000)
  await foto('06-focus')

  // MESA
  await acao({ type: 'layout/mode', mode: 'deck' })
  await wait(1200)
  await foto('07-desk')

  await acao({ type: 'layout/mode', mode: 'split' })
  await wait(1000)
}

/* ================================================= RECORTES DE DETALHE == */

if (!SO || SO === 'detalhes') {
  const REGUA = '[data-transporte="regua"]'

  await recorte('d01-transport', '[data-grupo="transporte"]', 8)
  await recorte('d02-progress', '[data-progresso]', 0)
  await recorte('d03-speed', `document.querySelector('[data-alvo]').closest('.k-lcd')`, 8)
  await recorte('d04-clocks', `document.querySelector('${REGUA} [data-relogios]')`, 10)
  /* a fileira das abas não tem marca própria, e a aba é um DIV, não um botão:
     sai pelo rótulo de uma delas, subindo dois níveis até o container que
     segura as duas e o botão de nova aba */
  await recorte(
    'd06-tabs',
    `[...document.querySelectorAll('span')].find((e) => !e.children.length && e.textContent.trim() === 'Programme')?.parentElement?.parentElement`,
    6
  )
  await recorte('d07-modes', '[data-mode-switch]', 10)
  await recorte('d24-footer', 'footer', 0)
  await recorte('d11-inspector', '[data-inspector]', 0)

  /* A janela de leitura: a marca, o esmaecimento das bordas e o quanto
     esmaecer. O controle do "quanto" só é desenhado com o esmaecimento
     LIGADO — sem ligar antes, a foto sai sem justamente o recurso que ela
     deveria mostrar, e ninguém percebe porque a imagem fica plausível. */
  await clicar('[data-aba="leitura"]')
  await acao({ type: 'appearance/patch', tabId: abaAtiva, patch: { focusDim: true } })
  await wait(600)
  await recorte(
    'd27-focus-dim',
    `document.querySelector('[data-ajuda="insp.focusDim"]')?.closest('div[class*="border-b"]')`,
    6
  )
  await clicar('[data-aba="texto"]')

  // a lista de capítulos: o primeiro painel da coluna
  await recorte('d08-chapters', `document.querySelector('[data-chapter]')?.closest('div[class*="flex-col"]')?.parentElement`, 6)

  // o cabeçalho da Edição, com as ferramentas agrupadas por filete
  await recorte(
    'd25-editing-header',
    `[...document.querySelectorAll('.k-cabecalho')].find((c) => c.textContent.includes('words'))`,
    6
  )

  // o editor inteiro, com capítulo, direção e as cores de quem fala
  await recorte(
    'd12-editor',
    `document.querySelector('textarea')?.closest('section')`,
    0
  )

  // a Ajuda rápida: precisa de alguém apontado para ter o que dizer
  await ev(`(() => {
    const alvo = document.querySelector('[data-alvo]') || document.querySelector('[data-mode="split"]')
    alvo?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })()`)
  await wait(700)
  await recorte('d22-quick-help', `document.querySelector('[data-ajuda-corpo]')?.parentElement`, 6)

  // apresentadores: os chips com cor, o HIDE de cada um e o global
  await recorte(
    'd20-presenters',
    `document.querySelector('[data-apresentador-chip]')?.parentElement?.parentElement`,
    6
  )

  // SEGUIR e Go To, no cabeçalho de quem produz a leitura
  await recorte(
    'd21-follow',
    `[...document.querySelectorAll('.k-cabecalho')].find((c) => c.textContent.includes('Broadcast'))`,
    6
  )

  // o poço da saída: escolher monitor e ir ao ar
  await recorte('d05-output', `document.querySelector('[data-pill="saida"]')`, 8)
}

/* ======================================================== CARTÕES ======= */

if (!SO || SO === 'cartoes') {
  // a gaveta: F6 é quem a abre
  const jaAberta = await ev(`Boolean(document.querySelector('[data-card-tile]'))`)
  if (!jaAberta) await ev(`document.querySelector('[data-toggle-cards]')?.click()`)
  await wait(900)
  const abriu = await ev(`Boolean(document.querySelector('[data-card-tile]'))`)
  if (!abriu) {
    problemas.push('a gaveta de cartões não abriu — 03-cards, d09 e d17 dependem dela')
  } else {
    await foto('03-cards')
    await recorte('d17-cards-row', `document.querySelector('[data-card-tile]')?.parentElement`, 8)
    await recorte('d09-card-video', '[data-card-tile="shot-vid"]', 6)
    await recorte('d10-overlay', `document.querySelector('[data-drawer-overlay-style]')?.parentElement`, 6)
  }

  /* Sobreposição: o texto rola POR CIMA do cartão. É o caso que mais precisa
     de foto, porque é o que ninguém acredita antes de ver. */
  await acao({ type: 'cardOverlay/set', enabled: true })
  await acao({ type: 'card/show', cardId: 'shot-img' })
  await wait(1400)
  await foto('04-overlay-image', `document.querySelector('[data-card-overlaying]')`)

  await acao({ type: 'card/show', cardId: 'shot-vid' })
  await wait(3000)
  await foto('05-overlay-video', `document.querySelector('[data-card-overlaying]')`)

  await acao({ type: 'card/show', cardId: null })
  await acao({ type: 'cardOverlay/set', enabled: false })
  await wait(900)
}

/* =============================================== A TELA DO APRESENTADOR = */

if (!SO || SO === 'saida') {
  /*
   * A prévia É a tela do apresentador, na resolução real da saída — é a
   * premissa do app, não um arranjo para a foto. Recortá-la evita subir a
   * transmissão de verdade numa máquina de um monitor só, onde ela cobriria
   * a tela de quem está olhando.
   */
  await recorte('09-broadcast', `document.querySelector('[data-prompter-surface]')`, 0)

  /* Esconder os nomes: o que sobra são as cores, e é isso que o recurso
     promete. Vale a foto do DEPOIS, que é o que ninguém imagina. */
  await acao({ type: 'appearance/patch', tabId: abaAtiva, patch: { ocultarApresentadores: true } })
  await wait(1200)
  await recorte('d23-presenters-hidden', `document.querySelector('[data-prompter-surface]')`, 0)
  await recorte('d26-presenters-global', `document.querySelector('[data-esconder-apresentador]')?.closest('div')?.parentElement`, 6)
  await acao({ type: 'appearance/patch', tabId: abaAtiva, patch: { ocultarApresentadores: false } })
  await wait(900)
}

/* ========================================================== REDE ======== */

if (!SO || SO === 'rede') {
  await ev(`document.querySelector('[data-ajuda="ar.webview"]')?.click()`)
  await wait(800)
  const painel = await ev(`Boolean(document.querySelector('[data-web-perfil]'))`)
  if (!painel) {
    problemas.push('o painel da rede não abriu — d13, d14 e d18 ficaram sem foto')
  } else {
    await recorte('d14-weights', `document.querySelector('[data-web-perfil]')?.parentElement`, 8)

    /* O QR e o endereço só existem com a página REALMENTE no ar: fora do ar o
       painel não tem o que oferecer para alguém apontar a câmera. Publicar
       aqui é seguro — é um servidor na própria máquina, do próprio app. */
    await acao({ type: 'webview/set', enabled: true })
    await wait(2200)
    await recorte('d13-network-panel', `document.querySelector('[data-web-perfil]')?.closest('div[class*="rounded"]')`, 8)
    /* a tela cheia com o painel por cima: é assim que o operador vê o momento
       de publicar, com o roteiro escurecido atrás esperando a decisão */
    await foto('08-network', `document.querySelector('[data-web-perfil]')`)
    /* o MAIOR desenho do painel é o código; o menor é o ícone de wi-fi do
       título, e pegar o primeiro que aparece traz justamente o errado */
    await recorte(
      'd18-qr',
      `[...document.querySelectorAll('[data-web-perfil]')[0].closest('div[class*="rounded"]').querySelectorAll('svg, canvas, table, img')]
         .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0]?.parentElement`,
      10
    )
    await acao({ type: 'webview/set', enabled: false })
  }
}

console.log('\n--- feitas:', feitas.length)
if (problemas.length) {
  console.log('--- problemas:')
  for (const p of problemas) console.log('   *', p)
}
ws.close()
process.exit(problemas.length ? 1 : 0)
