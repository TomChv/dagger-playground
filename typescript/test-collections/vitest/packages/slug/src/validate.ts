import { ALPHABET } from "./base62"

export const RESERVED = new Set(["api", "admin", "health", "new", "stats"])

export type SlugRejection = "empty" | "too_long" | "reserved" | "bad_charset"

export function reject(slug: string, maxLength = 12): SlugRejection | null {
  if (slug === "") {
    return "empty"
  }

  if (slug.length > maxLength) {
    return "too_long"
  }

  if (RESERVED.has(slug.toLowerCase())) {
    return "reserved"
  }

  if ([...slug].some((char) => !ALPHABET.includes(char))) {
    return "bad_charset"
  }

  return null
}

export function isValid(slug: string, maxLength = 12): boolean {
  return reject(slug, maxLength) === null
}
