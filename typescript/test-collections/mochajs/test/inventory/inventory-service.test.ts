import { expect } from "chai"

import {
  InvalidQuantityError,
  InventoryService,
  OutOfStockError,
  UnknownReservationError,
  sequentialIds,
} from "../../src/index.js"
import { products } from "../helpers/fixtures.js"

const { keyboard, novel } = products

describe("InventoryService", () => {
  let inventory: InventoryService

  beforeEach(() => {
    inventory = new InventoryService({ [novel.sku]: 12, [keyboard.sku]: 4 })
  })

  describe("stock levels", () => {
    it("reports the initial stock", async () => {
      expect(await inventory.levelOf(novel.sku)).to.deep.equal({
        sku: novel.sku,
        available: 12,
        reserved: 0,
      })
    })

    it("treats unknown skus as empty", async () => {
      const level = await inventory.levelOf("UNKNOWN-1")

      expect(level.available).to.equal(0)
    })

    it("adds incoming stock", async () => {
      await inventory.restock(keyboard.sku, 6)

      expect((await inventory.levelOf(keyboard.sku)).available).to.equal(10)
    })

    it("creates the sku on first restock", async () => {
      await inventory.restock("NEW-1", 3)

      expect((await inventory.levelOf("NEW-1")).available).to.equal(3)
    })

    it("rejects a non-positive restock", async () => {
      await expect(inventory.restock(novel.sku, 0)).to.be.rejectedWith(InvalidQuantityError)
      await expect(inventory.restock(novel.sku, -4)).to.be.rejectedWith(InvalidQuantityError)
    })
  })

  describe("reserve", () => {
    it("moves stock from available to reserved", async () => {
      await inventory.reserve(novel.sku, 5)

      expect(await inventory.levelOf(novel.sku)).to.deep.equal({
        sku: novel.sku,
        available: 7,
        reserved: 5,
      })
    })

    it("hands back a reservation", async () => {
      const reservation = await inventory.reserve(keyboard.sku, 2)

      expect(reservation).to.deep.equal({ id: "res-1", sku: keyboard.sku, quantity: 2 })
      expect(inventory.openReservations).to.have.lengthOf(1)
    })

    it("numbers reservations with the injected generator", async () => {
      const custom = new InventoryService({ [novel.sku]: 5 }, sequentialIds("hold", 100))

      expect((await custom.reserve(novel.sku, 1)).id).to.equal("hold-100")
      expect((await custom.reserve(novel.sku, 1)).id).to.equal("hold-101")
    })

    it("allows reserving the last unit", async () => {
      await inventory.reserve(keyboard.sku, 4)

      expect((await inventory.levelOf(keyboard.sku)).available).to.equal(0)
    })

    it("refuses to oversell", async () => {
      await expect(inventory.reserve(keyboard.sku, 5)).to.be.rejectedWith(
        OutOfStockError,
        "cannot reserve 5 of EL-014, only 4 available",
      )
    })

    it("refuses to reserve an unknown sku", async () => {
      await expect(inventory.reserve("UNKNOWN-1", 1)).to.be.rejectedWith(OutOfStockError)
    })

    it("rejects a non-positive quantity", async () => {
      await expect(inventory.reserve(novel.sku, 0)).to.be.rejectedWith(InvalidQuantityError)
      await expect(inventory.reserve(novel.sku, 2.5)).to.be.rejectedWith(InvalidQuantityError)
    })

    it("serves concurrent reservations until the stock runs out", async () => {
      const outcomes = await Promise.allSettled([
        inventory.reserve(keyboard.sku, 2),
        inventory.reserve(keyboard.sku, 2),
        inventory.reserve(keyboard.sku, 1),
      ])

      expect(outcomes.map((outcome) => outcome.status)).to.deep.equal([
        "fulfilled",
        "fulfilled",
        "rejected",
      ])
      expect((await inventory.levelOf(keyboard.sku)).available).to.equal(0)
    })
  })

  describe("release", () => {
    it("puts the stock back", async () => {
      const reservation = await inventory.reserve(novel.sku, 3)
      await inventory.release(reservation.id)

      expect(await inventory.levelOf(novel.sku)).to.deep.equal({
        sku: novel.sku,
        available: 12,
        reserved: 0,
      })
    })

    it("closes the reservation", async () => {
      const reservation = await inventory.reserve(novel.sku, 3)
      await inventory.release(reservation.id)

      await expect(inventory.release(reservation.id)).to.be.rejectedWith(UnknownReservationError)
    })

    it("rejects an unknown reservation", async () => {
      await expect(inventory.release("res-404")).to.be.rejectedWith(
        UnknownReservationError,
        "res-404",
      )
    })
  })

  describe("commit", () => {
    it("keeps the stock consumed", async () => {
      const reservation = await inventory.reserve(novel.sku, 3)
      await inventory.commit(reservation.id)

      expect(await inventory.levelOf(novel.sku)).to.deep.equal({
        sku: novel.sku,
        available: 9,
        reserved: 0,
      })
    })

    it("cannot be undone by a release", async () => {
      const reservation = await inventory.reserve(novel.sku, 3)
      await inventory.commit(reservation.id)

      await expect(inventory.release(reservation.id)).to.be.rejectedWith(UnknownReservationError)
    })

    it("rejects an unknown reservation", async () => {
      await expect(inventory.commit("res-404")).to.be.rejectedWith(UnknownReservationError)
    })
  })
})
