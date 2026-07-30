export type IconName =
  | 'play'
  | 'pause'
  | 'restart'
  | 'up'
  | 'down'
  | 'mirror'
  | 'contrast'
  | 'blackout'
  | 'freeze'
  | 'monitor'
  | 'expand'
  | 'collapse'
  | 'plus'
  | 'close'
  | 'marker'
  | 'undo'
  | 'redo'
  | 'keyboard'
  | 'rotate'
  | 'search'
  | 'info'
  | 'import'

const PATHS: Record<IconName, string> = {
  play: 'M8 5l11 7-11 7z',
  pause: 'M9 5v14M15 5v14',
  restart: 'M4 12a8 8 0 1 0 8-8M4 12V6M4 12h6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  mirror: 'M12 3v18M8 7L4 12l4 5M16 7l4 5-4 5',
  contrast: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  blackout: 'M4 4h16v16H4zM4 4l16 16',
  freeze: 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  expand: 'M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6',
  collapse: 'M10 4v6H4M14 20v-6h6M4 10l6-6M20 14l-6 6',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  marker: 'M6 3h12v18l-6-5-6 5z',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12H8',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h6',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
  rotate: 'M3 12a9 9 0 1 1 3 6.7M3 12V7M3 12h5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8h.01M11 12h1v5h1',
  import: 'M12 3v12M8 11l4 4 4-4M4 19h16'
}

interface Props {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 16, className }: Props): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
