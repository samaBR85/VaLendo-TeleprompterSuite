import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  version: string
  buildNumber: number
}

const alias = {
  '@shared': resolve('src/shared'),
  '@': resolve('src/renderer/src')
}

// versão e build viram constantes no bundle: o app sabe se identificar sem
// precisar ler package.json em tempo de execução
const define = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __BUILD_NUMBER__: JSON.stringify(pkg.buildNumber)
}

export default defineConfig({
  main: {
    define,
    plugins: [externalizeDepsPlugin()],
    resolve: { alias }
  },
  preload: {
    define,
    plugins: [externalizeDepsPlugin()],
    resolve: { alias }
  },
  renderer: {
    define,
    root: resolve('src/renderer'),
    resolve: { alias },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          operator: resolve('src/renderer/operator.html'),
          broadcast: resolve('src/renderer/broadcast.html'),
          // a página que quem está na rede local abre no navegador; servida
          // pelo processo principal, não carregada numa janela
          webview: resolve('src/renderer/webview.html')
        }
      }
    }
  }
})
