interface Props {
  /** altura da palavra principal, em px */
  size?: number
  subtitle?: boolean
}

/**
 * Logomarca: "Valendo" grande, "A Teleprompter Suite" pequeno embaixo.
 * O tom mais claro em "Va" continua marcando as duas sílabas do nome, mesmo
 * sem o L maiúsculo do meio.
 */
export function Wordmark({ size = 15, subtitle = true }: Props): React.JSX.Element {
  return (
    <div className="flex flex-none flex-col justify-center leading-none">
      <span style={{ fontSize: size, fontWeight: 500, letterSpacing: '-0.015em' }}>
        <span style={{ color: 'var(--color-fog-1)' }}>Va</span>
        <span style={{ color: 'var(--color-fog-0)' }}>lendo</span>
      </span>
      {subtitle ? (
        <span
          style={{ fontSize: Math.max(8, size * 0.42), letterSpacing: '0.13em', marginTop: size * 0.22 }}
          className="text-[var(--color-fog-2)]"
        >
          A Teleprompter Suite
        </span>
      ) : null}
    </div>
  )
}

export function versionLabel(): string {
  return `v${__APP_VERSION__} - build ${__BUILD_NUMBER__}`
}
