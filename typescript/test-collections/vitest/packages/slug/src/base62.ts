export const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

export function encode(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`cannot encode ${value}`)
  }

  if (value === 0) {
    return ALPHABET[0] as string
  }

  let remaining = value
  let encoded = ""
  while (remaining > 0) {
    encoded = ALPHABET[remaining % 62] + encoded
    remaining = Math.floor(remaining / 62)
  }

  return encoded
}

export function decode(encoded: string): number {
  if (encoded === "") {
    throw new RangeError("cannot decode an empty string")
  }

  return [...encoded].reduce((value, char) => {
    const digit = ALPHABET.indexOf(char)
    if (digit < 0) {
      throw new RangeError(`${char} is not a base62 digit`)
    }
    return value * 62 + digit
  }, 0)
}

export function pad(encoded: string, length: number): string {
  return encoded.padStart(length, ALPHABET[0] as string)
}
