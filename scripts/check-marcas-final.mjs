/**
 * A conferência de fechamento das marcas: as três telas, o arquivo antigo e as
 * seis bordas.
 *
 * O que os outros scripts NÃO cobrem. `check-marcas-editor` prova o editor,
 * `check-busca-cor` prova a barra — mas nenhum dos dois prova que a cor chega
 * à tela do apresentador, que é o único lugar onde uma marca de fato serve
 * para alguma coisa. E nenhum prova que um projeto gravado antes das marcas
 * existirem continua abrindo.
 *
 * As seis bordas de edição são as regras que o operador aprovou quando o
 * recurso foi desenhado. Elas já têm teste de unidade; aqui elas são feitas
 * pelo caminho de verdade — digitando no editor — porque o teste de unidade
 * prova a CONTA e este prova o caminho inteiro, do teclado ao bloco.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-marcas-final.mjs
 */
const PORT = Number(process.env.VALENDO_DEBUG_PORT ?? 9222)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/** Liga num alvo do depurador pelo pedaço da URL, e devolve um `ev` para ele. */
async function ligar(pedaco) {
  const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const alvo = lista.find((t) => t.type === 'page' && t.url.includes(pedaco))
  if (!alvo) return null
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
  return { ev, fechar: () => socket.close() }
}

const op = await ligar('operator')
if (!op) throw new Error('janela do operador não encontrada')
const ev = op.ev

