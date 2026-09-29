import { expect } from "chai"

import { Cart, InvalidQuantityError, LineNotFoundError, Money } from "../../src/index.js"
import { products } from "../helpers/fixtures.js"

describe("Cart", () => {
  let cart: Cart

  beforeEach(() => {
    cart = new Cart()
  })

  describe("an empty cart", () => {
    it("reports itself empty", () => {
      expect(cart.isEmpty).to.equal(true)
      expect(cart.lineCount).to.equal(0)
      expect(cart.itemCount).to.equal(0)
    })

    it("totals zero", () => {
      expect(cart.subtotal().isZero).to.equal(true)
      expect(cart.taxTotal().isZero).to.equal(true)
      expect(cart.total().isZero).to.equal(true)
    })
  })

  describe("line management", () => {
    it("adds one item by default", () => {
      cart.add(products.novel)

      expect(cart.lineOf(products.novel.sku)?.quantity).to.equal(1)
    })

    it("merges repeated adds of the same sku", () => {
      cart.add(products.novel, 2).add(products.novel, 3)

      expect(cart.lineCount).to.equal(1)
      expect(cart.itemCount).to.equal(5)
    })

    it("keeps lines in insertion order", () => {
      cart.add(products.keyboard).add(products.novel).add(products.coffee)

      expect(cart.lines.map((line) => line.product.sku)).to.deep.equal([
        products.keyboard.sku,
        products.novel.sku,
        products.coffee.sku,
      ])
    })

    it("rejects quantities that are not positive integers", () => {
      for (const quantity of [0, -1, 1.5, Number.NaN]) {
        expect(() => cart.add(products.novel, quantity), `quantity ${quantity}`).to.throw(
          InvalidQuantityError,
        )
      }

      expect(cart.isEmpty).to.equal(true)
    })

    it("overwrites a quantity", () => {
      cart.add(products.coffee, 2).setQuantity(products.coffee.sku, 7)

      expect(cart.itemCount).to.equal(7)
    })

    it("drops the line when the quantity is set to zero", () => {
      cart.add(products.coffee, 2).setQuantity(products.coffee.sku, 0)

      expect(cart.has(products.coffee.sku)).to.equal(false)
    })

    it("refuses a negative quantity without touching the line", () => {
      cart.add(products.coffee, 2)

      expect(() => cart.setQuantity(products.coffee.sku, -2)).to.throw(InvalidQuantityError)
      expect(cart.itemCount).to.equal(2)
    })

    it("removes a line", () => {
      cart.add(products.hoodie).remove(products.hoodie.sku)

      expect(cart.isEmpty).to.equal(true)
    })

    it("clears every line", () => {
      cart.add(products.novel, 2).add(products.coffee, 1).clear()

      expect(cart.isEmpty).to.equal(true)
    })

    it("complains about unknown skus", () => {
      expect(() => cart.remove("NOPE-1")).to.throw(LineNotFoundError, "NOPE-1")
      expect(() => cart.setQuantity("NOPE-1", 3)).to.throw(LineNotFoundError)
      expect(() => cart.lineTotal("NOPE-1")).to.throw(LineNotFoundError)
      expect(cart.lineOf("NOPE-1")).to.equal(undefined)
    })
  })

  describe("totals", () => {
    beforeEach(() => {
      cart.add(products.novel, 2).add(products.keyboard, 1)
    })

    it("multiplies unit price by quantity per line", () => {
      expect(cart.lineTotal(products.novel.sku).cents).to.equal(7998)
      expect(cart.lineTotal(products.keyboard.sku).cents).to.equal(12950)
    })

    it("sums the lines into a subtotal", () => {
      expect(cart.subtotal().format()).to.equal("$209.48")
    })

    it("applies each product's own tax rate", () => {
      expect(cart.taxTotal().cents).to.equal(440 + 2590)
    })

    it("rounds tax per line, half away from zero", () => {
      const singleHoodie = Cart.of([products.hoodie, 1])

      expect(singleHoodie.taxTotal().cents).to.equal(643)
    })

    it("adds tax on top of the subtotal", () => {
      expect(cart.total()).to.deep.equal(cart.subtotal().plus(cart.taxTotal()))
      expect(cart.total().format()).to.equal("$239.78")
    })

    it("scales with quantity", () => {
      const before = cart.subtotal()
      cart.setQuantity(products.novel.sku, 4)

      expect(cart.subtotal().minus(before)).to.deep.equal(Money.fromCents(7998))
    })
  })

  describe("Cart.of", () => {
    it("builds a populated cart in one call", () => {
      const built = Cart.of([products.novel, 2], [products.coffee, 3])

      expect(built.lineCount).to.equal(2)
      expect(built.itemCount).to.equal(5)
    })
  })
})
