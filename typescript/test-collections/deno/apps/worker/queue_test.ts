import { assertEquals, assertThrows } from "@std/assert";
import { backoffMs, due } from "./mod.ts";

Deno.test("backoffMs doubles per try", () => {
  assertEquals([1, 2, 3, 4].map((t) => backoffMs(t)), [250, 500, 1000, 2000]);
});

Deno.test("backoffMs saturates at the cap", () => {
  assertEquals(backoffMs(20), 30_000);
  assertEquals(backoffMs(20, 250, 900), 900);
});

Deno.test("backoffMs rejects a zeroth try", () => {
  assertThrows(() => backoffMs(0), RangeError);
});

Deno.test("due drops exhausted attempts", () => {
  const attempts = [
    { id: "a", tries: 1 },
    { id: "b", tries: 5 },
    { id: "c", tries: 4 },
  ];
  assertEquals(due(attempts, 5).map((a) => a.id), ["a", "c"]);
});
