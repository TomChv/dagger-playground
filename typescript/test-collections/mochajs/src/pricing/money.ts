const CENTS_PER_UNIT = 100

function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new RangeError(`Money is stored in whole cents, got ${cents}`)
    }

    return new Money(cents)
  }

  static fromAmount(amount: number): Money {
    if (!Number.isFinite(amount)) {
      throw new RangeError(`Money requires a finite amount, got ${amount}`)
    }

    return new Money(roundHalfAwayFromZero(amount * CENTS_PER_UNIT))
  }

  static zero(): Money {
    return new Money(0)
  }

  static sum(values: readonly Money[]): Money {
    return values.reduce<Money>((total, value) => total.plus(value), Money.zero())
  }

  static min(a: Money, b: Money): Money {
    return a.cents <= b.cents ? a : b
  }

  static max(a: Money, b: Money): Money {
    return a.cents >= b.cents ? a : b
  }

  get amount(): number {
    return this.cents / CENTS_PER_UNIT
  }

  get isZero(): boolean {
    return this.cents === 0
  }

  get isNegative(): boolean {
    return this.cents < 0
  }

  plus(other: Money): Money {
    return new Money(this.cents + other.cents)
  }

  minus(other: Money): Money {
    return new Money(this.cents - other.cents)
  }

  times(factor: number): Money {
    if (!Number.isFinite(factor)) {
      throw new RangeError(`Money can only be scaled by a finite factor, got ${factor}`)
    }

    return new Money(roundHalfAwayFromZero(this.cents * factor))
  }

  percentage(percent: number): Money {
    return this.times(percent / 100)
  }

  negated(): Money {
    return new Money(-this.cents)
  }

  clampToZero(): Money {
    return this.isNegative ? Money.zero() : this
  }

  /**
   * Splits the amount along `ratios`, handing leftover cents to the earliest
   * shares so that the parts always add back up to the whole.
   */
  allocate(ratios: readonly number[]): Money[] {
    if (ratios.length === 0) {
      throw new RangeError("allocate requires at least one ratio")
    }

    if (ratios.some((ratio) => ratio < 0 || !Number.isFinite(ratio))) {
      throw new RangeError("allocate requires finite, non-negative ratios")
    }

    const totalRatio = ratios.reduce((total, ratio) => total + ratio, 0)
    if (totalRatio === 0) {
      throw new RangeError("allocate requires ratios that sum to more than zero")
    }

    const shares = ratios.map((ratio) => Math.trunc((this.cents * ratio) / totalRatio))
    const remainder = Math.abs(this.cents - shares.reduce((total, share) => total + share, 0))
    const step = Math.sign(this.cents)

    for (let i = 0; i < remainder; i++) {
      shares[i % shares.length] += step
    }

    return shares.map((share) => new Money(share))
  }

  compare(other: Money): number {
    return this.cents - other.cents
  }

  equals(other: Money): boolean {
    return this.cents === other.cents
  }

  greaterThan(other: Money): boolean {
    return this.cents > other.cents
  }

  lessThan(other: Money): boolean {
    return this.cents < other.cents
  }

  format(): string {
    const sign = this.isNegative ? "-" : ""
    const absolute = Math.abs(this.cents)
    const units = Math.trunc(absolute / CENTS_PER_UNIT)
    const fraction = String(absolute % CENTS_PER_UNIT).padStart(2, "0")

    return `${sign}$${units}.${fraction}`
  }

  toString(): string {
    return this.format()
  }

  toJSON(): { cents: number } {
    return { cents: this.cents }
  }
}
