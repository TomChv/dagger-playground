import type { Cart } from "../cart/cart.js"
import { EmptyCartError, PaymentDeclinedError } from "../errors.js"
import type { InventoryService, Reservation } from "../inventory/inventory-service.js"
import type { Order, OrderLine } from "../orders/order.js"
import type { OrderRepository } from "../orders/order-repository.js"
import type { CouponBook } from "../pricing/coupons.js"
import { Money } from "../pricing/money.js"
import type { Clock } from "../support/clock.js"
import type { IdGenerator } from "../support/ids.js"
import type { ChargeResult, PaymentGateway } from "./payment-gateway.js"

export interface CheckoutRequest {
  readonly customerId: string
  readonly couponCode?: string
}

export interface CheckoutDependencies {
  readonly inventory: InventoryService
  readonly payments: PaymentGateway
  readonly orders: OrderRepository
  readonly coupons: CouponBook
  readonly clock: Clock
  readonly newOrderId: IdGenerator
}

export class CheckoutService {
  readonly #deps: CheckoutDependencies

  constructor(deps: CheckoutDependencies) {
    this.#deps = deps
  }

  async checkout(cart: Cart, request: CheckoutRequest): Promise<Order> {
    if (cart.isEmpty) {
      throw new EmptyCartError()
    }

    const { clock, coupons, inventory, orders, payments, newOrderId } = this.#deps
    const placedAt = clock.now()
    const subtotal = cart.subtotal()
    const discount = request.couponCode
      ? coupons.quote(request.couponCode, subtotal, placedAt)
      : Money.zero()
    const tax = cart.taxTotal()
    const total = subtotal.minus(discount).plus(tax)

    const reservations = await this.#reserveAll(cart)
    const orderId = newOrderId()

    let charge: ChargeResult
    try {
      charge = await payments.charge({
        customerId: request.customerId,
        amount: total,
        idempotencyKey: orderId,
      })
    } catch (error) {
      await this.#releaseAll(reservations)
      throw error
    }

    if (charge.status === "declined") {
      await this.#releaseAll(reservations)
      throw new PaymentDeclinedError(charge.reason)
    }

    for (const reservation of reservations) {
      await inventory.commit(reservation.id)
    }

    if (request.couponCode) {
      coupons.redeem(request.couponCode, subtotal, placedAt)
    }

    const order: Order = {
      id: orderId,
      customerId: request.customerId,
      placedAt,
      lines: cart.lines.map(
        (line): OrderLine => ({
          sku: line.product.sku,
          name: line.product.name,
          quantity: line.quantity,
          unitPrice: line.product.price,
          lineTotal: line.product.price.times(line.quantity),
        }),
      ),
      subtotal,
      discount,
      tax,
      total,
      paymentId: charge.paymentId,
      ...(request.couponCode ? { couponCode: request.couponCode } : {}),
    }

    await orders.save(order)

    return order
  }

  async #reserveAll(cart: Cart): Promise<Reservation[]> {
    const reservations: Reservation[] = []

    for (const line of cart.lines) {
      try {
        reservations.push(await this.#deps.inventory.reserve(line.product.sku, line.quantity))
      } catch (error) {
        await this.#releaseAll(reservations)
        throw error
      }
    }

    return reservations
  }

  async #releaseAll(reservations: readonly Reservation[]): Promise<void> {
    for (const reservation of reservations) {
      await this.#deps.inventory.release(reservation.id)
    }
  }
}
