import { expect } from "chai"

import { Money } from "../../src/index.js"

describe("Money", () => {
  describe("construction", () => {
    it("keeps whole cents as given", () => {
      expect(Money.fromCents(1234).cents).to.equal(1234)
    })

    it("rejects fractional cents", () => {
      expect(() => Money.fromCents(10.5)).to.throw(RangeError, "whole cents")
    })

    it("converts decimal amounts to cents", () => {
      expect(Money.fromAmount(39.99).cents).to.equal(3999)
      expect(Money.fromAmount(24).cents).to.equal(2400)
    })

    it("rounds amounts to the nearest cent", () => {
      expect(Money.fromAmount(19.994).cents).to.equal(1999)
      expect(Money.fromAmount(19.996).cents).to.equal(2000)
    })

    it("rounds negative amounts away from zero", () => {
      expect(Money.fromAmount(-19.996).cents).to.equal(-2000)
    })

    it("rejects non-finite amounts", () => {
      expect(() => Money.fromAmount(Number.POSITIVE_INFINITY)).to.throw(RangeError)
      expect(() => Money.fromAmount(Number.NaN)).to.throw(RangeError)
    })

    it("exposes the decimal amount", () => {
      expect(Money.fromCents(3999).amount).to.equal(39.99)
    })
  })

  describe("arithmetic", () => {
    const price = Money.fromAmount(12.5)

    it("adds and subtracts", () => {
      expect(price.plus(Money.fromAmount(2.5)).cents).to.equal(1500)
      expect(price.minus(Money.fromAmount(2.5)).cents).to.equal(1000)
    })

    it("never mutates the receiver", () => {
      price.plus(Money.fromAmount(100))

      expect(price.cents).to.equal(1250)
    })

    it("sums a list, defaulting to zero", () => {
      expect(Money.sum([]).isZero).to.equal(true)
      expect(Money.sum([Money.fromCents(10), Money.fromCents(32), Money.fromCents(1)]).cents).to.equal(43)
    })

    it("scales by a factor", () => {
      expect(price.times(3).cents).to.equal(3750)
    })

    it("rounds half away from zero when scaling", () => {
      expect(Money.fromCents(5).times(0.5).cents).to.equal(3)
      expect(Money.fromCents(-5).times(0.5).cents).to.equal(-3)
    })

    it("rejects non-finite factors", () => {
      expect(() => price.times(Number.NaN)).to.throw(RangeError)
    })

    it("takes percentages", () => {
      expect(Money.fromAmount(129.5).percentage(20).cents).to.equal(2590)
      expect(Money.fromAmount(10).percentage(7.5).cents).to.equal(75)
    })

    it("negates", () => {
      expect(price.negated().cents).to.equal(-1250)
      expect(price.negated().isNegative).to.equal(true)
    })

    it("clamps negative amounts to zero", () => {
      expect(Money.fromCents(-1).clampToZero().isZero).to.equal(true)
      expect(price.clampToZero()).to.equal(price)
    })
  })

  describe("allocation", () => {
    it("spreads leftover cents over the earliest shares", () => {
      const shares = Money.fromCents(10).allocate([1, 1, 1])

      expect(shares.map((share) => share.cents)).to.deep.equal([4, 3, 3])
    })

    it("respects weighting", () => {
      const shares = Money.fromCents(5).allocate([3, 7])

      expect(shares.map((share) => share.cents)).to.deep.equal([2, 3])
    })

    it("always adds back up to the whole", () => {
      const total = Money.fromAmount(100)

      for (const ratios of [[1, 1, 1], [2, 5, 11], [1], [4, 4, 4, 4, 4, 4, 4]]) {
        expect(Money.sum(total.allocate(ratios)).cents, `ratios ${ratios.join("/")}`).to.equal(
          total.cents,
        )
      }
    })

    it("allocates negative amounts", () => {
      const shares = Money.fromCents(-10).allocate([1, 1, 1])

      expect(shares.map((share) => share.cents)).to.deep.equal([-4, -3, -3])
    })

    it("rejects an empty ratio list", () => {
      expect(() => Money.fromCents(10).allocate([])).to.throw(RangeError, "at least one ratio")
    })

    it("rejects negative ratios", () => {
      expect(() => Money.fromCents(10).allocate([1, -1])).to.throw(RangeError, "non-negative")
    })

    it("rejects ratios that sum to zero", () => {
      expect(() => Money.fromCents(10).allocate([0, 0])).to.throw(RangeError, "more than zero")
    })
  })

  describe("comparison", () => {
    const cheap = Money.fromAmount(5)
    const pricey = Money.fromAmount(50)

    it("orders amounts", () => {
      expect(cheap.compare(pricey)).to.be.below(0)
      expect(pricey.compare(cheap)).to.be.above(0)
      expect(cheap.compare(Money.fromAmount(5))).to.equal(0)
    })

    it("compares by value, not identity", () => {
      expect(cheap.equals(Money.fromCents(500))).to.equal(true)
      expect(cheap.equals(pricey)).to.equal(false)
    })

    it("answers greaterThan and lessThan", () => {
      expect(pricey.greaterThan(cheap)).to.equal(true)
      expect(pricey.lessThan(cheap)).to.equal(false)
    })

    it("picks the smaller and larger of two amounts", () => {
      expect(Money.min(cheap, pricey)).to.equal(cheap)
      expect(Money.max(cheap, pricey)).to.equal(pricey)
    })
  })

  describe("formatting", () => {
    it("prints two decimals", () => {
      expect(Money.fromAmount(39.99).format()).to.equal("$39.99")
      expect(Money.fromCents(5).format()).to.equal("$0.05")
      expect(Money.zero().format()).to.equal("$0.00")
    })

    it("puts the sign in front of the symbol", () => {
      expect(Money.fromCents(-1234).format()).to.equal("-$12.34")
    })

    it("formats through string interpolation", () => {
      expect(`${Money.fromAmount(7.5)}`).to.equal("$7.50")
    })

    it("serializes as cents", () => {
      expect(JSON.stringify(Money.fromAmount(39.99))).to.equal('{"cents":3999}')
    })
  })
})
