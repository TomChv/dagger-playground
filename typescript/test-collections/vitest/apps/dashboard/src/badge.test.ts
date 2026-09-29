import { describe, expect, it } from "vitest"
import { labelFor, toneFor } from "./badge"

describe("labelFor", () => {
  it.each([
    [0, "0 clicks"],
    [1, "1 click"],
    [2, "2 clicks"],
    [999, "999 clicks"],
    [1000, "1.0k clicks"],
    [12_345, "12.3k clicks"],
  ])("labels %i as %s", (clicks, expected) => {
    expect(labelFor(clicks)).toBe(expected)
  })
})

describe("toneFor", () => {
  it("is muted without a single click", () => {
    expect(toneFor({ clicks: 0 })).toBe("muted")
  })

  it("is live once clicked", () => {
    expect(toneFor({ clicks: 1 })).toBe("live")
  })

  it("is hot past a thousand clicks", () => {
    expect(toneFor({ clicks: 1000 })).toBe("hot")
  })

  it("prefers expired over every other tone", () => {
    expect(toneFor({ clicks: 5000, expired: true })).toBe("expired")
  })
})
