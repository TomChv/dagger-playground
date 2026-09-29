import { describe, expect, it } from "vitest"
import { RESERVED, isValid, reject } from "./validate"

describe("reject", () => {
  it("accepts a plain base62 slug", () => {
    expect(reject("aZ09")).toBeNull()
  })

  it.each([
    ["", "empty"],
    ["thirteenchars", "too_long"],
    ["admin", "reserved"],
    ["ADMIN", "reserved"],
    ["has-dash", "bad_charset"],
    ["has space", "bad_charset"],
    ["under_score", "bad_charset"],
    ["slash/es", "bad_charset"],
  ])("rejects %o as %s", (slug, expected) => {
    expect(reject(slug)).toBe(expected)
  })

  it("honours a custom maximum length", () => {
    expect(reject("abcde", 4)).toBe("too_long")
    expect(reject("abcd", 4)).toBeNull()
  })

  it("checks the reserved list before the charset", () => {
    expect(reject("health")).toBe("reserved")
  })

  it.skip("accepts a punycode slug once IDN support lands", () => {
    expect(reject("xn--caf-dma")).toBeNull()
  })
})

describe("isValid", () => {
  it("mirrors reject", () => {
    expect(isValid("aZ09")).toBe(true)
    expect(isValid("api")).toBe(false)
  })
})

describe("RESERVED", () => {
  it("is lowercase only", () => {
    for (const slug of RESERVED) {
      expect(slug).toBe(slug.toLowerCase())
    }
  })
})
