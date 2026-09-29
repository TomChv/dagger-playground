import { expect } from "chai"

import { Catalog, DuplicateSkuError, Money, ProductNotFoundError } from "../../src/index.js"
import { catalog, products } from "../helpers/fixtures.js"

describe("Catalog", () => {
  let subject: Catalog

  beforeEach(() => {
    subject = catalog()
  })

  describe("registration", () => {
    it("starts empty", () => {
      expect(new Catalog().size).to.equal(0)
    })

    it("indexes the products it was built with", () => {
      expect(subject.size).to.equal(4)
      expect(subject.products.map((product) => product.sku)).to.have.members([
        products.novel.sku,
        products.keyboard.sku,
        products.coffee.sku,
        products.hoodie.sku,
      ])
    })

    it("chains additions", () => {
      const empty = new Catalog()

      expect(empty.add(products.novel)).to.equal(empty)
      expect(empty.size).to.equal(1)
    })

    it("refuses a duplicate sku", () => {
      expect(() => subject.add(products.novel)).to.throw(DuplicateSkuError, products.novel.sku)
    })

    it("refuses a duplicate sku at construction time", () => {
      expect(() => new Catalog([products.novel, products.novel])).to.throw(DuplicateSkuError)
    })

    it("hands out a snapshot of its products", () => {
      subject.products.pop()

      expect(subject.size).to.equal(4)
    })
  })

  describe("lookup", () => {
    it("finds a product by sku", () => {
      expect(subject.find(products.coffee.sku)?.name).to.equal(products.coffee.name)
    })

    it("returns undefined for an unknown sku", () => {
      expect(subject.find("UNKNOWN-1")).to.equal(undefined)
    })

    it("insists on a product with mustFind", () => {
      expect(subject.mustFind(products.coffee.sku)).to.deep.equal(products.coffee)
      expect(() => subject.mustFind("UNKNOWN-1")).to.throw(ProductNotFoundError, "UNKNOWN-1")
    })

    it("filters by category", () => {
      expect(subject.byCategory("books").map((product) => product.sku)).to.deep.equal([
        products.novel.sku,
      ])
      expect(subject.byCategory("groceries")).to.have.lengthOf(1)
    })

    it("returns nothing for a category it does not stock", () => {
      const booksOnly = new Catalog([products.novel])

      expect(booksOnly.byCategory("electronics")).to.be.empty
    })
  })

  describe("prices", () => {
    it("keeps prices as Money", () => {
      expect(subject.mustFind(products.keyboard.sku).price).to.deep.equal(Money.fromAmount(129.5))
    })

    it("prices a whole shelf", () => {
      const shelf = Money.sum(subject.products.map((product) => product.price))

      expect(shelf.format()).to.equal("$257.74")
    })
  })
})
