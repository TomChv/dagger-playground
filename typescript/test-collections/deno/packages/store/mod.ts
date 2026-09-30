export type Clock = () => number;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlStore<T> {
  #entries = new Map<string, Entry<T>>();
  #clock: Clock;
  #ttlMs: number;

  constructor(ttlMs: number, clock: Clock = Date.now) {
    if (ttlMs <= 0) throw new RangeError(`ttlMs must be > 0, got ${ttlMs}`);
    this.#ttlMs = ttlMs;
    this.#clock = clock;
  }

  set(key: string, value: T): void {
    this.#entries.set(key, { value, expiresAt: this.#clock() + this.#ttlMs });
  }

  get(key: string): T | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.#clock()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  get size(): number {
    this.sweep();
    return this.#entries.size;
  }

  sweep(): number {
    const now = this.#clock();
    let removed = 0;
    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= now) {
        this.#entries.delete(key);
        removed++;
      }
    }
    return removed;
  }
}
