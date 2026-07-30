import { BrowserWindow, screen, type Display } from 'electron'
import type { DisplayInfo } from '@shared/types'

function orientation(display: Display): string {
  const { width, height } = display.size
  if (Math.abs(width - height) < 40) return 'quadrado'
  return width > height ? 'horizontal' : 'vertical'
}

export function describeDisplay(display: Display, index: number, primaryId: number): DisplayInfo {
  return {
    id: display.id,
    label: `Monitor ${index + 1} · ${orientation(display)} · ${display.size.width}×${display.size.height}`,
    bounds: display.bounds,
    size: display.size,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    internal: display.internal,
    primary: display.id === primaryId
  }
}

export function listDisplays(): DisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display, index) => describeDisplay(display, index, primaryId))
}

export function findDisplay(displayId: number | null): Display | null {
  if (displayId === null) return null
  return screen.getAllDisplays().find((d) => d.id === displayId) ?? null
}

export function watchDisplays(onChange: (displays: DisplayInfo[]) => void): () => void {
  const notify = (): void => onChange(listDisplays())
  screen.on('display-added', notify)
  screen.on('display-removed', notify)
  screen.on('display-metrics-changed', notify)
  return () => {
    screen.off('display-added', notify)
    screen.off('display-removed', notify)
    screen.off('display-metrics-changed', notify)
  }
}

let identifyWindows: BrowserWindow[] = []

/**
 * Números gigantes em cada monitor. Parece bobo até você ter três telas e
 * precisar descobrir qual delas o sistema chama de "monitor 2".
 */
export function identifyDisplays(durationMs = 2_600): void {
  closeIdentifyWindows()

  const primaryId = screen.getPrimaryDisplay().id
  identifyWindows = screen.getAllDisplays().map((display, index) => {
    const info = describeDisplay(display, index, primaryId)
    const window = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: false,
      backgroundColor: '#0b0b0b',
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      hasShadow: false,
      webPreferences: { sandbox: true }
    })

    window.setAlwaysOnTop(true, 'screen-saver')
    window.setIgnoreMouseEvents(true)
    void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(identifyMarkup(info))}`)
    return window
  })

  setTimeout(closeIdentifyWindows, durationMs)
}

function identifyMarkup(info: DisplayInfo): string {
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;background:#0b0b0b;color:#fff;
      font-family:system-ui,sans-serif;display:flex;align-items:center;
      justify-content:center;flex-direction:column;gap:2vh;overflow:hidden}
    .n{font-size:38vh;line-height:1;font-weight:600}
    .d{font-size:3vh;color:#8a8a86}
    .p{font-size:2.4vh;color:#5DCAA5}
  </style>
  <div class="n">${info.label.match(/\d+/)?.[0] ?? '?'}</div>
  <div class="d">${info.size.width} × ${info.size.height} · ${info.scaleFactor}x</div>
  ${info.primary ? '<div class="p">monitor principal</div>' : ''}`
}

export function closeIdentifyWindows(): void {
  for (const window of identifyWindows) {
    if (!window.isDestroyed()) window.destroy()
  }
  identifyWindows = []
}
