import { describe, expect, it } from "vitest"
import { legacyClass, legacyLabel } from "./badge"

describe("legacyLabel", () => {
  it("never abbreviates", () => {
    expect(legacyLabel(12_345)).toBe("12345 clicks")
  })

  it("pluralises a single click too", () => {
    expect(legacyLabel(1)).toBe("1 clicks")
  })
})

describe("legacyClass", () => {
  it("adds the on modifier once clicked", () => {
    expect(legacyClass(0)).toBe("badge")
    expect(legacyClass(1)).toBe("badge badge--on")
  })
})
