import { DuplicateSkuError, ProductNotFoundError } from "../errors.js"
import type { Category, Product } from "./product.js"

export class Catalog {
  readonly #bySku = new Map<string, Product>()

  constructor(products: readonly Product[] = []) {
    for (const product of products) {
      this.add(product)
    }
  }

  get size(): number {
    return this.#bySku.size
  }

  get products(): Product[] {
    return [...this.#bySku.values()]
  }

  add(product: Product): this {
    if (this.#bySku.has(product.sku)) {
      throw new DuplicateSkuError(product.sku)
    }

    this.#bySku.set(product.sku, product)

    return this
  }

  find(sku: string): Product | undefined {
    return this.#bySku.get(sku)
  }

  mustFind(sku: string): Product {
    const product = this.#bySku.get(sku)
    if (!product) {
      throw new ProductNotFoundError(sku)
    }

    return product
  }

  byCategory(category: Category): Product[] {
    return this.products.filter((product) => product.category === category)
  }
}
