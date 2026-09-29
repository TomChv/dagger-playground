import { randomUUID } from "node:crypto"

export type IdGenerator = () => string

export function sequentialIds(prefix: string, start = 1): IdGenerator {
  let next = start

  return () => `${prefix}-${next++}`
}

export function randomIds(prefix: string): IdGenerator {
  return () => `${prefix}-${randomUUID()}`
}
