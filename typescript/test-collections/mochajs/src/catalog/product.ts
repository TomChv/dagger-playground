import type { Money } from "../pricing/money.js"

export type Category = "books" | "electronics" | "groceries" | "apparel"

export interface Product {
  readonly sku: string
  readonly name: string
  readonly price: Money
  readonly category: Category
  readonly taxRate: number
}
