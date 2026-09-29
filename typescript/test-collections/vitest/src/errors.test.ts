import { describe, expect, it } from "vitest"
import { ConfigError, ExpiredError, LinkForgeError, NotFoundError, isRetryable } from "./errors"

describe("LinkForgeError", () => {
  it("carries a machine readable code", () => {
    const error = new LinkForgeError("boom", "boom")

    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe("boom")
    expect(error.name).toBe("LinkForgeError")
  })
})

describe("ConfigError", () => {
  it("joins every issue into the message", () => {
    const error = new ConfigError(["baseUrl is required", "ttlSeconds must be positive"])

    expect(error.message).toBe(
      "invalid configuration: baseUrl is required; ttlSeconds must be positive",
    )
    expect(error.code).toBe("config_invalid")
  })

  it("keeps the issues addressable", () => {
    expect(new ConfigError(["slugLength too short"]).issues).toEqual(["slugLength too short"])
  })
})

describe("NotFoundError", () => {
  it("names the slug", () => {
    expect(new NotFoundError("abcd").message).toBe("no link for slug abcd")
  })
})

describe("ExpiredError", () => {
  it("formats the expiry as an ISO timestamp", () => {
    const error = new ExpiredError("abcd", Date.UTC(2026, 0, 2, 3, 4, 5))

    expect(error.message).toBe("link abcd expired at 2026-01-02T03:04:05.000Z")
    expect(error.expiredAt).toBe(Date.UTC(2026, 0, 2, 3, 4, 5))
  })
})

describe("isRetryable", () => {
  it("is true only for a taken slug", () => {
    expect(isRetryable(new LinkForgeError("taken", "slug_taken"))).toBe(true)
    expect(isRetryable(new NotFoundError("abcd"))).toBe(false)
    expect(isRetryable(new Error("taken"))).toBe(false)
    expect(isRetryable("slug_taken")).toBe(false)
  })
})
