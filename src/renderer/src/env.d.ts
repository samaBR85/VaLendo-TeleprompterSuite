/// <reference types="vite/client" />

import type { ValendoApi } from '@shared/api'

declare global {
  interface Window {
    valendo: ValendoApi
  }

  /** injetados pelo electron-vite a partir do package.json */
  const __APP_VERSION__: string
  const __BUILD_NUMBER__: number
}
