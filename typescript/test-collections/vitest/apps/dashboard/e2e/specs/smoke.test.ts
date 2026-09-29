import { describe, expect, it } from "vitest"
import { redirectFor, type FixtureLink } from "../src/redirect"

const live: FixtureLink = {
  slug: "abcd",
  target: "https://example.com/one",
  clicks: 40,
  expired: false,
}

describe("redirectFor", () => {
  it("permanently redirects a live link", () => {
    expect(redirectFor(live)).toEqual({ status: 301, location: "https://example.com/one" })
  })

  it("answers 410 for an expired link", () => {
    expect(redirectFor({ ...live, expired: true })).toEqual({ status: 410 })
  })

  it("answers 404 for an unknown slug", () => {
    expect(redirectFor(undefined)).toEqual({ status: 404 })
  })
})
