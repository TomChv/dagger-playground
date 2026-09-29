// This directory is in the Vitest config's `exclude`, but static discovery does
// not read the config, so the module still lists this file as a test file.
// Selecting it on its own leaves Vitest with no file to run.
import { describe, expect, it } from "vitest"
import { labelFor } from "../badge"

describe("quarantined label rendering", () => {
  it("still agrees with the badge", () => {
    expect(labelFor(1)).toBe("1 click")
  })
})
