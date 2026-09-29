import { describe, expect, it } from "vitest"
import { MAX_SLUG_LENGTH, MIN_SLUG_LENGTH, defaults, validate } from "./schema"

describe("validate", () => {
  it("accepts the defaults", () => {
    expect(validate(defaults)).toEqual([])
  })

  it("rejects a base url carrying a path", () => {
    expect(validate({ ...defaults, baseUrl: "https://lnk.fo/go" })).toBeIssueFor("baseUrl")
  })

  it("rejects a base url without a scheme", () => {
    expect(validate({ ...defaults, baseUrl: "lnk.fo" })).toBeIssueFor("baseUrl")
  })

  it.each([
    ["below the minimum", MIN_SLUG_LENGTH - 1],
    ["above the maximum", MAX_SLUG_LENGTH + 1],
    ["fractional", 6.5],
  ])("rejects a slug length %s", (_why, slugLength) => {
    expect(validate({ ...defaults, slugLength })).toBeIssueFor("slugLength")
  })

  it.each([MIN_SLUG_LENGTH, MAX_SLUG_LENGTH])("accepts the boundary length %i", (slugLength) => {
    expect(validate({ ...defaults, slugLength })).toEqual([])
  })

  it("rejects a non positive ttl", () => {
    expect(validate({ ...defaults, ttlSeconds: 0 })).toBeIssueFor("ttlSeconds")
  })

  it("reports every issue at once", () => {
    const issues = validate({ baseUrl: "nope", slugLength: 0, ttlSeconds: -1 })

    expect(issues.map((issue) => issue.field)).toEqual(["baseUrl", "slugLength", "ttlSeconds"])
  })
})
