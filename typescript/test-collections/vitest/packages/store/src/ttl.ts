import type { Clock } from "./clock"

export type Lease = {
  createdAt: number
  ttlSeconds: number
}

export function expiresAt(lease: Lease): number {
  return lease.createdAt + lease.ttlSeconds * 1000
}

export function isExpired(lease: Lease, clock: Clock): boolean {
  return clock.now() >= expiresAt(lease)
}

export function remainingSeconds(lease: Lease, clock: Clock): number {
  return Math.max(0, Math.ceil((expiresAt(lease) - clock.now()) / 1000))
}

export function extend(lease: Lease, bySeconds: number): Lease {
  if (bySeconds <= 0) {
    throw new RangeError("can only extend a lease forward")
  }

  return { ...lease, ttlSeconds: lease.ttlSeconds + bySeconds }
}
