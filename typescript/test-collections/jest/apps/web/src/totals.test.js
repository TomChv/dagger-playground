const { summarise, attempted, successRate } = require("./totals")

const rows = [
  { endpoint: "billing", delivered: 20, retried: 3, dead: 1 },
  { endpoint: "crm", delivered: 12, retried: 4, dead: 2 },
]

describe("summarise", () => {
  it("adds each outcome across the rows", () => {
    expect(summarise(rows)).toEqual({ delivered: 32, retried: 7, dead: 3 })
  })

  it("is all zeroes for an empty dashboard", () => {
    expect(summarise([])).toEqual({ delivered: 0, retried: 0, dead: 0 })
  })
})

describe("attempted", () => {
  // The deliberate failure: the rows above add up to 42.
  it("counts every attempt", () => {
    expect(attempted(rows)).toBe(99)
  })

  it("is zero for an empty dashboard", () => {
    expect(attempted([])).toBe(0)
  })
})

describe("successRate", () => {
  it("is the delivered share of every attempt", () => {
    expect(successRate(rows)).toBeCloseTo(32 / 42, 5)
  })

  it("is one when nothing was attempted", () => {
    expect(successRate([])).toBe(1)
  })
})
