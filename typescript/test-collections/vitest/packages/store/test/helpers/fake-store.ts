import { LinkStore } from "../../src/store"
import { fixedClock } from "../../src/clock"

export const EPOCH = Date.UTC(2026, 0, 1)

export function storeAt(now = EPOCH): LinkStore {
  return new LinkStore(fixedClock(now))
}

export async function seed(store: LinkStore, count: number, ttlSeconds = 60): Promise<string[]> {
  const slugs = Array.from({ length: count }, (_unused, index) => `slug${index}`)

  for (const slug of slugs) {
    await store.put(slug, `https://example.com/${slug}`, ttlSeconds)
  }

  return slugs
}
