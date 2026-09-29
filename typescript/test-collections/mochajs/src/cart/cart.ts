import type { Product } from "../catalog/product.js"
import { InvalidQuantityError, LineNotFoundError } from "../errors.js"
import { Money } from "../pricing/money.js"

export interface CartLine {
  readonly product: Product
  readonly quantity: number
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new InvalidQuantityError(quantity)
  }
}

export class Cart {
  readonly #lines = new Map<string, CartLine>()

  static of(...entries: readonly [Product, number][]): Cart {
    const cart = new Cart()
    for (const [product, quantity] of entries) {
      cart.add(product, quantity)
    }

    return cart
  }

  get lines(): CartLine[] {
    return [...this.#lines.values()]
  }

  get lineCount(): number {
    return this.#lines.size
  }

  get itemCount(): number {
    return this.lines.reduce((count, line) => count + line.quantity, 0)
  }

  get isEmpty(): boolean {
    return this.#lines.size === 0
  }

  has(sku: string): boolean {
    return this.#lines.has(sku)
  }

  lineOf(sku: string): CartLine | undefined {
    return this.#lines.get(sku)
  }

  add(product: Product, quantity = 1): this {
    assertQuantity(quantity)

    const existing = this.#lines.get(product.sku)
    this.#lines.set(product.sku, {
      product,
      quantity: (existing?.quantity ?? 0) + quantity,
    })

    return this
  }

  setQuantity(sku: string, quantity: number): this {
    const line = this.#lines.get(sku)
    if (!line) {
      throw new LineNotFoundError(sku)
    }

    if (quantity === 0) {
      return this.remove(sku)
    }

    assertQuantity(quantity)
    this.#lines.set(sku, { product: line.product, quantity })

    return this
  }

  remove(sku: string): this {
    if (!this.#lines.delete(sku)) {
      throw new LineNotFoundError(sku)
    }

    return this
  }

  clear(): this {
    this.#lines.clear()

    return this
  }

  lineTotal(sku: string): Money {
    const line = this.#lines.get(sku)
    if (!line) {
      throw new LineNotFoundError(sku)
    }

    return line.product.price.times(line.quantity)
  }

  subtotal(): Money {
    return Money.sum(this.lines.map((line) => line.product.price.times(line.quantity)))
  }

  /** Tax is rounded per line, the way an invoice prints it. */
  taxTotal(): Money {
    return Money.sum(
      this.lines.map((line) => line.product.price.times(line.quantity).times(line.product.taxRate)),
    )
  }

  total(): Money {
    return this.subtotal().plus(this.taxTotal())
  }
}
