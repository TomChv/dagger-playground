import { assert, assertEquals, assertThrows } from "@std/assert";
import { TtlStore } from "./mod.ts";

function fakeClock(start = 0) {
  let now = start;
  const clock = () => now;
  return { clock, advance: (ms: number) => now += ms };
}

Deno.test("TtlStore returns a fresh value", () => {
  const { clock } = fakeClock();
  const store = new TtlStore<string>(1000, clock);
  store.set("a", "alpha");
  assertEquals(store.get("a"), "alpha");
});

Deno.test("TtlStore expires on the boundary", () => {
  const { clock, advance } = fakeClock();
  const store = new TtlStore<string>(1000, clock);
  store.set("a", "alpha");
  advance(999);
  assertEquals(store.get("a"), "alpha");
  advance(1);
  assertEquals(store.get("a"), undefined);
});

Deno.test("TtlStore sweeps expired entries", () => {
  const { clock, advance } = fakeClock();
  const store = new TtlStore<number>(100, clock);
  store.set("a", 1);
  advance(50);
  store.set("b", 2);
  advance(60);
  assertEquals(store.sweep(), 1);
  assertEquals(store.size, 1);
  assert(store.get("b") === 2);
});

Deno.test("TtlStore rejects a non-positive ttl", () => {
  assertThrows(() => new TtlStore(0), RangeError);
  assertThrows(() => new TtlStore(-1), RangeError);
});

Deno.test("TtlStore refreshes on overwrite", () => {
  const { clock, advance } = fakeClock();
  const store = new TtlStore<string>(100, clock);
  store.set("a", "one");
  advance(90);
  store.set("a", "two");
  advance(90);
  assertEquals(store.get("a"), "two");
});
