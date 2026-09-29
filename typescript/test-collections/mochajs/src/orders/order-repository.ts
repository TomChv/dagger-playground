import type { Order } from "./order.js"

export interface OrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | undefined>
  findByCustomer(customerId: string): Promise<Order[]>
}
