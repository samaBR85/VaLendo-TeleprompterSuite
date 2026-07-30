import { useCallback, useEffect, useMemo } from 'react'
import type { Action } from '@shared/actions'
import { anchorFromWordIndex, composeLines } from '@shared/anchor'
import { parseBinding, resolveKeymap } from '@shared/commands'
import { SPEED_PRESETS } from '@shared/defaults'
import { wordIndexAt } from '@shared/pacing'
import { chapterTitle } from '@shared/text'
import type { AppState, Tab } from '@shared/types'
import { ALWAYS_GLOBAL, isEditable, matchesEvent } from './keys'

export interface CommandUi {
  openPalette: () => void
  openKeymap: () => void
  toggleFocusMode: () => void
  /** manda agora, sem esperar o debounce, o que ainda estiver pendente no editor. */
  flushEditor: () => void
}

function blockIdUnderReadingLine(state: AppState, tab: Tab): string | null {
  const lines = composeLines(tab.blocks, {
    minWords: tab.appearance.minWords,
    maxWords: tab.appearance.maxWords
  })
  const anchor = anchorFromWordIndex(lines, wordIndexAt(state.transport, Date.now()))
  return anchor?.blockId ?? null
}

function seekBlock(dispatch: (a: Action) => void, blockId: string): void {
  dispatch({ type: 'transport/seekAnchor', anchor: { blockId, wordOffset: 0 } })
}

function stepThrough(
  ids: string[],
  currentId: string | null,
  blocks: Tab['blocks'],
  direction: 1 | -1
): string | null {
  if (ids.length === 0) return null
  const order = new Map(blocks.map((b, i) => [b.id, i]))
  const current = currentId ? (order.get(currentId) ?? -1) : -1
  const sorted = [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))

  if (direction === 1) return sorted.find((id) => (order.get(id) ?? 0) > current) ?? sorted[0]
  return [...sorted].reverse().find((id) => (order.get(id) ?? 0) < current) ?? sorted[sorted.length - 1]
}

