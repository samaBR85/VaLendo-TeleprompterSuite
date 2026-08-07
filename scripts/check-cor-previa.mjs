/**
 * Pressionar mostra a cor, soltar confirma, soltar fora devolve.
 *
 * O seletor de cor sempre confirmou no clique: para comparar três cores era
 * preciso cometer as três. A prévia por pressão dá o que faltava — desistir —,
 * e desistir é a parte que pode quebrar calada: se a devolução falhar, o
 * operador fica com uma cor que ele recusou, e só descobre olhando.
 *
 * Este script cobra os três gestos com o ponteiro DE VERDADE (CDP), e mais as
 * duas coisas que a prévia poderia estragar sem aparecer: a roda de cores
 * recentes e a pilha do desfazer.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-cor-previa.mjs
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
const cdp = (method, params = {}) => {
  const id = ++seq
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => esperando.set(id, { resolve, reject }))
}
const ev = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails))
  return r.result.value
}
const estado = () => ev(`(async () => (await window.valendo.getState()).state)()`)

/* o ponteiro de verdade: o componente escuta eventos de PONTEIRO, e o
   Chromium só os deriva de entrada real — um `MouseEvent` fabricado à mão
   passaria batido pelo `onPointerEnter` que faz o arrasto trocar de cor */
const mouse = async (type, x, y, pressionado) => {
  await cdp('Input.dispatchMouseEvent', {
    type,
    x: Math.round(x),
    y: Math.round(y),
    button: 'left',
    buttons: pressionado ? 1 : 0,
    clickCount: type === 'mousePressed' || type === 'mouseReleased' ? 1 : 0
  })
  await espera(180)
}

