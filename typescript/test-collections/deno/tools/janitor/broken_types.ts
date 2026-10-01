// A TS2322 that only `deno check .` reaches: no test imports this file, so
// `deno test` never type-checks it. Narrow the check with
// `dagger settings deno typeCheckTargets mod.ts` and this file drops out.
export const WINDOW_DAYS: number = "P14D";

export function describeWindow(): string {
  return `retaining ${WINDOW_DAYS} days`;
}
