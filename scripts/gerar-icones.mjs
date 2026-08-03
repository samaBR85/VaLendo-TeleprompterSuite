/**
 * Gera os arquivos de ícone a partir dos SVG de `build/icone/`.
 *
 * ARTE POR TAMANHO, e não uma arte reduzida. As três linhas da arte grande
 * valem 3px numa grade de 96 — a 16px isso é meio pixel, que o Windows pinta
 * como cinza lavado. Então o desenho muda com o tamanho: três linhas no
 * grande, duas no médio, uma no pequeno. É o que Adobe e Apple fazem, e a
 * razão é aritmética, não gosto.
 *
 *   node scripts/gerar-icones.mjs
 *
 * Precisa do Chrome instalado: ele é o rasterizador. Não há dependência nova
 * no `package.json` por causa disso — um pacote de rasterização de SVG só para
 * rodar uma vez a cada troca de marca não paga o próprio peso.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const origem = join(raiz, 'build', 'icone')
const saida = join(origem, 'png')

/** Qual arte serve cada tamanho. A troca acontece onde o traço deixaria de ser pixel inteiro. */
const TAMANHOS = [
  { px: 16, arte: 'arte-1' },
  { px: 24, arte: 'arte-1' },
  { px: 32, arte: 'arte-2' },
  { px: 48, arte: 'arte-2' },
  { px: 64, arte: 'arte-3' },
  { px: 128, arte: 'arte-3' },
  { px: 256, arte: 'arte-3' },
  { px: 512, arte: 'arte-3' },
  { px: 1024, arte: 'arte-3' }
]

/** O .ico do Windows leva só até 256: é o maior que o formato admite. */
const NO_ICO = [16, 24, 32, 48, 64, 128, 256]

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find((c) => existsSync(c))

if (!CHROME) {
  console.error('Não achei o Chrome. Ele é o rasterizador destes ícones.')
  process.exit(1)
}

mkdirSync(saida, { recursive: true })

/**
 * Uma página por tamanho, com o SVG ocupando exatamente o quadrado pedido.
 *
 * `margin:0` e um corpo do tamanho do ícone: o screenshot da janela inteira JÁ
 * é o ícone, sem recorte nenhum — recorte por coordenada erraria por um pixel
 * de vez em quando, e num ícone de 16 isso é 6% da largura.
 */
function pagina(arte, px) {
  const svg = readFileSync(join(origem, `${arte}.svg`), 'utf8')
  const semTamanho = svg.replace(/\swidth="1024"\sheight="1024"/, '')
  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent;width:${px}px;height:${px}px;overflow:hidden}
  svg{display:block;width:${px}px;height:${px}px}
</style>
${semTamanho}`
}

console.log('rasterizando:')
for (const { px, arte } of TAMANHOS) {
  const html = join(saida, `_tmp-${px}.html`)
  const png = join(saida, `icon-${px}.png`)
  writeFileSync(html, pagina(arte, px), 'utf8')
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--screenshot=${png}`,
      `--window-size=${px},${px}`,
      `--virtual-time-budget=2000`,
      html
    ],
    { stdio: 'pipe' }
  )
  rmSync(html)
  const b = readFileSync(png)
  const largura = b.readUInt32BE(16)
  const altura = b.readUInt32BE(20)
  if (largura !== px || altura !== px) {
    console.error(`  ERRO: ${png} saiu ${largura}x${altura}, esperado ${px}x${px}`)
    process.exit(1)
  }
  console.log(`  ${px}px · ${arte} · ${(b.length / 1024).toFixed(1)} kB`)
}

/**
 * Empacota o .ico à mão.
 *
 * O formato aceita PNG dentro de cada entrada desde o Vista, e é isso que
 * permite guardar SETE artes diferentes num arquivo só — que é o ponto de todo
 * este script. Um .ico gerado por redução automática teria uma arte só.
 */
function empacotarIco(arquivos) {
  const n = arquivos.length
  const cabecalho = Buffer.alloc(6)
  cabecalho.writeUInt16LE(0, 0) // reservado
  cabecalho.writeUInt16LE(1, 2) // 1 = ícone
  cabecalho.writeUInt16LE(n, 4)

  const diretorio = Buffer.alloc(16 * n)
  let deslocamento = 6 + 16 * n
  arquivos.forEach(({ px, dados }, i) => {
    const p = 16 * i
    // 256 se escreve como 0: o campo tem um byte só
    diretorio.writeUInt8(px >= 256 ? 0 : px, p)
    diretorio.writeUInt8(px >= 256 ? 0 : px, p + 1)
    diretorio.writeUInt8(0, p + 2) // cores da paleta
    diretorio.writeUInt8(0, p + 3) // reservado
    diretorio.writeUInt16LE(1, p + 4) // planos
    diretorio.writeUInt16LE(32, p + 6) // bits por pixel
    diretorio.writeUInt32LE(dados.length, p + 8)
    diretorio.writeUInt32LE(deslocamento, p + 12)
    deslocamento += dados.length
  })

  return Buffer.concat([cabecalho, diretorio, ...arquivos.map((a) => a.dados)])
}

const ico = empacotarIco(
  NO_ICO.map((px) => ({ px, dados: readFileSync(join(saida, `icon-${px}.png`)) }))
)
writeFileSync(join(raiz, 'build', 'icon.ico'), ico)
console.log(`\nbuild/icon.ico · ${NO_ICO.length} tamanhos · ${(ico.length / 1024).toFixed(1)} kB`)

// o macOS e o Linux partem deste; o electron-builder deriva o .icns dele
writeFileSync(join(raiz, 'build', 'icon.png'), readFileSync(join(saida, 'icon-1024.png')))
console.log('build/icon.png · 1024px, arte de três linhas')
