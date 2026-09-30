// Two recommended lint rules fire here on purpose: no-explicit-any and
// no-unused-vars. Nothing imports this file, so only `deno lint` sees it.
export function sweep(entries: string[]): any {
  const cutoff = 30;
  return entries.filter((entry) => entry.length > 0);
}
