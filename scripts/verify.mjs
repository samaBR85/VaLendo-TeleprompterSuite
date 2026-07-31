/**
 * Verificação de ponta a ponta do critério de aceite: a palavra sob a marca de
 * leitura não pode se mover quando o roteiro é editado ou a aparência muda com
 * a rolagem em curso.
 *
 * Dirige o app pelo protocolo de depuração do Chromium, então testa o caminho
 * real de comandos, IPC, relógio e medição de layout — não uma simulação.
 *
 *   1. npm run build
 *   2. npm run start:debug     (num terminal)
 *   3. npm run verify          (noutro)
 *
 * Cada checagem devolve o app ao estado em que o encontrou.
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)
const MOD = { alt: 1, ctrl: 2, shift: 8 }
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
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    },
    async press(key, code, modifiers = 0, text) {
      const base = { key, code, modifiers, windowsVirtualKeyCode: 0 }
      await send('Input.dispatchKeyEvent', { type: 'keyDown', text, ...base })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
      await wait(150)
    },
    /**
     * Escreve como quem digita.
     *
     * Antes isto forjava o evento: mexia no valor do textarea por baixo do
     * React e disparava um `input` à mão. Parou de surtir efeito — o React
     * reconhece o valor como já visto e devolve o texto anterior —, e o
     * aceite passou a medir o próprio truque em vez de medir o app. Digitar
     * de verdade não tem esse risco, e é o que o operador faz.
     */
    async type(text) {
      await send('Input.insertText', { text })
      await wait(150)
    }
  }
}

/** Palavra exatamente sob a marca, pela mesma convenção de `pixelFromAnchor`. */
const READ = `(() => {
  const mark = document.querySelector('[data-reading-mark]')
  if (!mark) return null
  const m = mark.getBoundingClientRect()
  const y = m.top + m.height / 2
  const lines = [...document.querySelectorAll('[data-line]')]
  const i = lines.findIndex((l) => { const b = l.getBoundingClientRect(); return b.top <= y && y < b.bottom })
  const scroller = lines[0]?.parentElement
  const style = scroller ? getComputedStyle(scroller) : null
  let word = null
  let dentro = null
  if (i >= 0) {
    const b = lines[i].getBoundingClientRect()
    const words = lines[i].textContent.trim().split(/\\s+/)
    const f = (y - b.top) / b.height
    dentro = f
    word = words[Math.min(words.length - 1, Math.floor(f * words.length))]
  }
  return {
    index: i, word, dentro, lines: lines.length,
    fontSize: style?.fontSize, paddingLeft: style?.paddingLeft, transform: style?.transform
  }
})()`

const results = []
const check = (label, passed, detail = '') => results.push({ label, passed, detail })

const operatorTarget = (await pages()).find((target) => target.url.includes('operator.html'))
if (!operatorTarget) {
  console.error('O app não está rodando com depuração. Use: npm run start:debug')
  process.exit(2)
}

const app = connect(operatorTarget)
await app.ready

/*
 * Espera o app estar de fato montado antes de medir.
 *
 * Conectar não é estar pronto: as fileiras que governam a régua de rolagem só
 * existem depois que a prévia desenha e devolve a medição ao main. Medindo
 * antes disso, o aceite lia um layout provisório e acusava deriva que não
 * houve — foi o que fez este teste oscilar entre 8/8 e 6/8 sem nada ter
 * mudado no app.
 */
for (let i = 0; i < 40; i += 1) {
  const pronto = await app.evaluate(`(() => {
    const linhas = document.querySelectorAll('[data-line]').length
    const marca = document.querySelector('[data-reading-mark]')
    return linhas > 5 && marca !== null
  })()`)
  const rows = await app.evaluate(`window.valendo.getState().then((s) => s.rows.length)`)
  if (pronto && rows > 5) break
  await wait(250)
}

const space = () => app.press(' ', 'Space', 0, ' ')
const restart = () => app.press('Home', 'Home', MOD.ctrl)

