import { describe, expect, it } from "vitest"
import { ALPHABET, decode, encode, pad } from "./base62"

describe("encode", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [10, "A"],
    [61, "z"],
    [62, "10"],
    [3843, "zz"],
    [238328, "1000"],
  ])("encodes %i as %s", (value, expected) => {
    expect(encode(value)).toBe(expected)
  })

  it.each([-1, 1.5, Number.NaN])("rejects %s", (value) => {
    expect(() => encode(value)).toThrowError(RangeError)
  })
})

describe("decode", () => {
  it("round trips every encodable value in a sample", () => {
    for (const value of [0, 1, 61, 62, 999, 123456789]) {
      expect(decode(encode(value))).toBe(value)
    }
  })

  it("rejects a digit outside the alphabet", () => {
    expect(() => decode("ab-cd")).toThrowError("- is not a base62 digit")
  })

  it("rejects an empty string", () => {
    expect(() => decode("")).toThrowError(/empty string/)
  })
})

describe("pad", () => {
  it("left pads with the zero digit", () => {
    expect(pad("1", 4)).toBe("0001")
  })

  it("leaves a longer value untouched", () => {
    expect(pad("abcdef", 4)).toBe("abcdef")
  })
})

describe("ALPHABET", () => {
  it("holds 62 distinct url safe digits", () => {
    expect(ALPHABET).toHaveLength(62)
    expect(new Set(ALPHABET).size).toBe(62)
    expect(encodeURIComponent(ALPHABET)).toBe(ALPHABET)
  })
})
