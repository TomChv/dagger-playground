// Vendored from driftfeed 0.1 and never migrated. `exclude` in deno.json keeps
// it out of lint, fmt and type-check; drop that entry and `deno check .` fails
// here with TS2322.
export const RETENTION_DAYS: number = "P30D";

export function legacyKey(id: string) {
  return "driftfeed::" + id;
}
