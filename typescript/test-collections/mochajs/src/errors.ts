export class CheckoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class InvalidQuantityError extends CheckoutError {
  constructor(readonly quantity: number) {
    super(`quantity must be a positive integer, got ${quantity}`)
  }
}

export class DuplicateSkuError extends CheckoutError {
  constructor(readonly sku: string) {
    super(`sku ${sku} is already registered in the catalog`)
  }
}

export class ProductNotFoundError extends CheckoutError {
  constructor(readonly sku: string) {
    super(`no product registered for sku ${sku}`)
  }
}

export class LineNotFoundError extends CheckoutError {
  constructor(readonly sku: string) {
    super(`cart has no line for sku ${sku}`)
  }
}

export class EmptyCartError extends CheckoutError {
  constructor() {
    super("cannot check out an empty cart")
  }
}

export class DuplicateCouponError extends CheckoutError {
  constructor(readonly code: string) {
    super(`coupon ${code} is already registered`)
  }
}

export class UnknownCouponError extends CheckoutError {
  constructor(readonly code: string) {
    super(`unknown coupon ${code}`)
  }
}

export class CouponExpiredError extends CheckoutError {
  constructor(
    readonly code: string,
    readonly expiresAt: Date,
  ) {
    super(`coupon ${code} expired on ${expiresAt.toISOString()}`)
  }
}

export class CouponNotApplicableError extends CheckoutError {
  constructor(
    readonly code: string,
    readonly reason: string,
  ) {
    super(`coupon ${code} is not applicable: ${reason}`)
  }
}

export class CouponExhaustedError extends CheckoutError {
  constructor(
    readonly code: string,
    readonly maxRedemptions: number,
  ) {
    super(`coupon ${code} has reached its limit of ${maxRedemptions} redemptions`)
  }
}

export class OutOfStockError extends CheckoutError {
  constructor(
    readonly sku: string,
    readonly requested: number,
    readonly available: number,
  ) {
    super(`cannot reserve ${requested} of ${sku}, only ${available} available`)
  }
}

export class UnknownReservationError extends CheckoutError {
  constructor(readonly reservationId: string) {
    super(`unknown reservation ${reservationId}`)
  }
}

export class PaymentDeclinedError extends CheckoutError {
  constructor(readonly reason: string) {
    super(`payment declined: ${reason}`)
  }
}
