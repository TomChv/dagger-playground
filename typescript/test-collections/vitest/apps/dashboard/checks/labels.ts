// Reachable only through the `include` in vitest.config.ts: the default include
// matches *.test.* / *.spec.* files, which this is not. It therefore runs in a
// whole-project run and is absent from the module's test-file keys.
import { describe, expect, it } from "vitest"
import { labelFor, toneFor } from "../src/badge"

const counts = [0, 1, 2, 999, 1000, 250_000]

describe("badge labels read as a sentence", () => {
  it.each(counts)("labels %i in words a screen reader can read", (clicks) => {
    expect(labelFor(clicks)).toMatch(/^[\d.]+k? clicks?$/)
  })

  it("never renders a bare number", () => {
    for (const clicks of counts) {
      expect(labelFor(clicks)).not.toMatch(/^\d+$/)
    }
  })

  it("keeps a tone for every count", () => {
    for (const clicks of counts) {
      expect(toneFor({ clicks })).toMatch(/^(muted|live|hot|expired)$/)
    }
  })
})
