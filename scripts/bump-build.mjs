/**
 * Sobe o número de build a cada `npm run build`.
 *
 * A versão semântica (1.0.0) é decisão humana e fica parada; o build é só um
 * carimbo para saber qual binário está na mão de quem — quando alguém relata
 * um problema, "v1.0.0 - build 47" identifica exatamente o código.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(path, 'utf8'))

pkg.buildNumber = (Number(pkg.buildNumber) || 0) + 1
writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

console.log(`v${pkg.version} - build ${pkg.buildNumber}`)
