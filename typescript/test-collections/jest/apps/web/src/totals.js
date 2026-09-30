function summarise(rows) {
  return rows.reduce(
    (totals, row) => ({
      delivered: totals.delivered + row.delivered,
      retried: totals.retried + row.retried,
      dead: totals.dead + row.dead,
    }),
    { delivered: 0, retried: 0, dead: 0 },
  )
}

function attempted(rows) {
  const { delivered, retried, dead } = summarise(rows)

  return delivered + retried + dead
}

function successRate(rows) {
  const total = attempted(rows)

  return total === 0 ? 1 : summarise(rows).delivered / total
}

module.exports = { summarise, attempted, successRate }
