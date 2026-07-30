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
  if (i >= 0) {
    const b = lines[i].getBoundingClientRect()
    const words = lines[i].textContent.trim().split(/\\s+/)
    const f = (y - b.top) / b.height
    word = words[Math.min(words.length - 1, Math.floor(f * words.length))]
  }
  return {
    index: i, word, lines: lines.length,
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

const space = () => app.press(' ', 'Space', 0, ' ')
const restart = () => app.press('Home', 'Home', MOD.ctrl)

/** Leva a leitura para o meio do roteiro e pausa, para não medir no ponto zero. */
async function parkMidScript() {
  await restart()
  await space()
  await wait(2200)
  await space()
  await wait(500)
}

// 1. edição acima do ponto de leitura
await parkMidScript()
const beforeEdit = await app.evaluate(READ)
check('marca sobre uma linha', beforeEdit.index >= 0, `index=${beforeEdit.index}`)

await app.evaluate(`(() => {
  const ta = document.querySelector('textarea')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
  setter.call(ta, 'PARAGRAFO DE TESTE NO TOPO.\\n\\nOUTRO PARAGRAFO DE TESTE.\\n\\n' + ta.value)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
})()`)
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
