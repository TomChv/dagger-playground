import {
  Cart,
  Catalog,
  CouponBook,
  InMemoryOrderRepository,
  InventoryService,
  Money,
  fixedClock,
  sequentialIds,
  type ChargeRequest,
  type ChargeResult,
  type CheckoutDependencies,
  type PaymentGateway,
  type Product,
} from "../../src/index.js"

export const NOW = new Date("2026-03-01T10:00:00.000Z")

export const products = {
  novel: {
    sku: "BK-001",
    name: "The Pragmatic Programmer",
    price: Money.fromAmount(39.99),
    category: "books",
    taxRate: 0.055,
  },
  keyboard: {
    sku: "EL-014",
    name: "Split mechanical keyboard",
    price: Money.fromAmount(129.5),
    category: "electronics",
    taxRate: 0.2,
  },
  coffee: {
    sku: "GR-220",
    name: "Single origin coffee beans, 1kg",
    price: Money.fromAmount(24),
    category: "groceries",
    taxRate: 0.055,
  },
  hoodie: {
    sku: "AP-077",
    name: "Zip hoodie",
    price: Money.fromAmount(64.25),
    category: "apparel",
    taxRate: 0.1,
  },
} satisfies Record<string, Product>

export function catalog(): Catalog {
  return new Catalog(Object.values(products))
}

export function fullStock(): InventoryService {
  return new InventoryService({
    [products.novel.sku]: 12,
    [products.keyboard.sku]: 4,
    [products.coffee.sku]: 30,
    [products.hoodie.sku]: 7,
  })
}

export function couponBook(): CouponBook {
  return new CouponBook()
    .register({
      code: "SPRING10",
      kind: "percentage",
      percent: 10,
      expiresAt: new Date("2026-04-01T00:00:00.000Z"),
    })
    .register({
      code: "TENOFF",
      kind: "fixed",
      amount: Money.fromAmount(10),
      expiresAt: new Date("2026-04-01T00:00:00.000Z"),
      minSubtotal: Money.fromAmount(50),
    })
    .register({
      code: "LASTYEAR",
      kind: "percentage",
      percent: 25,
      expiresAt: new Date("2025-12-31T23:59:59.000Z"),
    })
    .register({
      code: "ONCEONLY",
      kind: "fixed",
      amount: Money.fromAmount(5),
      expiresAt: new Date("2026-04-01T00:00:00.000Z"),
      maxRedemptions: 1,
    })
}

export class FakePaymentGateway implements PaymentGateway {
  readonly charges: ChargeRequest[] = []
  #outcome: ChargeResult | Error = { status: "captured", paymentId: "pay-1" }

  captureAs(paymentId: string): this {
    this.#outcome = { status: "captured", paymentId }

    return this
  }

  declineWith(reason: string): this {
    this.#outcome = { status: "declined", reason }

    return this
  }

  failWith(error: Error): this {
    this.#outcome = error

    return this
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.charges.push(request)

    if (this.#outcome instanceof Error) {
      throw this.#outcome
    }

    return this.#outcome
  }
}

export interface CheckoutHarness extends CheckoutDependencies {
  readonly inventory: InventoryService
  readonly payments: FakePaymentGateway
  readonly orders: InMemoryOrderRepository
  readonly coupons: CouponBook
}

export function checkoutHarness(overrides: Partial<CheckoutDependencies> = {}): CheckoutHarness {
  return {
    inventory: fullStock(),
    payments: new FakePaymentGateway(),
    orders: new InMemoryOrderRepository(),
    coupons: couponBook(),
    clock: fixedClock(NOW),
    newOrderId: sequentialIds("ord"),
    ...overrides,
  } as CheckoutHarness
}

export function cartOf(...entries: readonly [Product, number][]): Cart {
  return Cart.of(...entries)
}
