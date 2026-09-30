const { BASE_DELAY_MS, MAX_DELAY_MS, delayFor, schedule } = require("./backoff")

describe("delayFor", () => {
  it("starts at the base delay", () => {
    expect(delayFor(1)).toBe(BASE_DELAY_MS)
  })

  it("doubles with every attempt", () => {
    expect([delayFor(2), delayFor(3), delayFor(4)]).toEqual([1000, 2000, 4000])
  })

  it("stops growing at the ceiling", () => {
    expect(delayFor(20)).toBe(MAX_DELAY_MS)
  })

  it("applies jitter as a fraction of the delay", () => {
    expect(delayFor(1, { jitter: 0.2 })).toBe(600)
  })

  it("rejects an attempt below one", () => {
    expect(() => delayFor(0)).toThrow(RangeError)
    expect(() => delayFor(0)).toThrow("attempt must be >= 1, got 0")
  })
})

describe("schedule", () => {
  it("lists one delay per attempt", () => {
    expect(schedule(3)).toEqual([500, 1000, 2000])
  })

  it("is empty for no attempts", () => {
    expect(schedule(0)).toEqual([])
  })
})
