const { RETENTION_DAYS, dayBucket, expiresAt, isExpired } = require("./schedule")

const LATE_EVENING = Date.parse("2026-03-01T23:30:00Z")

describe("dayBucket", () => {
  it("buckets by the UTC day", () => {
    expect(dayBucket(Date.parse("2026-03-01T09:15:00Z"))).toBe("2026-03-01")
  })

  it("keeps a late-evening delivery in its own day", () => {
    expect(dayBucket(LATE_EVENING)).toBe("2026-03-01")
  })

  it("rolls over at midnight", () => {
    expect(dayBucket(LATE_EVENING + 31 * 60 * 1000)).toBe("2026-03-02")
  })

  it("pads single-digit months and days", () => {
    expect(dayBucket(Date.parse("2026-01-02T12:00:00Z"))).toBe("2026-01-02")
  })
})

// The staging relay keeps a week of deliveries, not the month a bare checkout
// defaults to. Run this suite with RELAY_RETENTION_DAYS=7, or through Dagger
// with `dagger settings jest environment RELAY_RETENTION_DAYS=7`.
describe("the configured retention window", () => {
  it("comes from the environment", () => {
    expect(RETENTION_DAYS).toBe(7)
  })

  it("is what expiresAt defaults to", () => {
    const at = Date.parse("2026-03-01T00:00:00Z")

    expect(expiresAt(at)).toBe(Date.parse("2026-03-08T00:00:00Z"))
  })
})

describe("expiresAt", () => {
  it("honours an explicit window", () => {
    const at = Date.parse("2026-03-01T00:00:00Z")

    expect(expiresAt(at, 1)).toBe(Date.parse("2026-03-02T00:00:00Z"))
  })

  it("never expires a delivery kept for zero days in the past", () => {
    const at = Date.parse("2026-03-01T00:00:00Z")

    expect(expiresAt(at, 0)).toBe(at)
  })
})

describe("isExpired", () => {
  const at = Date.parse("2026-03-01T00:00:00Z")

  it("is false inside the window", () => {
    expect(isExpired(at, at + 1000, 1)).toBe(false)
  })

  it("is true on the boundary", () => {
    expect(isExpired(at, expiresAt(at, 1), 1)).toBe(true)
  })
})
