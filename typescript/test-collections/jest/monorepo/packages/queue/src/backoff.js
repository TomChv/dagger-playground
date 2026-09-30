const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 60_000

function delayFor(attempt, { jitter = 0 } = {}) {
  if (attempt < 1) {
    throw new RangeError(`attempt must be >= 1, got ${attempt}`)
  }

  const exponential = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS)

  return Math.round(exponential * (1 + jitter))
}

function schedule(attempts, options) {
  return Array.from({ length: attempts }, (_, index) => delayFor(index + 1, options))
}

module.exports = { BASE_DELAY_MS, MAX_DELAY_MS, delayFor, schedule }
