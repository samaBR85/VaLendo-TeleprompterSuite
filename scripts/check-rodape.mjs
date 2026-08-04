/**
 * Confere o rodapé refeito e a nova casa do alvo de duração.
 *
 * As duas coisas andam juntas porque foram a mesma decisão: o rodapé só ficou
 * sem controle nenhum porque o alvo mudou de casa, e o alvo só coube ao pé da
 * régua porque não precisou de largura nova. O que se checa aqui é justamente
 * isso — que o rodapé não opera mais nada, que o alvo opera de verdade, e que
 * o mostrador de velocidade continua com a MESMA largura de antes.
 *
 *   1. npm run build
 *   2. npm run start:debug     (num terminal)
 *   3. node scripts/check-rodape.mjs
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function pages() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return (await response.json()).filter((target) => target.type === 'page')
}

function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  const waiting = new Map()
  let seq = 0

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const pending = waiting.get(message.id)
    if (!pending) return
    waiting.delete(message.id)
    if (message.error) pending.reject(new Error(JSON.stringify(message.error)))
    else pending.resolve(message.result)
  })

  const send = (method, params = {}) => {
    const id = ++seq
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => waiting.set(id, { resolve, reject }))
  }

  return {
    socket,
    send,
    ready: new Promise((resolve) => socket.addEventListener('open', resolve)),
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    },
    /**
     * Clique pelo DOM, não por coordenada.
     *
     * A escala da interface é um zoom de página, e com ela ligada as duas
     * réguas deixam de coincidir: `getBoundingClientRect` responde em pixel do
     * documento ampliado, enquanto `Input.dispatchMouseEvent` mira o pixel da
     * janela. Um clique calculado por retângulo pousa longe do botão — e o
     * sintoma não é erro, é uma checagem que passa por engano porque nada
     * mudou. `el.click()` dispara um evento de clique de verdade, que sobe até
     * o React igual, e não depende de régua nenhuma.
     */
    async click(selector) {
      const achou = await this.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)})
        if (!el) return false
        el.click()
        return true
      })()`)
      if (!achou) throw new Error(`não achei ${selector}`)
      await wait(250)
    },
    async type(text) {
      await send('Input.insertText', { text })
      await wait(150)
    },
    async press(key, code) {
      const base = { key, code, modifiers: 0, windowsVirtualKeyCode: 0 }
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
      await wait(250)
    }
  }
}

const results = []
const check = (label, passed, detail = '') => results.push({ label, passed, detail })

const operatorTarget = (await pages()).find((target) => target.url.includes('operator.html'))
if (!operatorTarget) {
  console.error('O app não está rodando com depuração. Use: npm run start:debug')
  process.exit(2)
}
const app = connect(operatorTarget)
await app.ready
await wait(400)

/* O modo sobrevive a fechar o app, então o ponto de partida não é dado: se a
   sessão anterior parou no Foco, não há rodapé nenhum para conferir. F1 põe a
   mesa no Split antes de qualquer medida. */
await app.press('F1', 'F1')
await wait(400)

/* ------------------------------------------------------------------ rodapé */

const rodape = await app.evaluate(`(() => {
  const f = document.querySelector('footer')
  if (!f) return null
  const estilo = getComputedStyle(f)
  return {
    altura: f.getBoundingClientRect().height,
    fundo: estilo.backgroundImage,
    campos: f.querySelectorAll('input, select, textarea').length,
    texto: f.innerText.replace(/\\s+/g, ' ').trim(),
    luz: Boolean(f.querySelector('[data-storage]')),
    luzEmPoco: Boolean(f.querySelector('[data-storage] .k-poco')),
    paleta: Boolean(f.querySelector('[data-palette]')),
    paletaTecla: f.querySelector('[data-palette]')?.className.includes('k-tecla') ?? false,
    modoEmPoco: Boolean(f.querySelector('[data-mode-switch] .k-poco-fundo')),
    modosEmRelevo: [...f.querySelectorAll('[data-mode]')].map((b) => b.className.includes('k-tecla')),
    ajudas: [...f.querySelectorAll('[data-ajuda]')].map((e) => e.getAttribute('data-ajuda'))
  }
})()`)

check('rodapé com 38px', Math.round(rodape.altura) === 38, `${rodape.altura}px`)
check('fundo em gradiente', rodape.fundo.includes('gradient'), rodape.fundo.slice(0, 40))
check('nenhum controle de texto', rodape.campos === 0, `${rodape.campos} campos`)
check('sem Words/Duration/Target', !/Words|Duration|Target/i.test(rodape.texto), rodape.texto)
check('luz de gravação em poço', rodape.luz && rodape.luzEmPoco)
check('Ctrl+K é tecla de verdade', rodape.paleta && rodape.paletaTecla)
check('seletor de modo em poço fundo', rodape.modoEmPoco)
check('três modos presentes', rodape.modosEmRelevo.length === 3, `${rodape.modosEmRelevo.length}`)
check(
  'ajuda em tudo que se aponta',
  ['status.storage', 'status.palette', 'status.modeSplit'].every((id) => rodape.ajudas.includes(id)),
  rodape.ajudas.join(', ')
)

/* a luz precisa estar VERDE quando está tudo bem — o sinal positivo é o motivo
   de a peça existir; sem ele, gravar e falhar teriam a mesma cara */
const luz = await app.evaluate(`(() => {
  const p = document.querySelector('[data-storage] span span')
  return p ? getComputedStyle(p).backgroundColor : null
})()`)
/* a cor sai de um `color-mix`, e o navegador devolve isso ora como
   `rgb(r, g, b)`, ora como `color(srgb r g b)` com frações — a checagem lê os
   três primeiros números, seja qual for a embalagem */
const [lr, lg, lb] = (luz ?? '').match(/[\d.]+/g)?.map(Number) ?? []
check('luz verde com o disco são', lg > lr && lg > lb, luz)

/* Trocar de modo pelo rodapé continua funcionando. Quem responde é o ESTADO,
   não a aparência da tela: procurar o efeito no DOM já custou uma checagem que
   passava por engano, porque a ausência que ela media tinha outra causa. */
const modo = `(async () => (await window.valendo.getState()).state.layoutMode)()`
await app.click('[data-mode="focus"]')
await wait(400)
const noFoco = await app.evaluate(modo)
check('clicar no modo troca de layout', noFoco === 'focus', noFoco)

/* e o rodapé continua na tela no Foco — tem de continuar: é por ele que se
   volta, e um modo sem saída seria uma armadilha */
check('o rodapé sobrevive ao Foco', await app.evaluate(`Boolean(document.querySelector('footer'))`))

await app.click('[data-mode="split"]')
await wait(400)
const deVolta = await app.evaluate(`(() => {
  const split = document.querySelector('footer [data-mode="split"]')
  const foco = document.querySelector('footer [data-mode="focus"]')
  return {
    voltou: Boolean(split),
    // só o escolhido é tecla; os outros ficam rentes ao fundo do poço
    splitEmRelevo: split?.className.includes('k-tecla') ?? false,
    focoSemFundo: foco ? getComputedStyle(foco).backgroundImage === 'none' : false
  }
})()`)
check('volta ao Split pelo rodapé', deVolta.voltou)
check('só o modo escolhido tem relevo', deVolta.splitEmRelevo && deVolta.focoSemFundo)

/* --------------------------------------------------------------------- alvo */

/*
 * O alvo só tem o que perseguir se houver palavras: com o roteiro vazio a
 * régua vale zero, e mudar o ritmo para caber num tempo qualquer é conta sem
 * dividendo. Em vez de exigir que o operador deixe a mesa num certo estado —
 * ou pior, de escrever por cima do roteiro dele —, a conferência abre uma aba
 * SÓ DELA, semeia um texto conhecido e fecha no fim.
 */
const abaAntes = await app.evaluate(`(async () => (await window.valendo.getState()).state.activeTabId)()`)
await app.evaluate(`window.valendo.dispatch({ type: 'tab/add' })`)
await wait(400)
const abaDoTeste = await app.evaluate(`(async () => (await window.valendo.getState()).state.activeTabId)()`)
check('abriu aba de teste', abaDoTeste !== abaAntes, `${abaAntes} -> ${abaDoTeste}`)

const ROTEIRO = Array.from({ length: 40 }, (_, i) => `linha ${i} com algumas palavras para medir`).join('\\n\\n')
await app.evaluate(`window.valendo.dispatch({ type: 'text/set', tabId: ${JSON.stringify(abaDoTeste)}, text: ${JSON.stringify(ROTEIRO)} })`)
await wait(700)

const antes = await app.evaluate(`(() => {
  const alvo = document.querySelector('[data-alvo]')
  const lcd = alvo?.closest('.k-lcd')
  const celula = alvo?.parentElement
  return {
    existe: Boolean(alvo),
    texto: alvo?.innerText.replace(/\\s+/g, ' ').trim() ?? null,
    larguraDoLcd: lcd ? Math.round(lcd.getBoundingClientRect().width) : null,
    larguraDaCelula: celula ? Math.round(celula.getBoundingClientRect().width) : null,
    noRodape: Boolean(document.querySelector('footer [data-alvo]')),
    ppm: document.querySelector('[data-progresso]') ? window.__ppm : null
  }
})()`)

check('alvo existe no console', antes.existe, antes.texto ?? '')
check('alvo NÃO está no rodapé', !antes.noRodape)
/* A promessa da opção 3: o alvo entrou sem alargar nada. A largura de
   projeto é 93px no topo e 74px na régua do rodapé (a versão compacta), e é
   contra ESSA — a mesma de antes do alvo — que se compara. */
const compacto = await app.evaluate(`(() => {
  const lcd = document.querySelector('[data-alvo]')?.closest('.k-lcd')
  return lcd ? Math.round(lcd.getBoundingClientRect().height) === 38 : false
})()`)
const naRegua = compacto
const larguraDeProjeto = compacto ? 74 : 93
check(
  'célula da régua não alargou',
  antes.larguraDaCelula === larguraDeProjeto,
  `${antes.larguraDaCelula}px (projeto: ${larguraDeProjeto}px, ${naRegua ? 'régua' : 'topo'})`
)

/* Parte de um ritmo ARBITRÁRIO antes de pedir a duração.
 *
 * Sem isso a checagem mede a si mesma: rodar duas vezes seguidas com o mesmo
 * texto e o mesmo alvo deixa o ppm já no valor da resposta, e "mudou" não tem
 * como ser observado mesmo com tudo funcionando. 200 não é a resposta de 0:30
 * para este roteiro, então qualquer valor diferente dele no fim é trabalho do
 * alvo. O ppm que o operador tinha já foi guardado em `ppmDoOperador`. */
const ppmDoOperador = await app.evaluate(`(async () => (await window.valendo.getState()).state.transport.ppm)()`)
await app.evaluate(`window.valendo.dispatch({ type: 'transport/ppm', ppm: 200 })`)
await wait(300)
const ppmAntes = 200

/* digitar uma duração é escolher a velocidade que a cumpre */
await app.click('[data-alvo]')
const virouCampo = await app.evaluate(`Boolean(document.querySelector('[data-alvo-campo]'))`)
check('clicar abre o campo', virouCampo)

await app.evaluate(`(() => {
  const campo = document.querySelector('[data-alvo-campo]')
  campo.select()
})()`)
await app.type('0:30')
await app.press('Enter', 'Enter')
await wait(400)

const depois = await app.evaluate(`(() => {
  const alvo = document.querySelector('[data-alvo]')
  return {
    texto: alvo?.innerText.replace(/\\s+/g, ' ').trim() ?? null,
    ppm: Number(document.querySelectorAll('.k-lcd .font-mono')[0]?.textContent),
    campoFechou: !document.querySelector('[data-alvo-campo]')
  }
})()`)

check('o campo fecha ao confirmar', depois.campoFechou)
check('digitar duração muda o ritmo', depois.ppm !== ppmAntes, `${ppmAntes} -> ${depois.ppm} ppm`)
/* comparar a direção do ppm não serve: se ele já estava no teto (500) ou no
   piso (60), pedir outra duração pode movê-lo para o lado "errado" e ainda
   assim estar certíssimo. O que prova o recurso é a duração ENTREGUE ser a
   pedida — e isso a checagem de coerência logo abaixo cobra por inteiro. */
check('a duração entregue é a pedida', depois.texto.includes('0:30'), depois.texto)

/* desistir com Escape não pode aplicar nada */
const ppmFirme = depois.ppm
await app.click('[data-alvo]')
await app.evaluate(`document.querySelector('[data-alvo-campo]').select()`)
await app.type('9:99')
await app.press('Escape', 'Escape')
await wait(300)
const aposEscape = await app.evaluate(`Number(document.querySelectorAll('.k-lcd .font-mono')[0]?.textContent)`)
check('Escape desiste sem aplicar', aposEscape === ppmFirme, `${ppmFirme} -> ${aposEscape}`)

/* o que se lê é sempre a duração corrente: não pode ficar guardado um número
   que o roteiro deixou de cumprir */
const coerente = await app.evaluate(`(() => {
  const alvo = document.querySelector('[data-alvo]')?.innerText.replace(/\\s+/g, ' ').trim() ?? ''
  const cab = [...document.querySelectorAll('.k-cabecalho')].map((c) => c.innerText).join(' ')
  const tempo = /(\\d+:\\d\\d)/.exec(alvo)?.[1] ?? null
  return { alvo, tempo, cabecalhoTem: tempo ? cab.includes(tempo) : false }
})()`)
check('alvo bate com a duração da Edição', coerente.cabecalhoTem, `${coerente.tempo} — ${coerente.alvo}`)

/* a mesa volta como estava: a aba do teste some e a que o operador usava
   recupera o foco */
await app.evaluate(`window.valendo.dispatch({ type: 'transport/ppm', ppm: ${ppmDoOperador} })`)
await app.evaluate(`window.valendo.dispatch({ type: 'tab/close', tabId: ${JSON.stringify(abaDoTeste)} })`)
await wait(500)
/* fechar uma aba dá o foco a outra por conta do app — qual, é decisão dele.
   O que a conferência devolve é a aba que o operador estava usando. */
await app.evaluate(`window.valendo.dispatch({ type: 'tab/activate', tabId: ${JSON.stringify(abaAntes)} })`)
await wait(300)
const fim = await app.evaluate(`(async () => {
  const { state } = await window.valendo.getState()
  return { sobrou: state.tabs.some((t) => t.id === ${JSON.stringify(abaDoTeste)}), ativa: state.activeTabId, ppm: state.transport.ppm }
})()`)
check('aba de teste fechada', !fim.sobrou)
check('a mesa volta como estava', fim.ativa === abaAntes && fim.ppm === ppmDoOperador, `aba ${fim.ativa}, ${fim.ppm} ppm`)

console.log()
let failures = 0
for (const { label, passed, detail } of results) {
  if (!passed) failures += 1
  console.log(`${passed ? '  OK  ' : ' FALHA'}  ${label.padEnd(34)} ${detail}`)
}
console.log(`\n${results.length - failures}/${results.length} verificações passaram`)

app.socket.close()
process.exit(failures === 0 ? 0 : 1)