/**
 * Leva a leitura para o meio do roteiro e pausa.
 *
 * Salta por comando em vez de deixar rolar por 2,2s: o quanto o texto anda
 * nesse tempo depende do ritmo e da régua, e quando parava perto do zero o
 * aceite media outra coisa — no começo do documento, inserir "acima do ponto
 * de leitura" é inserir acima de tudo, e aí não há âncora para segurar. O que
 * este teste precisa provar é a edição no MEIO, que é onde dói.
 */
async function parkMidScript() {
  await restart()
  await app.evaluate(`window.valendo.dispatch({ type: 'transport/seekWords', delta: 40 })`)
  await wait(600)

  /*
   * Avança até a marca cair sobre uma palavra de verdade.
   *
   * Entre dois parágrafos existe uma linha em branco, que é diagramação e não
   * texto. Parando ali, "a palavra sob a marca" é string vazia — e comparar
   * vazio com vazio não prova nada, enquanto sair do vazio acusa um erro que
   * não houve. A garantia só é mensurável onde há palavra.
   */
  for (let i = 0; i < 10; i += 1) {
    const { word, dentro } = await app.evaluate(READ)
    // longe das bordas: encostada no fim de uma linha, a marca escorrega para a
    // linha de baixo com qualquer mudança de corpo, e o teste acusaria deriva
    // onde houve arredondamento
    if (word && word.trim() && dentro > 0.2 && dentro < 0.8) return
    await app.evaluate(`window.valendo.dispatch({ type: 'transport/seekWords', delta: 3 })`)
    await wait(300)
  }
}

// 1. edição acima do ponto de leitura
await parkMidScript()
const beforeEdit = await app.evaluate(READ)
check('marca sobre uma linha', beforeEdit.index >= 0, `index=${beforeEdit.index}`)

// o cursor no começo do roteiro, e o texto entra ACIMA do ponto de leitura —
// que é justamente o caso que o app existe para aguentar
await app.evaluate(`(() => {
  const ta = document.querySelector('textarea')
  ta.focus()
  ta.setSelectionRange(0, 0)
})()`)
await app.type('PARAGRAFO DE TESTE NO TOPO.\n\nOUTRO PARAGRAFO DE TESTE.\n\n')
await wait(900)

const afterEdit = await app.evaluate(READ)
check('texto acima cresceu', afterEdit.lines > beforeEdit.lines, `${beforeEdit.lines} -> ${afterEdit.lines} linhas`)
check('palavra firme na edição', beforeEdit.word === afterEdit.word, `"${beforeEdit.word}" -> "${afterEdit.word}"`)

await app.press('Z', 'KeyZ', MOD.ctrl)
await wait(600)

// 2. troca de aparência ao vivo
await parkMidScript()
const beforeLook = await app.evaluate(READ)
await wait(700)
const stable = await app.evaluate(READ)
check('rolagem pausada', beforeLook.transform === stable.transform, beforeLook.transform)

for (let i = 0; i < 3; i += 1) await app.press('=', 'Equal', MOD.ctrl)
for (let i = 0; i < 2; i += 1) await app.press('+', 'Equal', MOD.ctrl | MOD.shift)
await wait(800)

const afterLook = await app.evaluate(READ)
check('corpo mudou', beforeLook.fontSize !== afterLook.fontSize, `${beforeLook.fontSize} -> ${afterLook.fontSize}`)
check('margem mudou', beforeLook.paddingLeft !== afterLook.paddingLeft, `${beforeLook.paddingLeft} -> ${afterLook.paddingLeft}`)
check('rolagem reposicionada', beforeLook.transform !== afterLook.transform, `${beforeLook.transform} -> ${afterLook.transform}`)
check('palavra firme na aparência', beforeLook.word === afterLook.word, `"${beforeLook.word}" -> "${afterLook.word}"`)

for (let i = 0; i < 2; i += 1) await app.press('-', 'Minus', MOD.ctrl | MOD.shift)
for (let i = 0; i < 3; i += 1) await app.press('-', 'Minus', MOD.ctrl)
await restart()

console.log()
let failures = 0
for (const { label, passed, detail } of results) {
  if (!passed) failures += 1
  console.log(`${passed ? '  OK  ' : ' FALHA'}  ${label.padEnd(28)} ${detail}`)
}
console.log(`\n${results.length - failures}/${results.length} verificações passaram`)

app.socket.close()
process.exit(failures === 0 ? 0 : 1)
