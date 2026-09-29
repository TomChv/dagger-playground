import { expect } from "chai"
import sinon from "sinon"

import { fixedClock, systemClock } from "../../src/index.js"
import { NOW } from "../helpers/fixtures.js"

describe("clocks", () => {
  describe("systemClock", () => {
    it("reads the wall clock", () => {
      const clock = sinon.useFakeTimers(NOW)

      expect(systemClock.now()).to.deep.equal(NOW)

      clock.tick(60_000)

      expect(systemClock.now().toISOString()).to.equal("2026-03-01T10:01:00.000Z")
    })
  })

  describe("fixedClock", () => {
    it("always reports the same instant", () => {
      const clock = fixedClock(NOW)
      sinon.useFakeTimers(new Date("2030-01-01T00:00:00.000Z"))

      expect(clock.now()).to.deep.equal(NOW)
    })

    it("hands out a copy callers cannot mutate", () => {
      const clock = fixedClock(NOW)

      clock.now().setFullYear(1999)

      expect(clock.now()).to.deep.equal(NOW)
    })
  })
})
