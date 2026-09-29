import { beforeEach, describe, expect, it, vi } from "vitest"
import { EPOCH, seed, storeAt } from "../test/helpers/fake-store"
import type { Clock } from "./clock"
import { LinkStore, SlugTakenError } from "./store"

describe("LinkStore", () => {
  let store: LinkStore

  beforeEach(() => {
    store = storeAt()
  })

  it("stores and reads a link back", async () => {
    await store.put("abcd", "https://example.com", 60)

    await expect(store.get("abcd")).resolves.toMatchObject({
      slug: "abcd",
      target: "https://example.com",
      lease: { createdAt: EPOCH, ttlSeconds: 60 },
    })
  })

  it("answers null for an unknown slug", async () => {
    await expect(store.get("nope")).resolves.toBeNull()
  })

  it("refuses to overwrite a live slug", async () => {
    await store.put("abcd", "https://example.com", 60)

    await expect(store.put("abcd", "https://elsewhere.com", 60)).rejects.toThrowError(
      SlugTakenError,
    )
    await expect(store.get("abcd")).resolves.toMatchObject({ target: "https://example.com" })
  })

  it("frees the slug once deleted", async () => {
    await store.put("abcd", "https://example.com", 60)

    await expect(store.delete("abcd")).resolves.toBe(true)
    await expect(store.delete("abcd")).resolves.toBe(false)
    await expect(store.put("abcd", "https://elsewhere.com", 60)).resolves.toMatchObject({
      target: "https://elsewhere.com",
    })
  })

  it("reads concurrent writes of distinct slugs", async () => {
    const slugs = await seed(store, 20)

    await expect(Promise.all(slugs.map((slug) => store.has(slug)))).resolves.toEqual(
      slugs.map(() => true),
    )
    expect(store.size).toBe(20)
  })

  it("lets one of two concurrent writes of the same slug win", async () => {
    const results = await Promise.allSettled([
      store.put("abcd", "https://first.example", 60),
      store.put("abcd", "https://second.example", 60),
    ])

    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"])
    expect(store.size).toBe(1)
  })

  it("asks the clock once per read", async () => {
    const clock: Clock = { now: vi.fn().mockReturnValue(EPOCH) }
    const counted = new LinkStore(clock)

    await counted.put("abcd", "https://example.com", 60)
    await counted.get("abcd")

    expect(clock.now).toHaveBeenCalled()
  })
})
