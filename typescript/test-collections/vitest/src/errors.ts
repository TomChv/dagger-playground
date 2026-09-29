export class LinkForgeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = "LinkForgeError"
  }
}

export class ConfigError extends LinkForgeError {
  constructor(readonly issues: readonly string[]) {
    super(`invalid configuration: ${issues.join("; ")}`, "config_invalid")
    this.name = "ConfigError"
  }
}

export class NotFoundError extends LinkForgeError {
  constructor(readonly slug: string) {
    super(`no link for slug ${slug}`, "link_not_found")
    this.name = "NotFoundError"
  }
}

export class ExpiredError extends LinkForgeError {
  constructor(
    readonly slug: string,
    readonly expiredAt: number,
  ) {
    super(`link ${slug} expired at ${new Date(expiredAt).toISOString()}`, "link_expired")
    this.name = "ExpiredError"
  }
}

export function isRetryable(error: unknown): boolean {
  return error instanceof LinkForgeError && error.code === "slug_taken"
}
