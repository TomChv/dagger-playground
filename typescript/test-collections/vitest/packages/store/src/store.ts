import { systemClock, type Clock } from "./clock"
import { isExpired, remainingSeconds, type Lease } from "./ttl"

export type Link = {
  slug: string
  target: string
  lease: Lease
}

export class SlugTakenError extends Error {
  readonly code = "slug_taken"

  constructor(readonly slug: string) {
    super(`slug ${slug} is taken`)
    this.name = "SlugTakenError"
  }
}

export class LinkStore {
  private readonly links = new Map<string, Link>()

  constructor(private readonly clock: Clock = systemClock) {}

  async put(slug: string, target: string, ttlSeconds: number): Promise<Link> {
    // Nothing is awaited between the check and the write, so two concurrent
    // puts of the same slug cannot both win.
    const existing = this.links.get(slug)
    if (existing !== undefined && !isExpired(existing.lease, this.clock)) {
      throw new SlugTakenError(slug)
    }

    const link = { slug, target, lease: { createdAt: this.clock.now(), ttlSeconds } }
    this.links.set(slug, link)
    return link
  }

  async get(slug: string): Promise<Link | null> {
    const link = this.links.get(slug)
    if (link === undefined) {
      return null
    }

    if (isExpired(link.lease, this.clock)) {
      this.links.delete(slug)
      return null
    }

    return link
  }

  async has(slug: string): Promise<boolean> {
    return (await this.get(slug)) !== null
  }

  async ttl(slug: string): Promise<number | null> {
    const link = await this.get(slug)
    return link === null ? null : remainingSeconds(link.lease, this.clock)
  }

  async delete(slug: string): Promise<boolean> {
    return this.links.delete(slug)
  }

  async sweep(): Promise<string[]> {
    const expired = [...this.links.values()]
      .filter((link) => isExpired(link.lease, this.clock))
      .map((link) => link.slug)

    for (const slug of expired) {
      this.links.delete(slug)
    }

    return expired
  }

  get size(): number {
    return this.links.size
  }
}
