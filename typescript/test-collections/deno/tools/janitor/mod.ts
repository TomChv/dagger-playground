export interface Row {
  id: string;
  attempts: number;
}

export function totalAttempts(rows: Row[]): number {
  return rows.reduce((sum, row) => sum + row.attempts, 0);
}

export function prune(rows: Row[], keep: number): Row[] {
  if (keep < 0) throw new RangeError(`keep must be >= 0, got ${keep}`);
  return [...rows]
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, keep);
}
