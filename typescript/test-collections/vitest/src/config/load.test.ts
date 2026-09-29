import { describe, expect, it } from "vitest"
import { envOf } from "../../test/helpers/env"
import { ConfigError } from "../errors"
import { load } from "./load"
import { defaults } from "./schema"

describe("load", () => {
  it("reads every field from the environment", () => {
    expect(load(envOf({ LINKFORGE_TTL_SECONDS: "90" }))).toEqual({
      baseUrl: "https://lnk.fo",
      slugLength: 7,
      ttlSeconds: 90,
    })
  })

  it("falls back to the defaults for an empty environment", () => {
    expect(load({})).toEqual(defaults)
  })

  it("treats an empty variable as unset", () => {
    expect(load(envOf({ LINKFORGE_SLUG_LENGTH: "" })).slugLength).toBe(defaults.slugLength)
  })

  it("raises a ConfigError naming the field", () => {
    expect(() => load(envOf({ LINKFORGE_BASE_URL: "https://lnk.fo/go" }))).toThrowError(
      /baseUrl must be an http\(s\) origin/,
    )
  })

  it("raises on an unparseable number", () => {
    let raised: unknown
    try {
      load(envOf({ LINKFORGE_SLUG_LENGTH: "seven" }))
    } catch (error) {
      raised = error
    }

    expect(raised).toBeInstanceOf(ConfigError)
    expect((raised as ConfigError).issues).toEqual(["slugLength must be an integer"])
  })
})
