export { Cart, type CartLine } from "./cart/cart.js"
export { Catalog } from "./catalog/catalog.js"
export type { Category, Product } from "./catalog/product.js"
export {
  CheckoutService,
  type CheckoutDependencies,
  type CheckoutRequest,
} from "./checkout/checkout-service.js"
export type { ChargeRequest, ChargeResult, PaymentGateway } from "./checkout/payment-gateway.js"
export * from "./errors.js"
export {
  InventoryService,
  type Reservation,
  type StockLevel,
} from "./inventory/inventory-service.js"
export { InMemoryOrderRepository } from "./orders/in-memory-order-repository.js"
export type { Order, OrderLine } from "./orders/order.js"
export type { OrderRepository } from "./orders/order-repository.js"
export {
  CouponBook,
  type Coupon,
  type FixedCoupon,
  type PercentageCoupon,
} from "./pricing/coupons.js"
export { Money } from "./pricing/money.js"
export { fixedClock, systemClock, type Clock } from "./support/clock.js"
export { randomIds, sequentialIds, type IdGenerator } from "./support/ids.js"
