import { describe, expect, it } from "vitest"
import type { LinkRow } from "./link-list"
import { summarise } from "./totals"

const rows: LinkRow[] = [
  { slug: "abcd", target: "https://example.com/one", clicks: 40 },
  { slug: "efgh", target: "https://example.com/two", clicks: 2 },
  { slug: "ijkl", target: "https://example.com/three", clicks: 0, expired: true },
]

describe("summarise", () => {
  it("counts the links", () => {
    expect(summarise(rows).links).toBe(3)
  })

  it("counts the expired links", () => {
    expect(summarise(rows).expired).toBe(1)
  })

  it("names the most clicked slug", () => {
    expect(summarise(rows).topSlug).toBe("abcd")
  })

  it("handles an empty dashboard", () => {
    expect(summarise([])).toEqual({ links: 0, clicks: 0, expired: 0, topSlug: null })
  })

  // Deliberately wrong: the fixture's one red check. The clicks add up to 42.
  // Flip this to 42 to make `dagger check` green.
  it("sums the clicks", () => {
    expect(summarise(rows).clicks).toBe(99)
  })
})