let falhas = 0
const ok = (rotulo, cond, detalhe = '') => {
  if (!cond) falhas++
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

/* a estreia cobre tudo com um véu escuro, e toda cor medida sai escurecida */
if (await ev(`!!document.querySelector('[data-welcome]')`)) {
  await ev(`document.querySelector('[data-welcome-acao="demo"]').click()`)
  await espera(900)
}

const semear = async (texto) => {
  await ev(`
    window.valendo.getState().then((s) =>
      window.valendo.dispatch({ type: 'text/set', tabId: s.state.activeTabId, text: ${JSON.stringify(texto)} })
    )
  `)
  for (let i = 0; i < 40; i++) {
    if (await ev(`document.querySelector('[data-sem-roda] textarea')?.value === ${JSON.stringify(texto)}`)) return true
    await espera(150)
  }
  return false
}

/** As marcas do primeiro bloco, já fatiadas contra o texto dele. */
const cercadas = () =>
  ev(`
    window.valendo.getState().then((s) => {
      const t = s.state.tabs.find((t) => t.id === s.state.activeTabId)
      return JSON.stringify(t.blocks.flatMap((b) => (b.marcas ?? []).map((m) => b.text.slice(m.de, m.ate))))
    })
  `)

/** Pinta um trecho por ação — o caminho que a interface usa por baixo. */
const pintar = async (de, ate, cor = '#e5484d') => {
  await ev(`
    window.valendo.getState().then((s) =>
      window.valendo.dispatch({
        type: 'marca/aplicar', tabId: s.state.activeTabId,
        trechos: [{ de: ${de}, ate: ${ate} }], patch: { cor: ${JSON.stringify(cor)} }
      })
    )
  `)
  await espera(400)
}

/** Digita no editor pelo caminho do React, e espera o main receber. */
const digitar = async (novo) => {
  await ev(`
    (() => {
      const area = document.querySelector('[data-sem-roda] textarea')
      area.focus()
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setter.call(area, ${JSON.stringify(novo)})
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })()
  `)
  await espera(700)
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— as seis bordas, pelo teclado —')

/**
 * Cada caso: o texto, onde pintar, o texto depois de editar, e o que a marca
 * deve estar cercando no fim. A conferência é sempre contra a PALAVRA, nunca
 * contra um índice — índices decorados já me enganaram três vezes nesta sessão.
 */
const BORDAS = [
  {
    nome: 'digitar DENTRO faz a marca crescer',
    texto: 'A ação começa agora.',
    de: 2,
    ate: 6,
    depois: 'A açãozinha começa agora.',
    espera: ['açãozinha']
  },
  {
    nome: 'digitar COLADO NO FIM faz a marca crescer',
    texto: 'A ação começa agora.',
    de: 2,
    ate: 6,
    depois: 'A açãoX começa agora.',
    espera: ['açãoX']
  },
  {
    nome: 'digitar COLADO NO COMEÇO fica de fora',
    texto: 'A ação começa agora.',
    de: 2,
    ate: 6,
    depois: 'A Xação começa agora.',
    espera: ['ação']
  },
  {
    nome: 'apagar a palavra inteira mata a marca',
    texto: 'A ação começa agora.',
    de: 2,
    ate: 6,
    depois: 'A  começa agora.',
    espera: []
  },
  {
    nome: 'colar por cima mata a marca',
    texto: 'A ação começa agora.',
    de: 2,
    ate: 6,
    depois: 'A CENA começa agora.',
    espera: []
  },
  {
    nome: 'comer uma ponta encolhe a marca',
    texto: 'A ação começa agora.',
    de: 2,
    ate: 6,
    depois: 'A açã começa agora.',
    espera: ['açã']
  }
]

for (const caso of BORDAS) {
  await semear(caso.texto)
  await pintar(caso.de, caso.ate)
  await digitar(caso.depois)
  const fim = JSON.parse(await cercadas())
  ok(caso.nome, JSON.stringify(fim) === JSON.stringify(caso.espera), JSON.stringify(fim))
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— a cor chega às três telas —')

const COR = '#12a594'
const ROTEIRO = 'A palavra PINTADA aparece aqui no meio da fala.'
await semear(ROTEIRO)
await pintar(ROTEIRO.indexOf('PINTADA'), ROTEIRO.indexOf('PINTADA') + 7, COR)

const rgb = (() => {
  const n = parseInt(COR.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
})()

/** O trecho pintado, na cor calculada, dentro de um palco de prompter. */
const noPalco = (evAlvo) =>
  evAlvo(`
    (() => {
      const s = [...document.querySelectorAll('[data-marca]')].find((x) => x.textContent.includes('PINTADA'))
      return s ? getComputedStyle(s).color : null
    })()
  `)

ok('1 · editor', (await noPalco(ev)) === rgb, String(await noPalco(ev)))

const naPrevia = await ev(`
  (() => {
    const palco = document.querySelector('[data-prompter-stage], [data-palco]') || document
    const s = [...palco.querySelectorAll('[data-marca]')].filter((x) => x.textContent.includes('PINTADA'))
    return s.length
  })()
`)
ok('a prévia do operador também desenha', naPrevia >= 1, `${naPrevia} pedaço(s)`)

/*
 * A Transmissão, pela AÇÃO e não pelo botão.
 *
 * O botão `data-broadcast-toggle` mora na barra de transporte, que se
 * reorganiza conforme a largura da janela — numa janela estreita ele
 * simplesmente não está no DOM, e o script reprovava a Transmissão por não
 * achar o botão. A ação é o contrato de verdade; o botão já é coberto pelo
 * `verify.mjs`.
 */
/*
 * O monitor sai de `listDisplays()`, e não do estado.
 *
 * O `output.displayId` guardado pode ser de outra máquina — abrir um projeto
 * de fora traz o id do monitor de quem o gravou, e `findDisplay` devolve nulo
 * para um id que não existe aqui. Foi o que fez a Transmissão não abrir, e a
 * culpa não era da janela: era do id.
 */
const monitor = await ev(`window.valendo.listDisplays().then((d) => d[0]?.id ?? null)`)
await ev(`window.valendo.dispatch({ type: 'output/set', displayId: ${monitor}, enabled: true })`)
await espera(2500)
const bc = await ligar('broadcast')
if (!bc) {
  ok('2 · a janela da Transmissão abriu', false)
} else {
  ok('2 · a janela da Transmissão abriu', true)
  const corLa = await noPalco(bc.ev)
  ok('   e a palavra sai na cor certa lá', corLa === rgb, String(corLa))
  bc.fechar()
}

/* a rede: liga, pega o endereço e confere pelo próprio HTML servido */
await ev(`window.valendo.dispatch({ type: 'webview/set', enabled: true })`)
await espera(2000)
const rede = await ev(`window.valendo.getState().then((s) => JSON.stringify(s.webview))`)
const info = JSON.parse(rede)
ok('3 · a página da rede subiu', info.running === true, rede)
console.log(`     endereço: ${info.addresses?.[0] ?? '—'} · porta ${info.port}`)

/*
 * A página da rede o script não consegue LER: ela roda num navegador de fora,
 * não num alvo do depurador do Electron. Ele prova que o servidor subiu e
 * imprime o endereço; a prova do DOM foi feita à mão, abrindo o endereço num
 * navegador de verdade e conferindo que o `[data-marca]` chega lá com a cor:
 *
 *     {"quantos":1,"textos":["PINTADA"],"cores":["rgb(18, 165, 148)"]}
 *
 * — que é exatamente o #12a594 pintado no editor. Fica registrado aqui porque
 * um número conferido uma vez e não escrito em lugar nenhum é um número que
 * ninguém vai reconferir.
 */
console.log(`\n(abra o endereço acima num navegador e confira o [data-marca] colorido)`)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— um .valendo de ANTES das marcas —')

const ANTIGO = process.env.VALENDO_PROJETO_ANTIGO
if (!ANTIGO) {
  console.log('     (pulado: defina VALENDO_PROJETO_ANTIGO com o caminho do arquivo)')
} else {
  const resultado = await ev(`
    window.valendo.openProjectPath(${JSON.stringify(ANTIGO)}).then((r) => JSON.stringify(r))
  `)
  await espera(1200)
  ok('o arquivo antigo abriu', resultado !== 'null' && !resultado.includes('"error"'), String(resultado).slice(0, 160))
  const marcas = JSON.parse(await cercadas())
  ok('e veio sem marca nenhuma, como esperado', marcas.length === 0, JSON.stringify(marcas))
  const quebrou = await ev(`
    window.valendo.getState().then((s) => s.state.tabs.length > 0 && !!s.state.activeTabId)
  `)
  ok('o app continua inteiro depois de abrir', quebrou === true)
}

console.log(`\n${falhas === 0 ? 'tudo certo' : `${falhas} falha(s)`}`)
op.fechar()
process.exit(falhas === 0 ? 0 : 1)
