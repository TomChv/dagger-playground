import { expect } from "chai"
import sinon from "sinon"

import {
  Cart,
  CheckoutService,
  CouponExpiredError,
  EmptyCartError,
  OutOfStockError,
  PaymentDeclinedError,
  UnknownCouponError,
} from "../../src/index.js"
import { NOW, checkoutHarness, products, type CheckoutHarness } from "../helpers/fixtures.js"

const { keyboard, novel } = products

describe("CheckoutService", () => {
  let harness: CheckoutHarness
  let service: CheckoutService
  let cart: Cart

  beforeEach(() => {
    harness = checkoutHarness()
    service = new CheckoutService(harness)
    cart = Cart.of([novel, 2], [keyboard, 1])
  })

  it("refuses to check out an empty cart", async () => {
    await expect(service.checkout(new Cart(), { customerId: "cus-1" })).to.be.rejectedWith(
      EmptyCartError,
    )
  })

  describe("a paid checkout", () => {
    it("returns an order identified by the generated id", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1" })

      expect(order.id).to.equal("ord-1")
      expect(order.customerId).to.equal("cus-1")
      expect(order.placedAt).to.deep.equal(NOW)
    })

    it("copies the cart lines onto the order", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1" })

      expect(order.lines).to.deep.equal([
        {
          sku: novel.sku,
          name: novel.name,
          quantity: 2,
          unitPrice: novel.price,
          lineTotal: novel.price.times(2),
        },
        {
          sku: keyboard.sku,
          name: keyboard.name,
          quantity: 1,
          unitPrice: keyboard.price,
          lineTotal: keyboard.price,
        },
      ])
    })

    it("totals the order without a discount", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1" })

      expect(order.subtotal.format()).to.equal("$209.48")
      expect(order.discount.isZero).to.equal(true)
      expect(order.tax.format()).to.equal("$30.30")
      expect(order.total.format()).to.equal("$239.78")
      expect(order.couponCode).to.equal(undefined)
    })

    it("charges the gateway once, keyed by the order id", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1" })

      expect(harness.payments.charges).to.have.lengthOf(1)
      expect(harness.payments.charges[0]).to.deep.equal({
        customerId: "cus-1",
        amount: order.total,
        idempotencyKey: order.id,
      })
    })

    it("records the captured payment id", async () => {
      harness.payments.captureAs("pay-abc")

      const order = await service.checkout(cart, { customerId: "cus-1" })

      expect(order.paymentId).to.equal("pay-abc")
    })

    it("persists the order", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1" })

      expect(await harness.orders.findById(order.id)).to.deep.equal(order)
      expect(await harness.orders.findByCustomer("cus-1")).to.deep.equal([order])
      expect(await harness.orders.findByCustomer("cus-2")).to.be.empty
    })

    it("commits every reservation", async () => {
      const commit = sinon.spy(harness.inventory, "commit")

      await service.checkout(cart, { customerId: "cus-1" })

      expect(commit.callCount).to.equal(2)
      expect(harness.inventory.openReservations).to.be.empty
      expect((await harness.inventory.levelOf(novel.sku)).available).to.equal(10)
      expect((await harness.inventory.levelOf(keyboard.sku)).available).to.equal(3)
    })

    it("numbers consecutive orders", async () => {
      const first = await service.checkout(cart, { customerId: "cus-1" })
      const second = await service.checkout(cart, { customerId: "cus-1" })

      expect([first.id, second.id]).to.deep.equal(["ord-1", "ord-2"])
      expect(harness.orders.size).to.equal(2)
    })

    it("surfaces a repository failure", async () => {
      sinon.stub(harness.orders, "save").rejects(new Error("order store unavailable"))

      await expect(service.checkout(cart, { customerId: "cus-1" })).to.be.rejectedWith(
        "order store unavailable",
      )
    })
  })

  describe("with a coupon", () => {
    it("subtracts the discount from the total", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1", couponCode: "SPRING10" })

      expect(order.discount.format()).to.equal("$20.95")
      expect(order.total.format()).to.equal("$218.83")
    })

    it("records the code on the order", async () => {
      const order = await service.checkout(cart, { customerId: "cus-1", couponCode: "SPRING10" })

      expect(order.couponCode).to.equal("SPRING10")
    })

    it("redeems the coupon once", async () => {
      await service.checkout(cart, { customerId: "cus-1", couponCode: "SPRING10" })

      expect(harness.coupons.redemptionsOf("SPRING10")).to.equal(1)
    })

    it("charges the discounted total", async () => {
      await service.checkout(cart, { customerId: "cus-1", couponCode: "SPRING10" })

      expect(harness.payments.charges[0]?.amount.format()).to.equal("$218.83")
    })

    it("rejects an expired coupon before touching the stock", async () => {
      await expect(
        service.checkout(cart, { customerId: "cus-1", couponCode: "LASTYEAR" }),
      ).to.be.rejectedWith(CouponExpiredError)

      expect(harness.inventory.openReservations).to.be.empty
      expect((await harness.inventory.levelOf(novel.sku)).available).to.equal(12)
      expect(harness.payments.charges).to.be.empty
    })

    it("rejects an unknown coupon", async () => {
      await expect(
        service.checkout(cart, { customerId: "cus-1", couponCode: "NOPE" }),
      ).to.be.rejectedWith(UnknownCouponError)
    })
  })

  describe("when the payment is declined", () => {
    beforeEach(() => {
      harness.payments.declineWith("insufficient funds")
    })

    it("reports the decline reason", async () => {
      await expect(service.checkout(cart, { customerId: "cus-1" })).to.be.rejectedWith(
        PaymentDeclinedError,
        "insufficient funds",
      )
    })

    it("releases the reserved stock", async () => {
      const release = sinon.spy(harness.inventory, "release")

      await service.checkout(cart, { customerId: "cus-1" }).catch(() => undefined)

      expect(release.callCount).to.equal(2)
      expect(harness.inventory.openReservations).to.be.empty
      expect((await harness.inventory.levelOf(novel.sku)).available).to.equal(12)
      expect((await harness.inventory.levelOf(keyboard.sku)).available).to.equal(4)
    })

    it("keeps the order out of the repository", async () => {
      await service.checkout(cart, { customerId: "cus-1" }).catch(() => undefined)

      expect(harness.orders.size).to.equal(0)
    })

    it("leaves the coupon unredeemed", async () => {
      await service
        .checkout(cart, { customerId: "cus-1", couponCode: "SPRING10" })
        .catch(() => undefined)

      expect(harness.coupons.redemptionsOf("SPRING10")).to.equal(0)
    })
  })

  describe("when the gateway itself fails", () => {
    beforeEach(() => {
      harness.payments.failWith(new Error("gateway timeout"))
    })

    it("propagates the failure", async () => {
      await expect(service.checkout(cart, { customerId: "cus-1" })).to.be.rejectedWith(
        "gateway timeout",
      )
    })

    it("still releases the reserved stock", async () => {
      await service.checkout(cart, { customerId: "cus-1" }).catch(() => undefined)

      expect(harness.inventory.openReservations).to.be.empty
      expect((await harness.inventory.levelOf(novel.sku)).available).to.equal(12)
    })
  })

  describe("when a line is out of stock", () => {
    beforeEach(() => {
      cart = Cart.of([novel, 2], [keyboard, 5])
    })

    it("reports which sku fell short", async () => {
      await expect(service.checkout(cart, { customerId: "cus-1" })).to.be.rejectedWith(
        OutOfStockError,
        keyboard.sku,
      )
    })

    it("rolls back the lines reserved before it", async () => {
      await service.checkout(cart, { customerId: "cus-1" }).catch(() => undefined)

      expect(harness.inventory.openReservations).to.be.empty
      expect((await harness.inventory.levelOf(novel.sku)).available).to.equal(12)
    })

    it("never reaches the gateway", async () => {
      await service.checkout(cart, { customerId: "cus-1" }).catch(() => undefined)

      expect(harness.payments.charges).to.be.empty
    })
  })

  it("refunds a cancelled order")
})
