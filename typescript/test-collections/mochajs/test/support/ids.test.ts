import { expect } from "chai"

import { randomIds, sequentialIds } from "../../src/index.js"

describe("id generators", () => {
  describe("sequentialIds", () => {
    it("counts from one by default", () => {
      const next = sequentialIds("ord")

      expect([next(), next(), next()]).to.deep.equal(["ord-1", "ord-2", "ord-3"])
    })

    it("starts where it is told to", () => {
      expect(sequentialIds("res", 41)()).to.equal("res-41")
    })

    it("keeps separate generators independent", () => {
      const orders = sequentialIds("ord")
      const reservations = sequentialIds("res")

      orders()

      expect(reservations()).to.equal("res-1")
    })
  })

  describe("randomIds", () => {
    it("prefixes a uuid", () => {
      expect(randomIds("ord")()).to.match(
        /^ord-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })

    it("does not repeat itself", () => {
      const next = randomIds("ord")
      const ids = new Set([next(), next(), next()])

      expect(ids.size).to.equal(3)
    })
  })
})
