// Kept until the last dashboard embed is migrated to src/badge.tsx.
export function legacyLabel(clicks: number): string {
  return `${clicks} clicks`
}

export function legacyClass(clicks: number): string {
  return clicks > 0 ? "badge badge--on" : "badge"
}
