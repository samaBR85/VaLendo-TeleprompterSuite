/**
 * As dez fontes embutidas desenham mesmo — e as duas camadas do editor
 * continuam casadas em todas elas.
 *
 * O seletor de fonte entrou sem cobertura nenhuma, e a lista antiga tinha um
 * defeito que ninguém via: `"Atkinson Hyperlegible", Verdana` prometia uma
 * fonte que máquina nenhuma tem instalada e entregava Verdana, calada. Este
 * script existe para que isso não volte — a asserção 1 é exatamente essa.
 *
 * A asserção 2 é a que protege quem digita. O editor é um `textarea`
 * transparente por cima de um `<pre>` colorido, casados caractere a caractere:
 * se as duas camadas quebrarem a linha em pontos diferentes, o cursor cai ao
 * lado da letra que se está vendo. Enquanto a fonte era monoespaçada isso
 * perdoava quase tudo; com dez famílias, sendo sete proporcionais, tem de ser
 * cobrado uma a uma.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-fontes.mjs
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
const cdp = (method, params) => {
  const id = ++seq
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => esperando.set(id, { resolve, reject }))
}
const ev = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}
/*
 * O mouse de VERDADE, e não um evento sintético.
 *
 * O `onMouseEnter` do React não escuta `mouseover` solto: ele deriva entrar e
 * sair do par `mouseout`/`mouseover` com `relatedTarget`, e um evento fabricado
 * à mão passa batido. Mandar o ponteiro pelo CDP exercita o mesmo caminho que
 * o operador — que é o ponto de um teste de interface.
 */
const mover = async (x, y) => {
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await espera(300)
}
const estado = () => ev(`(async () => (await window.valendo.getState()).state)()`)
const acao = async (a) => {
  await ev(`window.valendo.dispatch(${JSON.stringify(a)})`)
  await espera(250)
}

let falhas = 0
const conferir = (rotulo, ok, detalhe = '') => {
  if (!ok) falhas++
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

/*
 * Tirar as boas-vindas da frente ANTES de qualquer coisa.
 *
 * Num perfil limpo ela abre por cima de tudo, e o `fixed inset-0` dela é uma
 * folha que cobre a janela inteira. Clique sintético atravessa (o `.click()`
 * vai direto ao elemento), mas o PONTEIRO não — e a conferência do hover, que
 * é a única aqui que precisa de mouse de verdade, batia na modal e falhava sem
 * dizer por quê. Custou uma sonda descobrir; a linha abaixo é o que sobrou dela.
 */
if (await ev(`Boolean(document.querySelector('[data-welcome-acao]'))`)) {
  await ev(`document.querySelector('[data-welcome-acao="novo"]').click()`)
  await espera(900)
}

/*
 * Um roteiro que ENVOLVE, e com as ligaduras dentro.
 *
 * Parágrafo que cabe numa linha não prova nada sobre quebra: o teste todo é
 * sobre as duas camadas escolherem o mesmo ponto de quebra, e sem envolver não
 * há ponto de quebra para escolher. "final", "difícil" e "eficiente" estão aí
 * de propósito — são o `fi`/`ffi` que Literata, Newsreader e Alegreya ligam de
 * fábrica.
 */
const ROTEIRO = Array.from(
  { length: 30 },
  (_, i) =>
    `Parágrafo ${i + 1}: o corte final foi difícil, mas o resultado ficou eficiente e suficiente para o programa de hoje à noite.`
).join('\n\n')

await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(area, ${JSON.stringify(ROTEIRO)})
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })()
`)
await espera(1_200)

/* ------------------------------------------------- as dez, uma por uma */

/*
 * A lista sai do PRÓPRIO MENU, e não do módulo.
 *
 * Se uma fonte não está no menu, ela não existe para o operador — conferir
 * contra o array importado provaria que o código tem dez, não que o menu
 * oferece dez.
 *
 * Abrir e ler em avaliações separadas, com respiro no meio: o menu é estado do
 * React, e no mesmo `evaluate` os itens ainda não existem no DOM.
 */
const abrirMenu = async (seletor) => {
  await ev(`document.querySelector('${seletor}').click()`)
  await espera(350)
}
const fecharMenu = async (seletor) => {
  await ev(`document.querySelector('${seletor}').click()`)
  await espera(350)
}

await abrirMenu('[data-fonte-do-editor]')
const doMenu = await ev(`
  [...document.querySelectorAll('[data-fonte-item]')].map((b) => ({
    chave: b.getAttribute('data-fonte-item'),
    familia: b.style.fontFamily
  }))
