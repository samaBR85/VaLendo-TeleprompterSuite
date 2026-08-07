/**
 * Deixa o perfil de teste pronto para as checagens.
 *
 * O `npm run start:debug` sobe o app com `--user-data-dir=.perfil-de-teste`,
 * separado do workspace de verdade. Perfil separado nasce VAZIO: o app abre na
 * tela de estreia, sem roteiro nenhum. E quase toda checagem deste diretório
 * dá por certo que existe texto na tela — a `verify.mjs` mede a palavra sob a
 * marca de leitura, a `check-seguir` rola o roteiro, a `check-marcas-editor`
 * pinta trechos. Contra um perfil recém-criado elas não falham por defeito do
 * app: falham por não ter o que medir.
 *
 * Antes isso não aparecia porque o `start:debug` rodava contra o perfil do
 * operador, que sempre tem roteiro. O preço era abrir o app de verdade dele
 * para testar — e uma checagem que escreve no roteiro escrevia no roteiro dele.
 *
 * Este script fecha a estreia pelo caminho "demo", que semeia um roteiro de
 * exemplo. Roda uma vez por perfil: `.perfil-de-teste/` é uma pasta comum e
 * sobrevive entre execuções. Se apagar a pasta, rode de novo.
 *
 *   1. npm run build
 *   2. npm run start:debug     (num terminal)
 *   3. node scripts/preparar-perfil.mjs
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)
const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let alvos
try {
  alvos = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter(
    (t) => t.type === 'page'
  )
} catch {
  console.error('O app não está rodando com depuração. Use: npm run start:debug')
  process.exit(1)
}

const alvo = alvos.find((t) => t.url.includes('operator.html')) ?? alvos[0]
if (!alvo) {
  console.error('Nenhuma janela encontrada na porta ' + PORT)
  process.exit(1)
}

const ws = new WebSocket(alvo.webSocketDebuggerUrl)
const esperando = new Map()
let seq = 0
ws.addEventListener('message', (evento) => {
  const msg = JSON.parse(evento.data)
  const pendente = esperando.get(msg.id)
  if (!pendente) return
  esperando.delete(msg.id)
  if (msg.error) pendente.reject(new Error(JSON.stringify(msg.error)))
  else pendente.resolve(msg.result)
})
await new Promise((resolve) => ws.addEventListener('open', resolve))

const ev = (expressao) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    esperando.set(id, { resolve, reject })
    ws.send(
      JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression: expressao, awaitPromise: true, returnByValue: true }
      })
    )
  }).then((r) => r.result.value)

const blocos = () =>
  ev(`(async () => {
    const s = (await window.valendo.getState()).state
    const aba = s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]
    return aba ? aba.blocks.length : 0
  })()`)

const temEstreia = await ev(`Boolean(document.querySelector('[data-welcome-acao="demo"]'))`)

if (temEstreia) {
  await ev(`document.querySelector('[data-welcome-acao="demo"]').click()`)
  await espera(1400)
}

const quantos = await blocos()

if (quantos === 0) {
  console.error(
    temEstreia
      ? 'A estreia foi fechada pelo demo, mas o roteiro continua vazio.'
      : 'Sem tela de estreia e sem roteiro: o perfil está num estado inesperado.\n' +
          'Apague .perfil-de-teste/, suba o app de novo e rode este script.'
  )
  ws.close()
  process.exit(1)
}

console.log(
  temEstreia
    ? `perfil semeado pelo demo — ${quantos} blocos no roteiro`
    : `perfil já estava pronto — ${quantos} blocos no roteiro`
)
ws.close()
