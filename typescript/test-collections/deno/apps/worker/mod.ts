export interface Attempt {
  id: string;
  tries: number;
}

export function backoffMs(tries: number, baseMs = 250, capMs = 30_000): number {
  if (tries < 1) throw new RangeError(`tries must be >= 1, got ${tries}`);
  return Math.min(capMs, baseMs * 2 ** (tries - 1));
}

export function due(attempts: Attempt[], maxTries: number): Attempt[] {
  return attempts.filter((a) => a.tries < maxTries);
}

export function spoolSize(spool: { pending: unknown[] }): number {
  return spool.pending.length;
}
