import { InvalidQuantityError, OutOfStockError, UnknownReservationError } from "../errors.js"
import { sequentialIds, type IdGenerator } from "../support/ids.js"

export interface Reservation {
  readonly id: string
  readonly sku: string
  readonly quantity: number
}

export interface StockLevel {
  readonly sku: string
  readonly available: number
  readonly reserved: number
}

export class InventoryService {
  readonly #available = new Map<string, number>()
  readonly #reservations = new Map<string, Reservation>()
  readonly #newReservationId: IdGenerator

  constructor(
    initialStock: Readonly<Record<string, number>> = {},
    newReservationId: IdGenerator = sequentialIds("res"),
  ) {
    for (const [sku, quantity] of Object.entries(initialStock)) {
      this.#available.set(sku, quantity)
    }
    this.#newReservationId = newReservationId
  }

  get openReservations(): Reservation[] {
    return [...this.#reservations.values()]
  }

  async levelOf(sku: string): Promise<StockLevel> {
    const reserved = this.openReservations
      .filter((reservation) => reservation.sku === sku)
      .reduce((total, reservation) => total + reservation.quantity, 0)

    return { sku, available: this.#available.get(sku) ?? 0, reserved }
  }

  async restock(sku: string, quantity: number): Promise<void> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError(quantity)
    }

    this.#available.set(sku, (this.#available.get(sku) ?? 0) + quantity)
  }

  async reserve(sku: string, quantity: number): Promise<Reservation> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError(quantity)
    }

    const available = this.#available.get(sku) ?? 0
    if (available < quantity) {
      throw new OutOfStockError(sku, quantity, available)
    }

    const reservation: Reservation = { id: this.#newReservationId(), sku, quantity }
    this.#available.set(sku, available - quantity)
    this.#reservations.set(reservation.id, reservation)

    return reservation
  }

  async release(reservationId: string): Promise<void> {
    const reservation = this.#take(reservationId)
    this.#available.set(
      reservation.sku,
      (this.#available.get(reservation.sku) ?? 0) + reservation.quantity,
    )
  }

  async commit(reservationId: string): Promise<void> {
    this.#take(reservationId)
  }

  #take(reservationId: string): Reservation {
    const reservation = this.#reservations.get(reservationId)
    if (!reservation) {
      throw new UnknownReservationError(reservationId)
    }

    this.#reservations.delete(reservationId)

    return reservation
  }
}
