import { expect } from "chai"
import sinon from "sinon"

import {
  CouponBook,
  CouponExhaustedError,
  CouponExpiredError,
  CouponNotApplicableError,
  DuplicateCouponError,
  Money,
  UnknownCouponError,
} from "../../src/index.js"
import { NOW, couponBook } from "../helpers/fixtures.js"

describe("CouponBook", () => {
  const subtotal = Money.fromAmount(120)
  let coupons: CouponBook

  beforeEach(() => {
    coupons = couponBook()
  })

  describe("registration", () => {
    it("holds every registered coupon", () => {
      expect(coupons.size).to.equal(4)
    })

    it("normalizes codes to upper case", () => {
      coupons.register({
        code: "  welcome5 ",
        kind: "fixed",
        amount: Money.fromAmount(5),
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      })

      expect(coupons.find("WELCOME5")?.code).to.equal("WELCOME5")
      expect(coupons.find("welcome5")?.code).to.equal("WELCOME5")
    })

    it("refuses to register the same code twice", () => {
      expect(() =>
        coupons.register({
          code: "spring10",
          kind: "percentage",
          percent: 50,
          expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        }),
      ).to.throw(DuplicateCouponError, "SPRING10")
    })

    it("refuses percentages outside 0-100", () => {
      for (const percent of [0, -5, 101]) {
        expect(
          () =>
            coupons.register({
              code: `PCT${percent}`,
              kind: "percentage",
              percent,
              expiresAt: new Date("2026-12-31T00:00:00.000Z"),
            }),
          `percent ${percent}`,
        ).to.throw(RangeError)
      }
    })

    it("returns undefined for an unknown code", () => {
      expect(coupons.find("NOPE")).to.equal(undefined)
    })
  })

  describe("quote", () => {
    it("discounts a percentage of the subtotal", () => {
      expect(coupons.quote("SPRING10", subtotal, NOW).format()).to.equal("$12.00")
    })

    it("discounts a fixed amount", () => {
      expect(coupons.quote("TENOFF", subtotal, NOW).format()).to.equal("$10.00")
    })

    it("accepts a lower-cased code", () => {
      expect(coupons.quote("spring10", subtotal, NOW).cents).to.equal(1200)
    })

    it("never discounts more than the subtotal", () => {
      coupons.register({
        code: "HALFPRICEDAY",
        kind: "fixed",
        amount: Money.fromAmount(200),
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      })

      expect(coupons.quote("HALFPRICEDAY", Money.fromAmount(30), NOW).format()).to.equal("$30.00")
    })

    it("rejects an unknown code", () => {
      expect(() => coupons.quote("NOPE", subtotal, NOW)).to.throw(UnknownCouponError, "NOPE")
    })

    it("rejects an expired coupon", () => {
      expect(() => coupons.quote("LASTYEAR", subtotal, NOW)).to.throw(
        CouponExpiredError,
        "2025-12-31",
      )
    })

    it("treats the expiry instant itself as expired", () => {
      const expiresAt = new Date("2026-06-01T00:00:00.000Z")
      coupons.register({ code: "MIDYEAR", kind: "percentage", percent: 5, expiresAt })

      expect(() => coupons.quote("MIDYEAR", subtotal, expiresAt)).to.throw(CouponExpiredError)
      expect(coupons.quote("MIDYEAR", subtotal, new Date(expiresAt.getTime() - 1)).cents).to.equal(
        600,
      )
    })

    it("rejects a subtotal below the coupon minimum", () => {
      expect(() => coupons.quote("TENOFF", Money.fromAmount(49.99), NOW)).to.throw(
        CouponNotApplicableError,
        "below the $50.00 minimum",
      )
    })

    it("does not consume a redemption", () => {
      coupons.quote("ONCEONLY", subtotal, NOW)
      coupons.quote("ONCEONLY", subtotal, NOW)

      expect(coupons.redemptionsOf("ONCEONLY")).to.equal(0)
    })

    it("falls back to the current time", () => {
      sinon.useFakeTimers(NOW)

      expect(() => coupons.quote("LASTYEAR", subtotal)).to.throw(CouponExpiredError)
      expect(coupons.quote("SPRING10", subtotal).cents).to.equal(1200)
    })
  })

  describe("redeem", () => {
    it("returns the quoted discount", () => {
      expect(coupons.redeem("SPRING10", subtotal, NOW)).to.deep.equal(
        coupons.quote("SPRING10", subtotal, NOW),
      )
    })

    it("counts redemptions per code", () => {
      coupons.redeem("SPRING10", subtotal, NOW)
      coupons.redeem("spring10", subtotal, NOW)

      expect(coupons.redemptionsOf("SPRING10")).to.equal(2)
      expect(coupons.redemptionsOf("TENOFF")).to.equal(0)
    })

    it("stops at the redemption limit", () => {
      coupons.redeem("ONCEONLY", subtotal, NOW)

      expect(() => coupons.redeem("ONCEONLY", subtotal, NOW)).to.throw(
        CouponExhaustedError,
        "limit of 1 redemptions",
      )
      expect(coupons.redemptionsOf("ONCEONLY")).to.equal(1)
    })

    it("does not count a failed redemption", () => {
      expect(() => coupons.redeem("TENOFF", Money.fromAmount(10), NOW)).to.throw(
        CouponNotApplicableError,
      )
      expect(coupons.redemptionsOf("TENOFF")).to.equal(0)
    })
  })
})
