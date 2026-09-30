import { encode, pad } from "./base62"

export type SlugSource = {
  next(): number
}

export function counterSource(start = 0): SlugSource {
  let value = start
  return { next: () => value++ }
}

export function slugOf(source: SlugSource, length: number): string {
  return pad(encode(source.next()), length)
}

export function uniqueSlug(
  source: SlugSource,
  length: number,
  taken: (slug: string) => boolean,
  attempts = 5,
): string {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const slug = slugOf(source, length)
    if (!taken(slug)) {
      return slug
    }
  }

  throw new Error(`no free slug after ${attempts} attempts`)
}