let falhas = 0
const conferir = (rotulo, ok, detalhe = '') => {
  if (!ok) falhas++
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

if (await ev(`Boolean(document.querySelector('[data-welcome-acao]'))`)) {
  await ev(`document.querySelector('[data-welcome-acao="demo"]').click()`)
  await espera(1_200)
}

/** centro de dois quadrados da paleta aberta, mais as cores deles */
const doisQuadrados = () =>
  ev(`
    (() => {
      const q = [...document.querySelectorAll('[data-seletor-de-cor] [data-cor]')]
      if (q.length < 30) return null
      const centro = (e) => { const b = e.getBoundingClientRect()
        return { x: b.left + b.width / 2, y: b.top + b.height / 2, cor: e.getAttribute('data-cor') } }
      const painel = document.querySelector('[data-seletor-de-cor]').getBoundingClientRect()
      return { a: centro(q[14]), b: centro(q[26]), foraX: painel.left + painel.width / 2, foraY: painel.bottom + 40 }
    })()
  `)

/* ------------------------------------------ a cor do TEXTO da saída */

console.log('— a cor do texto —')
await ev(`document.querySelector('[data-aba="texto"]')?.click()`)
await espera(400)
const aba = (await estado()).activeTabId
const corDeOrigem = (await estado()).tabs.find((t) => t.id === aba).appearance.textColor

/*
 * Abre se estiver fechada — e a diferença importa.
 *
 * Desistir NÃO fecha a paleta, de propósito: quem soltou fora recusou aquela
 * cor, não a escolha inteira, e fechar obrigaria a reabrir para tentar a
 * seguinte. Um `click` cego no gatilho, portanto, fecharia o que já estava
 * aberto — foi o que quebrou este script na primeira versão.
 */
const abrir = async (seletor) => {
  if (await ev(`document.querySelector('[data-seletor-de-cor]') === null`)) {
    await ev(`document.querySelector('${seletor}').click()`)
  }
  await espera(450)
}
const corAgora = async () => (await estado()).tabs.find((t) => t.id === aba).appearance.textColor

await abrir('[data-ajuda="insp.textColor"] button')
let q = await doisQuadrados()
conferir('a paleta abriu', q !== null)

if (q) {
  await mouse('mousePressed', q.a.x, q.a.y, true)
  conferir('pressionar já aplica a cor', (await corAgora()).toLowerCase() === q.a.cor.toLowerCase(), await corAgora())

  await mouse('mouseMoved', q.b.x, q.b.y, true)
  conferir('arrastar troca ao vivo', (await corAgora()).toLowerCase() === q.b.cor.toLowerCase(), await corAgora())

  await mouse('mouseMoved', q.foraX, q.foraY, true)
  await mouse('mouseReleased', q.foraX, q.foraY, false)
  conferir(
    'soltar FORA devolve a cor de antes',
    (await corAgora()).toLowerCase() === corDeOrigem.toLowerCase(),
    `${corDeOrigem} → ${await corAgora()}`
  )

  // e agora o caminho feliz: soltar em cima confirma e fecha
  await abrir('[data-ajuda="insp.textColor"] button')
  q = await doisQuadrados()
  await mouse('mousePressed', q.a.x, q.a.y, true)
  await mouse('mouseReleased', q.a.x, q.a.y, false)
  conferir('soltar EM CIMA confirma', (await corAgora()).toLowerCase() === q.a.cor.toLowerCase(), await corAgora())
  conferir('e a paleta fecha', (await ev(`document.querySelector('[data-seletor-de-cor]') === null`)) === true)

  await ev(`window.valendo.dispatch({ type: 'appearance/patch', tabId: '${aba}', patch: { textColor: '${corDeOrigem}' } })`)
  await espera(250)
}

/* ------------------------------------------------- o conta-gotas */

console.log('\n— o conta-gotas, sobre texto selecionado —')

/* semeia e seleciona uma palavra; o conta-gotas só liga com seleção */
await ev(`
  (() => {
    const area = document.querySelector('[data-sem-roda] textarea')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(area, 'Boa noite. A palavra alfa fica aqui para ser pintada.')
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })()
`)
await espera(900)
const selecionar = async () => {
  await ev(`
    (() => {
      const area = document.querySelector('[data-sem-roda] textarea')
      const i = area.value.indexOf('alfa')
      area.focus()
      area.setSelectionRange(i, i + 4)
      /* como o mouse selecionaria: a barra de ferramentas se atualiza pelos
         eventos de ponteiro e tecla, e um evento de selecao sozinho ela nao
         escuta — o conta-gotas continuaria desligado, por falta de selecao */
      area.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      area.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      area.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
    })()
  `)
  await espera(400)
}
await selecionar()

const marcasDaAba = async () => {
  const s = await estado()
  return s.tabs.find((t) => t.id === aba).blocks.flatMap((b) => b.marcas ?? [])
}
const recentesAntes = (await estado()).maquina.coresRecentes.join(',')

await abrir('[data-conta-gotas]')
q = await doisQuadrados()
conferir('a paleta do conta-gotas abriu', q !== null)

if (q) {
  await mouse('mousePressed', q.a.x, q.a.y, true)
  const pintadas = await marcasDaAba()
  conferir(
    'pressionar pinta o trecho de verdade',
    pintadas.some((m) => m.cor?.toLowerCase() === q.a.cor.toLowerCase()),
    JSON.stringify(pintadas.map((m) => m.cor))
  )

  await mouse('mouseMoved', q.b.x, q.b.y, true)
  await mouse('mouseMoved', q.foraX, q.foraY, true)
  await mouse('mouseReleased', q.foraX, q.foraY, false)
  const depois = await marcasDaAba()
  conferir(
    'desistir devolve o trecho SEM cor',
    depois.every((m) => !m.cor),
    JSON.stringify(depois)
  )

  conferir(
    'e a roda de recentes não andou com a prévia',
    (await estado()).maquina.coresRecentes.join(',') === recentesAntes,
    `${recentesAntes} → ${(await estado()).maquina.coresRecentes.join(',')}`
  )
}

/* ------------------------------- um Ctrl+Z desfaz o arrasto inteiro */

console.log('\n— o custo no desfazer —')

/*
 * A promessa que importa não é o tamanho da pilha, é o gesto de voltar.
 *
 * A primeira versão contava a profundidade antes e depois e acusava três
 * passos onde há um: no meio do arrasto cai também o `texto` do editor
 * despejando o que estava digitado, e a conta somava passo que não é do
 * arrasto. Lido do arquivo de histórico, as três pintadas dividem o MESMO
 * `id` — fundiram, como manda o `coalesceMs` de 400ms em `shared/history.ts`,
 * já que o rótulo de pintar é o mesmo trecho a cada cor.
 *
 * Contar pilha mede o mecanismo. Desfazer mede o que o operador sente.
 */
await selecionar()
await abrir('[data-conta-gotas]')
q = await doisQuadrados()
if (q) {
  // uma cor de partida, confirmada, para ter a que voltar
  await mouse('mousePressed', q.a.x, q.a.y, true)
  await mouse('mouseReleased', q.a.x, q.a.y, false)
  await espera(500)
  const partida = (await marcasDaAba()).map((m) => m.cor).join(',')

  await selecionar()
  await abrir('[data-conta-gotas]')
  q = await doisQuadrados()
  await mouse('mousePressed', q.b.x, q.b.y, true)
  await mouse('mouseMoved', q.a.x, q.a.y, true)
  await mouse('mouseMoved', q.b.x, q.b.y, true)
  await mouse('mouseReleased', q.b.x, q.b.y, false)
  await espera(500)
  const chegada = (await marcasDaAba()).map((m) => m.cor).join(',')
  conferir('o arrasto trocou a cor', chegada !== partida, `${partida} → ${chegada}`)

  /*
   * Desfaz até a cor voltar, e conta quantas vezes precisou.
   *
   * O arrasto é UM passo — medido no arquivo de histórico, onde as pintadas
   * dividem o mesmo `id`. Mas por cima dele costuma cair um passo de `texto`:
   * o editor redescobre o rascunho depois que a marca muda o bloco, e despeja.
   * Isso já acontecia antes desta mudança, com um clique simples, e não é do
   * arrasto — por isso a conta aceita esse acompanhante e reprova o que
   * importaria de verdade, que é um passo POR QUADRADO.
   */
  const desfazerAte = async (destino) => {
    let n = 0
    while ((await marcasDaAba()).map((m) => m.cor).join(',') !== destino && n < 8) {
      await ev(`window.valendo.dispatch({ type: 'history/undo', tabId: '${aba}' })`)
      await espera(600)
      n += 1
    }
    return n
  }
  const doArrasto = await desfazerAte(partida)
  conferir('o arrasto volta ao que era', doArrasto > 0 && doArrasto < 8, `${doArrasto} desfazer(es)`)

  /*
   * E agora o mesmo, com um CLIQUE simples — a régua contra a qual medir.
   *
   * A conta absoluta não diz nada: junto de cada pintada cai um passo de
   * `texto`, porque o editor redescobre o rascunho depois que a marca mexe no
   * bloco, e isso já era assim antes desta mudança. O que este recurso não
   * pode fazer é cobrar um passo POR QUADRADO percorrido — e é isso que a
   * comparação com o clique mede, sem depender de quantos acompanhantes o
   * editor traz.
   */
  await selecionar()
  await abrir('[data-conta-gotas]')
  q = await doisQuadrados()
  await mouse('mousePressed', q.b.x, q.b.y, true)
  await mouse('mouseReleased', q.b.x, q.b.y, false)
  await espera(500)
  const doClique = await desfazerAte(partida)
  conferir(
    'e arrastar pela paleta não custa mais desfazeres que um clique',
    doArrasto <= doClique,
    `arrasto ${doArrasto} · clique ${doClique}`
  )
}

socket.close()
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo')
process.exit(falhas ? 1 : 0)
