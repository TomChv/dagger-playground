import { ConfigError } from "../errors"
import { defaults, validate, type LinkForgeConfig } from "./schema"

type Env = Record<string, string | undefined>

function integer(env: Env, key: string, fallback: number): number {
  const raw = env[key]
  if (raw === undefined || raw === "") {
    return fallback
  }

  const parsed = Number(raw)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

export function load(env: Env): LinkForgeConfig {
  const config: LinkForgeConfig = {
    baseUrl: env.LINKFORGE_BASE_URL ?? defaults.baseUrl,
    slugLength: integer(env, "LINKFORGE_SLUG_LENGTH", defaults.slugLength),
    ttlSeconds: integer(env, "LINKFORGE_TTL_SECONDS", defaults.ttlSeconds),
  }

  const issues = validate(config)
  if (issues.length > 0) {
    throw new ConfigError(issues.map((issue) => `${issue.field} ${issue.message}`))
  }

  return config
}
