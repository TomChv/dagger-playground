import type { Money } from "../pricing/money.js"

export interface ChargeRequest {
  readonly customerId: string
  readonly amount: Money
  readonly idempotencyKey: string
}

export type ChargeResult =
  | { readonly status: "captured"; readonly paymentId: string }
  | { readonly status: "declined"; readonly reason: string }

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>
}
