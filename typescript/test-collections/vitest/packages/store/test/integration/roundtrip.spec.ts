import { describe, expect, it } from "vitest"
import { seed, storeAt } from "../helpers/fake-store"

describe("store roundtrip", () => {
  it("keeps every seeded link readable", async () => {
    const store = storeAt()
    const slugs = await seed(store, 5)

    for (const slug of slugs) {
      await expect(store.get(slug)).resolves.toMatchObject({
        target: `https://example.com/${slug}`,
      })
    }
  })

  it("reports the remaining ttl of a seeded link", async () => {
    const store = storeAt()
    await seed(store, 1, 120)

    await expect(store.ttl("slug0")).resolves.toBe(120)
  })

  it("sweeps nothing while every lease is live", async () => {
    const store = storeAt()
    await seed(store, 3)

    await expect(store.sweep()).resolves.toEqual([])
  })
})
