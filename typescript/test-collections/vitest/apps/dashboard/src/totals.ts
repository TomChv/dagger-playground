import type { LinkRow } from "./link-list"

export type Totals = {
  links: number
  clicks: number
  expired: number
  topSlug: string | null
}

export function summarise(rows: readonly LinkRow[]): Totals {
  const top = [...rows].sort((a, b) => b.clicks - a.clicks)[0]

  return {
    links: rows.length,
    clicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    expired: rows.filter((row) => row.expired === true).length,
    topSlug: top?.slug ?? null,
  }
}
