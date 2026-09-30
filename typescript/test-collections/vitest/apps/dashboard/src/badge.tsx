export type BadgeProps = {
  clicks: number
  expired?: boolean
}

export type Tone = "muted" | "live" | "hot" | "expired"

export function labelFor(clicks: number): string {
  if (clicks >= 1000) {
    return `${(clicks / 1000).toFixed(1)}k clicks`
  }

  return clicks === 1 ? "1 click" : `${clicks} clicks`
}

export function toneFor({ clicks, expired = false }: BadgeProps): Tone {
  if (expired) {
    return "expired"
  }

  if (clicks >= 1000) {
    return "hot"
  }

  return clicks === 0 ? "muted" : "live"
}

export function Badge(props: BadgeProps) {
  return (
    <span class={`badge badge--${toneFor(props)}`} data-clicks={props.clicks}>
      {labelFor(props.clicks)}
    </span>
  )
}
