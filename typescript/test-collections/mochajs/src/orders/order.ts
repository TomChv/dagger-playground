import type { Money } from "../pricing/money.js"

export interface OrderLine {
  readonly sku: string
  readonly name: string
  readonly quantity: number
  readonly unitPrice: Money
  readonly lineTotal: Money
}

export interface Order {
  readonly id: string
  readonly customerId: string
  readonly placedAt: Date
  readonly lines: readonly OrderLine[]
  readonly subtotal: Money
  readonly discount: Money
  readonly tax: Money
  readonly total: Money
  readonly paymentId: string
  readonly couponCode?: string
}
