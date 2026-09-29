import type { Order } from "./order.js"
import type { OrderRepository } from "./order-repository.js"

export class InMemoryOrderRepository implements OrderRepository {
  readonly #orders = new Map<string, Order>()

  get size(): number {
    return this.#orders.size
  }

  async save(order: Order): Promise<void> {
    this.#orders.set(order.id, order)
  }

  async findById(id: string): Promise<Order | undefined> {
    return this.#orders.get(id)
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return [...this.#orders.values()].filter((order) => order.customerId === customerId)
  }
}
