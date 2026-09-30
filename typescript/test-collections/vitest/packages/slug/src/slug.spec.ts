import { beforeEach, describe, expect, it, vi } from "vitest"
import { counterSource, slugOf, uniqueSlug, type SlugSource } from "./slug"

describe("counterSource", () => {
  it("hands out consecutive values", () => {
    const source = counterSource()

    expect([source.next(), source.next(), source.next()]).toEqual([0, 1, 2])
  })

  it("starts where it is told", () => {
    expect(counterSource(61).next()).toBe(61)
  })
})

describe("slugOf", () => {
  it("pads to the requested length", () => {
    expect(slugOf(counterSource(), 7)).toBe("0000000")
    expect(slugOf(counterSource(62), 7)).toBe("0000010")
  })
})

describe("uniqueSlug", () => {
  let source: SlugSource

  beforeEach(() => {
    source = counterSource()
  })

  it("returns the first free slug", () => {
    const taken = vi.fn().mockReturnValue(false)

    expect(uniqueSlug(source, 4, taken)).toBe("0000")
    expect(taken).toHaveBeenCalledOnce()
  })

  it("retries until the source yields a free slug", () => {
    const taken = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false)

    expect(uniqueSlug(source, 4, taken)).toBe("0002")
    expect(taken).toHaveBeenCalledTimes(3)
  })

  it("gives up after the attempt budget", () => {
    const taken = vi.fn().mockReturnValue(true)

    expect(() => uniqueSlug(source, 4, taken, 3)).toThrowError("no free slug after 3 attempts")
    expect(taken).toHaveBeenCalledTimes(3)
  })
})
