const OUTCOMES = ["delivered", "retried", "dead"]

function summarise(deliveries) {
  const byEndpoint = new Map()

  for (const delivery of deliveries) {
    const row = byEndpoint.get(delivery.endpoint) ?? {
      endpoint: delivery.endpoint,
      delivered: 0,
      retried: 0,
      dead: 0,
    }
    row[delivery.outcome] += 1
    byEndpoint.set(delivery.endpoint, row)
  }

  return [...byEndpoint.values()].sort((left, right) => right.dead - left.dead)
}

function successRate(row) {
  const total = OUTCOMES.reduce((sum, outcome) => sum + row[outcome], 0)

  return total === 0 ? 1 : row.delivered / total
}

function digest(deliveries, now = new Date()) {
  const rows = summarise(deliveries)

  return {
    generatedAt: now.toISOString(),
    endpoints: rows.length,
    worst: rows.find((row) => successRate(row) < 0.5)?.endpoint ?? null,
    rows,
  }
}

module.exports = { OUTCOMES, summarise, successRate, digest }
