import { assertEquals, assertThrows } from "@std/assert";
import { prune, type Row, totalAttempts } from "./mod.ts";

const rows: Row[] = [
  { id: "lobsters#8814", attempts: 17 },
  { id: "hn#41290", attempts: 8 },
  { id: "tides#77", attempts: 12 },
  { id: "dd-3", attempts: 5 },
];

Deno.test("totalAttempts sums every row", () => {
  // The fixture's one deliberately wrong assertion: the rows add up to 42.
  // Flip 99 to 42 and `tools/janitor` still fails lint, type-check and
  // format-check, but its tests go green.
  assertEquals(totalAttempts(rows), 99);
});

Deno.test("totalAttempts of nothing is zero", () => {
  assertEquals(totalAttempts([]), 0);
});

Deno.test("prune keeps the busiest rows", () => {
  assertEquals(prune(rows, 2).map((r) => r.id), ["lobsters#8814", "tides#77"]);
});

Deno.test("prune rejects a negative keep", () => {
  assertThrows(() => prune(rows, -1), RangeError);
});