`)
await fecharMenu('[data-fonte-do-editor]')
conferir('o menu da Edição oferece as dez fontes', doMenu.length === 10, `${doMenu.length} itens`)
if (doMenu.length === 0) {
  console.log('\nsem itens: nada mais a conferir')
  socket.close()
  process.exit(1)
}

const original = (await estado()).maquina.editorFontFamily

for (const item of doMenu) {
  await acao({ type: 'maquina/patch', patch: { editorFontFamily: item.familia } })
  await espera(400)

  const medida = await ev(`
    (async () => {
      const pre = document.querySelector('[data-sem-roda] pre')
      const area = document.querySelector('[data-sem-roda] textarea')
      const est = getComputedStyle(pre)
      // a PRIMEIRA da pilha é a embutida; as de trás são reserva do sistema
      const primeira = est.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')
      await document.fonts.ready
      return {
        primeira,
        carregou: document.fonts.check('14px "' + primeira + '"'),
        alturaPre: pre.scrollHeight,
        alturaArea: area.scrollHeight,
        ligaduraPre: est.fontVariantLigatures,
        ligaduraArea: getComputedStyle(area).fontVariantLigatures,
        mesmaFamilia: est.fontFamily === getComputedStyle(area).fontFamily
      }
    })()
  `)

  conferir(
    `${item.chave}: a fonte carregou de verdade`,
    medida.carregou === true,
    medida.primeira
  )
  conferir(
    `${item.chave}: as duas camadas quebram no mesmo lugar`,
    medida.alturaPre === medida.alturaArea && medida.mesmaFamilia,
    `pre ${medida.alturaPre}px · campo ${medida.alturaArea}px`
  )
  conferir(
    `${item.chave}: sem ligadura nas duas camadas`,
    medida.ligaduraPre === 'none' && medida.ligaduraArea === 'none',
    `${medida.ligaduraPre} / ${medida.ligaduraArea}`
  )
}

/*
 * A ligadura de verdade, e não só a declaração.
 *
 * `font-variant-ligatures: none` pode estar escrito e mesmo assim uma fonte
 * ligar por outro caminho. A prova funcional é medir: com o `fi` de "final"
 * ligado, um `Range` de UM caractere devolve o retângulo do cluster inteiro —
 * ou seja, a largura de um caractere seria igual à de dois. É exatamente isso
 * que engordaria a faixa do SEGUIR e as caixas do FIND ALL.
 */
const serifada = doMenu.find((f) => f.chave === 'font.literata')
if (serifada) {
  await acao({ type: 'maquina/patch', patch: { editorFontFamily: serifada.familia } })
  await espera(500)
  const larguras = await ev(`
    (() => {
      const pre = document.querySelector('[data-sem-roda] pre')
      const passo = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
      let no, achado = null
      while ((no = passo.nextNode())) {
        const i = no.textContent.indexOf('final')
        if (i >= 0) { achado = { no, i }; break }
      }
      if (!achado) return null
      const medir = (de, ate) => {
        const r = document.createRange()
        r.setStart(achado.no, achado.i + de)
        r.setEnd(achado.no, achado.i + ate)
        return Math.round(r.getBoundingClientRect().width * 100) / 100
      }
      return { f: medir(0, 1), fi: medir(0, 2) }
    })()
  `)
  conferir(
    'o "fi" de "final" não virou ligadura',
    larguras !== null && larguras.f < larguras.fi,
    larguras ? `f ${larguras.f}px < fi ${larguras.fi}px` : 'não achei a palavra'
  )
}

await acao({ type: 'maquina/patch', patch: { editorFontFamily: original } })

/* ------------------------------------------- a amostra ao vivo da saída */

const aba = (await estado()).activeTabId

await acao({ type: 'appearance/patch', tabId: aba, patch: { bgColor: '#000000', textColor: '#FFFFFF' } })
const cores = await ev(`
  (() => {
    const t = document.querySelector('[data-fonte-amostra]')
    if (!t) return null
    const e = getComputedStyle(t)
    return { fundo: e.backgroundColor, texto: e.color }
  })()
