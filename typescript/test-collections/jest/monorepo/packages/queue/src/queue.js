const { delayFor } = require("./backoff")

const MAX_ATTEMPTS = 3

class DeliveryQueue {
  #pending = []
  #dead = []

  constructor(deliver, { maxAttempts = MAX_ATTEMPTS } = {}) {
    this.deliver = deliver
    this.maxAttempts = maxAttempts
  }

  enqueue(delivery) {
    this.#pending.push({ ...delivery, attempts: 0 })

    return this.#pending.length
  }

  get pending() {
    return this.#pending.length
  }

  get dead() {
    return this.#dead.map((entry) => entry.id)
  }

  // Drains the queue once, re-queueing what failed until it runs out of
  // attempts. Resolves with the ids that were accepted.
  async drain() {
    const queued = this.#pending
    this.#pending = []
    const delivered = []

    for (const entry of queued) {
      const attempts = entry.attempts + 1

      try {
        await this.deliver(entry)
        delivered.push(entry.id)
      } catch (cause) {
        if (attempts >= this.maxAttempts) {
          this.#dead.push({ ...entry, attempts, cause })
        } else {
          this.#pending.push({ ...entry, attempts, retryIn: delayFor(attempts) })
        }
      }
    }

    return delivered
  }
}

module.exports = { MAX_ATTEMPTS, DeliveryQueue }
