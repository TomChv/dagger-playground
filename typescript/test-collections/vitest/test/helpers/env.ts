export function envOf(overrides: Record<string, string> = {}): Record<string, string | undefined> {
  return {
    LINKFORGE_BASE_URL: "https://lnk.fo",
    LINKFORGE_SLUG_LENGTH: "7",
    LINKFORGE_TTL_SECONDS: "3600",
    ...overrides,
  }
}