`)
conferir(
  'a amostra usa as cores da SAÍDA, não as do painel',
  cores !== null && cores.fundo === 'rgb(0, 0, 0)' && cores.texto === 'rgb(255, 255, 255)',
  JSON.stringify(cores)
)

// e acompanha se o operador trocá-las: a tira não é preto-e-branco fixo
await acao({ type: 'appearance/patch', tabId: aba, patch: { bgColor: '#101820', textColor: '#FFD37A' } })
const trocadas = await ev(
  `(() => { const e = getComputedStyle(document.querySelector('[data-fonte-amostra]')); return e.backgroundColor + ' ' + e.color })()`
)
conferir(
  'e acompanha quando as cores mudam',
  trocadas === 'rgb(16, 24, 32) rgb(255, 211, 122)',
  trocadas
)
await acao({ type: 'appearance/patch', tabId: aba, patch: { bgColor: '#000000', textColor: '#FFFFFF' } })

// peso e caixa alta, sem clique nenhum a mais — é o que "ao vivo" quer dizer
await acao({ type: 'appearance/patch', tabId: aba, patch: { fontWeight: 800, allCaps: true } })
const forte = await ev(
  `(() => { const e = getComputedStyle(document.querySelector('[data-fonte-amostra]')); return e.fontWeight + ' ' + e.textTransform })()`
)
conferir('a amostra segue peso e ALL CAPS', forte === '800 uppercase', forte)

await acao({ type: 'appearance/patch', tabId: aba, patch: { fontWeight: 500, allCaps: false } })
const fraco = await ev(
  `(() => { const e = getComputedStyle(document.querySelector('[data-fonte-amostra]')); return e.fontWeight + ' ' + e.textTransform })()`
)
conferir('e volta quando o controle volta', fraco === '500 none', fraco)

/*
 * Passar o mouse pré-visualiza e NÃO grava.
 *
 * É a razão de a prévia existir: comparar as sete sem se comprometer. Se o
 * `onMouseEnter` chegasse ao estado, percorrer a lista custaria sete mudanças
 * — e sete passos de desfazer para voltar atrás.
 */
const antes = (await estado()).tabs.find((t) => t.id === aba).appearance.fontFamily
const escolhida = await ev(`document.querySelector('[data-fonte-amostra]').style.fontFamily`)

await abrirMenu('[data-fonte-da-saida]')
const alvoDoMouse = await ev(`
  (() => {
    const amostra = document.querySelector('[data-fonte-amostra]')
    const outro = [...document.querySelectorAll('[data-fonte-item]')].find(
      (b) => b.style.fontFamily !== amostra.style.fontFamily
    )
    if (!outro) return null
    const r = outro.getBoundingClientRect()
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), familia: outro.style.fontFamily }
  })()
`)
if (alvoDoMouse) await mover(alvoDoMouse.x, alvoDoMouse.y)
const previa = alvoDoMouse?.familia ?? null
const naAmostra = await ev(`document.querySelector('[data-fonte-amostra]').style.fontFamily`)
const depois = (await estado()).tabs.find((t) => t.id === aba).appearance.fontFamily
conferir(
  'passar o mouse redesenha a amostra na fonte de baixo do cursor',
  previa !== null && naAmostra === previa,
  `${escolhida} → ${naAmostra}`
)
conferir('e não grava nada no estado', antes === depois, `${antes} → ${depois}`)

// fechar o menu devolve a amostra à fonte escolhida
await fecharMenu('[data-fonte-da-saida]')
const voltou = await ev(`document.querySelector('[data-fonte-amostra]').style.fontFamily`)
conferir('fechar o menu devolve a amostra à escolhida', voltou === escolhida, voltou)

socket.close()
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo')
process.exit(falhas ? 1 : 0)
