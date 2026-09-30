import { beforeEach, describe, expect, it, vi } from "vitest"
import { EPOCH } from "../test/helpers/fake-store"
import { fixedClock, systemClock } from "./clock"
import { LinkStore } from "./store"
import { expiresAt, extend, isExpired, remainingSeconds, type Lease } from "./ttl"

const lease: Lease = { createdAt: EPOCH, ttlSeconds: 60 }

describe("expiresAt", () => {
  it("adds the ttl in milliseconds", () => {
    expect(expiresAt(lease)).toBe(EPOCH + 60_000)
  })
})

describe("isExpired", () => {
  it("is false before the expiry", () => {
    expect(isExpired(lease, fixedClock(EPOCH + 59_999))).toBe(false)
  })

  it("is true at the expiry", () => {
    expect(isExpired(lease, fixedClock(EPOCH + 60_000))).toBe(true)
  })
})

describe("remainingSeconds", () => {
  it("rounds a partial second up", () => {
    expect(remainingSeconds(lease, fixedClock(EPOCH + 59_001))).toBe(1)
  })

  it("never goes below zero", () => {
    expect(remainingSeconds(lease, fixedClock(EPOCH + 600_000))).toBe(0)
  })
})

describe("extend", () => {
  it("adds to the ttl and leaves the creation time alone", () => {
    expect(extend(lease, 30)).toEqual({ createdAt: EPOCH, ttlSeconds: 90 })
  })

  it.each([0, -1])("refuses to extend by %i", (bySeconds) => {
    expect(() => extend(lease, bySeconds)).toThrowError(RangeError)
  })
})

describe("expiry against the system clock", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH)
  })

  it("drops a link once its ttl elapses", async () => {
    const store = new LinkStore(systemClock)
    await store.put("abcd", "https://example.com", 60)

    vi.advanceTimersByTime(59_000)
    await expect(store.ttl("abcd")).resolves.toBe(1)

    vi.advanceTimersByTime(1_000)
    await expect(store.get("abcd")).resolves.toBeNull()
  })

  it("sweeps only the expired links", async () => {
    const store = new LinkStore(systemClock)
    await store.put("short", "https://example.com/short", 10)
    await store.put("long", "https://example.com/long", 600)

    vi.advanceTimersByTime(30_000)

    await expect(store.sweep()).resolves.toEqual(["short"])
    expect(store.size).toBe(1)
  })
})
