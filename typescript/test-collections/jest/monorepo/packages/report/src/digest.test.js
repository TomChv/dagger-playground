const { summarise, successRate, digest } = require("./digest")

const deliveries = [
  { endpoint: "billing", outcome: "delivered" },
  { endpoint: "billing", outcome: "delivered" },
  { endpoint: "billing", outcome: "retried" },
  { endpoint: "crm", outcome: "dead" },
  { endpoint: "crm", outcome: "dead" },
  { endpoint: "crm", outcome: "delivered" },
]

describe("summarise", () => {
  it("counts each outcome per endpoint", () => {
    expect(summarise(deliveries)).toEqual([
      { endpoint: "crm", delivered: 1, retried: 0, dead: 2 },
      { endpoint: "billing", delivered: 2, retried: 1, dead: 0 },
    ])
  })

  it("puts the endpoints with the most dead letters first", () => {
    expect(summarise(deliveries).map((row) => row.endpoint)).toEqual(["crm", "billing"])
  })

  it("has nothing to report for an empty day", () => {
    expect(summarise([])).toEqual([])
  })
})

describe("successRate", () => {
  it("is the delivered share of every attempt", () => {
    expect(successRate({ delivered: 3, retried: 1, dead: 0 })).toBe(0.75)
  })

  it("is one for an endpoint nothing was sent to", () => {
    expect(successRate({ delivered: 0, retried: 0, dead: 0 })).toBe(1)
  })
})

describe("digest", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-02T04:00:00Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("stamps itself with the run time", () => {
    expect(digest(deliveries).generatedAt).toBe("2026-03-02T04:00:00.000Z")
  })

  it("names the worst endpoint", () => {
    expect(digest(deliveries).worst).toBe("crm")
  })

  it("leaves worst empty when every endpoint is healthy", () => {
    const healthy = deliveries.filter((delivery) => delivery.endpoint === "billing")

    expect(digest(healthy).worst).toBeNull()
  })

  it("counts the endpoints it covers", () => {
    expect(digest(deliveries).endpoints).toBe(2)
  })
})
