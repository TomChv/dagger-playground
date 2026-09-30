const { DeliveryQueue } = require("./queue")

const delivery = (id) => ({ id, url: `https://hooks.example/${id}`, body: "{}" })

describe("DeliveryQueue", () => {
  it("reports how many deliveries are waiting", () => {
    const queue = new DeliveryQueue(jest.fn())

    expect(queue.enqueue(delivery("a"))).toBe(1)
    expect(queue.enqueue(delivery("b"))).toBe(2)
    expect(queue.pending).toBe(2)
  })

  it("drains everything a working endpoint accepts", async () => {
    const deliver = jest.fn().mockResolvedValue(undefined)
    const queue = new DeliveryQueue(deliver)
    queue.enqueue(delivery("a"))
    queue.enqueue(delivery("b"))

    await expect(queue.drain()).resolves.toEqual(["a", "b"])
    expect(deliver).toHaveBeenCalledTimes(2)
    expect(queue.pending).toBe(0)
  })

  it("re-queues a failed delivery with its next backoff", async () => {
    const queue = new DeliveryQueue(jest.fn().mockRejectedValue(new Error("503")))
    queue.enqueue(delivery("a"))

    await expect(queue.drain()).resolves.toEqual([])
    expect(queue.pending).toBe(1)
    expect(queue.dead).toEqual([])
  })

  it("shelves a delivery that runs out of attempts", async () => {
    const queue = new DeliveryQueue(jest.fn().mockRejectedValue(new Error("410")), {
      maxAttempts: 2,
    })
    queue.enqueue(delivery("a"))

    await queue.drain()
    await queue.drain()

    expect(queue.pending).toBe(0)
    expect(queue.dead).toEqual(["a"])
  })

  it("keeps the healthy deliveries of a mixed batch", async () => {
    const deliver = jest.fn(async (entry) => {
      if (entry.id === "b") {
        throw new Error("500")
      }
    })
    const queue = new DeliveryQueue(deliver)
    queue.enqueue(delivery("a"))
    queue.enqueue(delivery("b"))
    queue.enqueue(delivery("c"))

    await expect(queue.drain()).resolves.toEqual(["a", "c"])
    expect(queue.pending).toBe(1)
  })

  // Callback style: the toolchain wraps every test function, and a wrapper that
  // loses the arity leaves Jest waiting for a `done` that is never passed.
  it("drains from a callback-style test", (done) => {
    const queue = new DeliveryQueue(jest.fn().mockResolvedValue(undefined))
    queue.enqueue(delivery("a"))

    queue.drain().then((ids) => {
      expect(ids).toEqual(["a"])
      done()
    }, done)
  })

  it.skip("collapses duplicate ids before draining", () => {
    throw new Error("not implemented yet")
  })

  test.todo("moves the dead-letter shelf to durable storage")
})
