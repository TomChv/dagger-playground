import { Badge } from "./badge"

export type LinkRow = {
  slug: string
  target: string
  clicks: number
  expired?: boolean
}

export function LinkList({ rows }: { rows: readonly LinkRow[] }) {
  if (rows.length === 0) {
    return <p class="empty">No links yet</p>
  }

  return (
    <ul class="links">
      {rows.map((row) => (
        <li key={row.slug} class="links__row">
          <a href={`/${row.slug}`}>{row.slug}</a>
          <span class="links__target">{row.target}</span>
          <Badge clicks={row.clicks} expired={row.expired} />
        </li>
      ))}
    </ul>
  )
}