export function useCommands(
  state: AppState | null,
  dispatch: (action: Action) => void,
  ui: CommandUi
): { run: (commandId: string) => void; keymap: Map<string, string> } {
  const keymap = useMemo(() => resolveKeymap(state?.keymap ?? {}), [state?.keymap])

  const run = useCallback(
    (commandId: string) => {
      if (!state) return
      const tab = state.tabs.find((t) => t.id === state.activeTabId)
      if (!tab) return

      const tabSwitch = /^tab\.switch\.(\d+)$/.exec(commandId)
      if (tabSwitch) {
        const target = state.tabs[Number(tabSwitch[1]) - 1]
        if (target) dispatch({ type: 'tab/activate', tabId: target.id })
        return
      }

      const markerGoto = /^marker\.goto\.(\d+)$/.exec(commandId)
      if (markerGoto) {
        const marker = tab.markers[Number(markerGoto[1]) - 1]
        if (marker) seekBlock(dispatch, marker.blockId)
        return
      }

      const speedPreset = /^speed\.set\.(\d+)$/.exec(commandId)
      if (speedPreset) {
        const ppm = SPEED_PRESETS[Number(speedPreset[1]) - 1]
        if (ppm) dispatch({ type: 'transport/ppm', ppm })
        return
      }

      switch (commandId) {
        case 'transport.playPause':
          dispatch({ type: 'transport/toggle' })
          break
        case 'transport.restart':
          dispatch({ type: 'transport/restart' })
          break
        case 'transport.jumpBack':
          dispatch({ type: 'transport/seekWords', delta: -6 })
          break
        case 'transport.jumpForward':
          dispatch({ type: 'transport/seekWords', delta: 6 })
          break
        case 'transport.freeze':
          dispatch({ type: 'transport/freeze' })
          break

        case 'speed.increase':
          dispatch({ type: 'transport/nudgePpm', delta: 1 })
          break
        case 'speed.decrease':
          dispatch({ type: 'transport/nudgePpm', delta: -1 })
          break

        case 'marker.create': {
          const blockId = blockIdUnderReadingLine(state, tab)
          if (!blockId) break
          const block = tab.blocks.find((b) => b.id === blockId)
          const label =
            block?.kind === 'chapter'
              ? chapterTitle(block)
              : (block?.text.split(/\s+/).slice(0, 4).join(' ') ?? 'Marcador')
          dispatch({ type: 'marker/add', tabId: tab.id, blockId, label })
          break
        }
        case 'marker.next':
        case 'marker.prev': {
          const target = stepThrough(
            tab.markers.map((m) => m.blockId),
            blockIdUnderReadingLine(state, tab),
            tab.blocks,
            commandId === 'marker.next' ? 1 : -1
          )
          if (target) seekBlock(dispatch, target)
          break
        }
        case 'chapter.next':
        case 'chapter.prev': {
          const target = stepThrough(
            tab.blocks.filter((b) => b.kind === 'chapter').map((b) => b.id),
            blockIdUnderReadingLine(state, tab),
            tab.blocks,
            commandId === 'chapter.next' ? 1 : -1
          )
          if (target) seekBlock(dispatch, target)
          break
        }

        case 'font.increase':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { fontSize: tab.appearance.fontSize + 4 } })
          break
        case 'font.decrease':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { fontSize: tab.appearance.fontSize - 4 } })
          break
        case 'margin.increase':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { marginPct: tab.appearance.marginPct + 1 } })
          break
        case 'margin.decrease':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { marginPct: tab.appearance.marginPct - 1 } })
          break
        case 'words.increase':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { maxWords: tab.appearance.maxWords + 1 } })
          break
        case 'words.decrease':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { maxWords: tab.appearance.maxWords - 1 } })
          break
        case 'colors.invert':
          dispatch({ type: 'appearance/invert', tabId: tab.id })
          break

        case 'output.blackout':
          dispatch({ type: 'transport/blackout' })
          break
        case 'output.mirror':
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { mirrorX: !tab.appearance.mirrorX } })
          break
        case 'output.rotate': {
          const next = ((tab.appearance.rotation + 90) % 360) as 0 | 90 | 180 | 270
          dispatch({ type: 'appearance/patch', tabId: tab.id, patch: { rotation: next } })
          break
        }
        case 'output.toggle':
          dispatch({
            type: 'output/set',
            displayId: state.output.displayId,
            enabled: !state.output.enabled
          })
          break

        case 'edit.undo':
          // sem isso, desfazer logo após digitar reverte um passo mais antigo
          // do que o esperado — a digitação mais recente ainda não tinha
          // chegado ao histórico do main quando o desfazer foi disparado
          ui.flushEditor()
          dispatch({ type: 'history/undo', tabId: tab.id })
          break
        case 'edit.redo':
          ui.flushEditor()
          dispatch({ type: 'history/redo', tabId: tab.id })
          break
        case 'tab.new':
          dispatch({ type: 'tab/add' })
          break
        case 'tab.close':
          dispatch({ type: 'tab/close', tabId: tab.id })
          break

        case 'view.focusMode':
          ui.toggleFocusMode()
          break
        case 'palette.open':
          ui.openPalette()
          break
        case 'keymap.open':
          ui.openKeymap()
          break
      }
    },
    [state, dispatch, ui]
  )

  useEffect(() => {
    const isMac = window.valendo.platform === 'darwin'

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat && event.key === ' ') return
      const editable = isEditable(event.target)

      for (const [commandId, text] of keymap) {
        const binding = parseBinding(text)
        if (!binding || !matchesEvent(binding, event, isMac)) continue

        // dentro do editor, tecla sem modificador pertence ao texto — Espaço
        // não pode virar play no meio de uma frase
        if (editable && !binding.mod && !binding.alt && !ALWAYS_GLOBAL.test(binding.key)) continue

        event.preventDefault()
        run(commandId)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keymap, run])

  return { run, keymap }
}
