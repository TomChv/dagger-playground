import {
  CouponExhaustedError,
  CouponExpiredError,
  CouponNotApplicableError,
  DuplicateCouponError,
  UnknownCouponError,
} from "../errors.js"
import { Money } from "./money.js"

interface BaseCoupon {
  readonly code: string
  readonly expiresAt: Date
  readonly minSubtotal?: Money
  readonly maxRedemptions?: number
}

export interface PercentageCoupon extends BaseCoupon {
  readonly kind: "percentage"
  readonly percent: number
}

export interface FixedCoupon extends BaseCoupon {
  readonly kind: "fixed"
  readonly amount: Money
}

export type Coupon = PercentageCoupon | FixedCoupon

export class CouponBook {
  readonly #coupons = new Map<string, Coupon>()
  readonly #redemptions = new Map<string, number>()

  static normalizeCode(code: string): string {
    return code.trim().toUpperCase()
  }

  get size(): number {
    return this.#coupons.size
  }

  register(coupon: Coupon): this {
    const code = CouponBook.normalizeCode(coupon.code)
    if (this.#coupons.has(code)) {
      throw new DuplicateCouponError(code)
    }

    if (coupon.kind === "percentage" && (coupon.percent <= 0 || coupon.percent > 100)) {
      throw new RangeError(`percentage coupon ${code} must discount between 0 and 100 percent`)
    }

    this.#coupons.set(code, { ...coupon, code })

    return this
  }

  find(code: string): Coupon | undefined {
    return this.#coupons.get(CouponBook.normalizeCode(code))
  }

  redemptionsOf(code: string): number {
    return this.#redemptions.get(CouponBook.normalizeCode(code)) ?? 0
  }

  /** Validates the coupon and returns the discount without consuming a redemption. */
  quote(code: string, subtotal: Money, now = new Date()): Money {
    const normalized = CouponBook.normalizeCode(code)
    const coupon = this.#coupons.get(normalized)
    if (!coupon) {
      throw new UnknownCouponError(normalized)
    }

    if (coupon.expiresAt.getTime() <= now.getTime()) {
      throw new CouponExpiredError(normalized, coupon.expiresAt)
    }

    if (coupon.minSubtotal && subtotal.lessThan(coupon.minSubtotal)) {
      throw new CouponNotApplicableError(
        normalized,
        `subtotal ${subtotal.format()} is below the ${coupon.minSubtotal.format()} minimum`,
      )
    }

    const redemptions = this.redemptionsOf(normalized)
    if (coupon.maxRedemptions !== undefined && redemptions >= coupon.maxRedemptions) {
      throw new CouponExhaustedError(normalized, coupon.maxRedemptions)
    }

    const discount =
      coupon.kind === "percentage" ? subtotal.percentage(coupon.percent) : coupon.amount

    return Money.min(discount, subtotal)
  }

  redeem(code: string, subtotal: Money, now = new Date()): Money {
    const discount = this.quote(code, subtotal, now)
    const normalized = CouponBook.normalizeCode(code)
    this.#redemptions.set(normalized, this.redemptionsOf(normalized) + 1)

    return discount
  }
}
