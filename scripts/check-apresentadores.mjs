/**
 * Dois apresentadores, cada um com a sua cor.
 *
 * Carrega o roteiro de teste de verdade, registra HARI e ROBSON pelo caminho
 * do operador (selecionar o nome no editor e clicar no botão) e confere que a
 * cor sai igual nas duas superfícies — a transmissão e o editor.
 *
 * A seleção é feita com mouseup depois de mexer no `selectionRange`: o React
 * não sintetiza `onSelect` a partir de um evento `select` disparado à mão, ele
 * o deriva de mouse e teclado. Dirigir por onde o operador dirige é o que faz
 * este teste provar alguma coisa.
 *
 *   1. npm run build
 *   2. npm run start:debug
 *   3. node scripts/check-apresentadores.mjs
 */
import { readFileSync } from 'node:fs'

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
    JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })
  )
  const r = await new Promise((resolve, reject) => esperando.set(id, { resolve, reject }))
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result.value
}

let falhas = 0
const ok = (rotulo, cond, detalhe = '') => {
  if (!cond) falhas++
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${rotulo}${detalhe ? ` — ${detalhe}` : ''}`)
}

const roteiro = readFileSync('teste_projetos/ROTEIRO-2_apresentadores.txt', 'utf-8')

/*
 * Os nomes saem do PRÓPRIO roteiro, não de constantes aqui.
 *
 * Já custou uma rodada de falsos negativos: o operador renomeou "HARI" para
 * "HARIANE" no arquivo, o script continuou procurando o nome antigo e reprovou
 * meia dúzia de coisas que estavam certas. Deixa é a primeira linha de um
 * parágrafo que se repete — é o que define uma deixa num roteiro.
 */
const primeiras = roteiro
  .split(/\n{2,}/)
  .map((p) => p.split('\n')[0].trim())
  .filter((l) => l.length > 0 && !l.startsWith('#'))
const vezes = new Map()
for (const l of primeiras) vezes.set(l, (vezes.get(l) ?? 0) + 1)
const [NOME_A, NOME_B] = [...vezes.entries()]
  .filter(([, n]) => n > 1)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 2)
  .map(([nome]) => nome)
if (!NOME_A || !NOME_B) throw new Error('o roteiro de teste não tem dois nomes que se repetem')
console.log(`apresentadores no roteiro: ${NOME_A} e ${NOME_B}
`)
/*
 * Semeia pelo MESMO caminho por onde a digitação chega ao main.
 *
 * Escrever no `value` do textarea e disparar `input` parecia mais realista,
 * mas é frágil: depende do rastreador interno do React e falhou em silêncio
 * quando a aba já tinha um roteiro parecido — o teste seguiu rodando sobre o
 * texto velho e reprovou coisas que estavam certas. A ação é o contrato de
 * verdade; a digitação já é coberta pelos outros scripts.
 */
await ev(`
  window.valendo.getState().then((s) =>
    window.valendo.dispatch({ type: 'text/set', tabId: s.state.activeTabId, text: ${JSON.stringify(roteiro)} })
  )
`)
await espera(900)

/*
 * Limpa os apresentadores que já estivessem registrados.
 *
 * O script escreve por cima da aba ativa, mas a LISTA de apresentadores é
 * outra coisa e sobrevive — e um teste que depende do estado deixado pela
 * sessão anterior não prova nada. Já custou uma rodada inteira de falsos
 * negativos: o operador tinha renomeado HARI para HARIANE testando à mão.
 */
while ((await ev(`document.querySelectorAll('[data-apresentador-chip]').length`)) > 0) {
  await ev(`document.querySelector('[data-apresentador-chip] button[aria-label]:last-of-type').click()`)
  await espera(250)
}

/** Seleciona um nome no editor como o mouse selecionaria, e clica no botão. */
async function registrar(nome) {
  const marca = `\n${nome}\n`
  const selecionado = await ev(`
    (() => {
      const area = document.querySelector('[data-sem-roda] textarea')
      const i = area.value.indexOf(${JSON.stringify(marca)}) + 1
      if (i <= 0) return null
      area.focus()
      area.setSelectionRange(i, i + ${nome.length})
      // o React deriva onSelect de mouse/teclado, não do evento 'select' — e
      // o par mousedown/mouseup é o que o plugin dele observa
      area.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      area.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      area.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
      document.dispatchEvent(new Event('selectionchange'))
      return area.value.slice(area.selectionStart, area.selectionEnd)
    })()
  `)
  await espera(300)
  const podeClicar = await ev(`!document.querySelector('[data-ajuda="editor.presenter"]').disabled`)
  ok(`selecionar "${nome}" acende o botão de apresentador`, selecionado === nome && podeClicar === true, String(selecionado))
  await ev(`document.querySelector('[data-ajuda="editor.presenter"]').click()`)
  await espera(400)
}

await registrar(NOME_A)
await registrar(NOME_B)

const chips = await ev(`[...document.querySelectorAll('[data-apresentador-chip]')].map((c) => c.innerText.trim())`)
ok('os dois chips aparecem nos Ajustes', chips.length === 2, JSON.stringify(chips))

/* a prova principal: na transmissão, a fala de cada um sai na cor dele, e o
   parágrafo sem nome continua com a cor de quem falava antes */
const palco = await ev(`
  (() => {
    const linhas = [...document.querySelectorAll('[data-line]')]
      .map((l) => ({ t: l.textContent.trim(), c: getComputedStyle(l).color }))
      .filter((x) => x.t)
    const acha = (inicio) => linhas.find((l) => l.t.startsWith(inicio))
    return {
      capitulo: acha('–') || acha('INÍCIO') || linhas[0],
      falaHari: acha('E agora The Bear'),
      continuacao: acha('O cara perde'),
      falaRobson: acha('Acima de tudo')
    }
  })()
`)
console.log(JSON.stringify(palco, null, 1))
ok('a fala do HARI ganhou cor própria', palco.falaHari && palco.falaHari.c !== 'rgb(255, 255, 255)', palco.falaHari?.c)
ok('o ROBSON tem cor diferente do HARI', palco.falaRobson?.c !== palco.falaHari?.c, `${palco.falaHari?.c} vs ${palco.falaRobson?.c}`)
ok('o parágrafo sem nome continua com quem falava', palco.continuacao?.c === palco.falaHari?.c, palco.continuacao?.c)
ok('o capítulo NÃO recebeu cor de apresentador', palco.capitulo?.c !== palco.falaHari?.c, palco.capitulo?.c)

/* e no editor a cor é a MESMA — é o que faz a prévia ser honesta */
const editor = await ev(`
  (() => {
    const spans = [...document.querySelectorAll('[data-sem-roda] pre span')]
    const i = spans.findIndex((s) => s.textContent.trim() === ${JSON.stringify(NOME_A)})
    if (i === -1) return null
    return {
      nome: getComputedStyle(spans[i]).color,
      peso: getComputedStyle(spans[i]).fontWeight,
      fala: getComputedStyle(spans[i + 1]).color
    }
  })()
`)
ok('o editor pinta a fala com a cor do apresentador', editor && editor.nome === editor.fala, JSON.stringify(editor))
ok('e a cor do editor é a mesma da transmissão', editor && editor.fala === palco.falaHari?.c, `${editor?.fala} vs ${palco.falaHari?.c}`)
ok('o nome vem em negrito, para se distinguir da fala', editor?.peso === '700', String(editor?.peso))

/* ------------------------------------------------- esconder o nome na saída */

const contaLinhas = `document.querySelectorAll('[data-line]').length`
const temNome = (n) =>
  `[...document.querySelectorAll('[data-line]')].some((l) => l.textContent.trim() === ${JSON.stringify(n)})`

const linhasAntes = await ev(contaLinhas)
ok('antes de esconder, os nomes estão na saída', (await ev(temNome(NOME_A))) === true)

await ev(`document.querySelectorAll('[data-esconder-apresentador]')[0].click()`)
await espera(500)
ok('esconder um tira o nome dele da saída', (await ev(temNome(NOME_A))) === false)
ok('e mantém o do outro', (await ev(temNome(NOME_B))) === true)

/*
 * A prova que separa esta implementação da fácil: a linha SAIU da composição.
 * Se ela só tivesse ficado invisível, a contagem seria a mesma — e a leitura
 * gastaria o tempo de uma linha parada em cada troca de apresentador.
 */
/*
 * E a COR sobrevive — o defeito que apareceu na tela: escondido o nome, a fala
 * voltava ao branco, justamente quando a cor é a única coisa que diz quem fala.
 */
const corEscondida = await ev(`
  (() => {
    const l = [...document.querySelectorAll('[data-line]')].find((x) => x.textContent.trim().startsWith('E agora The Bear'))
    return l ? getComputedStyle(l).color : null
  })()
`)
ok('a fala continua colorida com o nome escondido', corEscondida === palco.falaHari?.c, `${corEscondida} vs ${palco.falaHari?.c}`)

const linhasDepois = await ev(contaLinhas)
ok('a linha saiu da composição, não virou linha em branco', linhasDepois < linhasAntes, `${linhasAntes} → ${linhasDepois}`)

await ev(`document.querySelector('[data-esconder-global]').click()`)
await espera(500)
const comGlobal = await ev(`({
  hari: ${temNome(NOME_A)},
  robson: ${temNome(NOME_B)},
  travados: [...document.querySelectorAll('[data-esconder-apresentador]')].every((b) => b.disabled)
})`)
ok('o GLOBAL esconde todos', comGlobal.hari === false && comGlobal.robson === false, JSON.stringify(comGlobal))
ok('e trava os interruptores individuais', comGlobal.travados === true)

// desligar devolve tudo: o texto nunca foi tocado
await ev(`document.querySelector('[data-esconder-global]').click()`)
await espera(400)
await ev(`document.querySelectorAll('[data-esconder-apresentador]')[0].click()`)
await espera(600)
ok('desligar devolve os nomes', (await ev(temNome(NOME_A))) === true)
ok('e a composição volta ao tamanho de antes', (await ev(contaLinhas)) === linhasAntes, `${await ev(contaLinhas)} vs ${linhasAntes}`)
ok(
  'o roteiro no editor jamais perdeu o nome',
  (await ev(`document.querySelector('[data-sem-roda] textarea').value.includes(${JSON.stringify(NOME_A)})`)) === true
)

/* ------------------------------------------------------------- renomear */

/*
 * O duplo clique no chip renomeia o apresentador E as deixas no roteiro.
 *
 * O que se cobra aqui é o que separa isso de um "substituir tudo" ingênuo: o
 * nome citado NO MEIO de uma fala não pode ser tocado, e um Ctrl+Z tem de
 * desfazer as duas metades juntas — senão o texto voltaria a dizer um nome com
 * o chip já dizendo outro, e a cor sumiria sem explicação.
 */
const NOVO = NOME_A + ' OLIVEIRA'
const TEXTO = "document.querySelector('[data-sem-roda] textarea').value"
const contaDeixas = (n) =>
  TEXTO + ".split('\\n').filter((l) => l.trim() === " + JSON.stringify(n) + ').length'

const deixasAntes = await ev(contaDeixas(NOME_A))
ok('o roteiro tem várias deixas do mesmo apresentador', deixasAntes > 1, String(deixasAntes))

await ev(`
  (() => {
    const chip = document.querySelector('[data-apresentador-chip]')
    chip.querySelector('span[data-ajuda]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })()
`)
await espera(300)
ok('o duplo clique abre o campo de renomear', (await ev("Boolean(document.querySelector('[data-apresentador-nome]'))")) === true)

await ev(`
  (() => {
    const campo = document.querySelector('[data-apresentador-nome]')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(campo, ${JSON.stringify(NOVO)})
    campo.dispatchEvent(new Event('input', { bubbles: true }))
    campo.blur()
  })()
`)
await espera(700)

ok(
  'as deixas do roteiro trocaram de nome',
  (await ev(contaDeixas(NOVO))) === deixasAntes,
  `${await ev(contaDeixas(NOVO))} de ${deixasAntes}`
)
ok(
  'e o chip mostra o nome novo',
  (await ev(`document.querySelector('[data-apresentador-chip]').innerText.includes(${JSON.stringify(NOVO)})`)) === true
)
ok(
  'a fala continua colorida depois do renome',
  (await ev(`
    (() => {
      const l = [...document.querySelectorAll('[data-line]')].find((x) => x.textContent.trim().startsWith('E agora The Bear'))
      return l ? getComputedStyle(l).color : null
    })()
  `)) === palco.falaHari?.c
)

await ev(`
  window.valendo.getState().then((s) =>
    window.valendo.dispatch({ type: 'history/undo', tabId: s.state.activeTabId })
  )
`)
await espera(700)
const voltou = await ev(
  `({ deixas: ${contaDeixas(NOME_A)}, chip: document.querySelector('[data-apresentador-chip]').innerText.trim() })`
)
ok(
  'um desfazer devolve o roteiro E o chip juntos',
  voltou.deixas === deixasAntes && voltou.chip.includes(NOME_A) && !voltou.chip.includes('OLIVEIRA'),
  JSON.stringify(voltou)
)

socket.close()
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo')
process.exit(falhas ? 1 : 0)
