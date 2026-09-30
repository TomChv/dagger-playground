export type LinkForgeConfig = {
  baseUrl: string
  slugLength: number
  ttlSeconds: number
}

export type ConfigIssue = {
  field: keyof LinkForgeConfig
  message: string
}

export const MIN_SLUG_LENGTH = 4
export const MAX_SLUG_LENGTH = 12

export const defaults: LinkForgeConfig = {
  baseUrl: "https://lnk.fo",
  slugLength: 7,
  ttlSeconds: 60 * 60 * 24 * 30,
}

export function validate(config: LinkForgeConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = []

  if (!/^https?:\/\/[^\s/]+$/.test(config.baseUrl)) {
    issues.push({ field: "baseUrl", message: "must be an http(s) origin without a path" })
  }

  if (!Number.isInteger(config.slugLength)) {
    issues.push({ field: "slugLength", message: "must be an integer" })
  } else if (config.slugLength < MIN_SLUG_LENGTH || config.slugLength > MAX_SLUG_LENGTH) {
    issues.push({
      field: "slugLength",
      message: `must be between ${MIN_SLUG_LENGTH} and ${MAX_SLUG_LENGTH}`,
    })
  }

  if (config.ttlSeconds <= 0) {
    issues.push({ field: "ttlSeconds", message: "must be positive" })
  }

  return issues
}
