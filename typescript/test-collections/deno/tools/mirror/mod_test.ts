import { assert, assertEquals, assertFalse } from "@std/assert";
import { mirrorFor, stale } from "./mod.ts";

Deno.test("mirrorFor maps a feed url onto disk", () => {
  assertEquals(
    mirrorFor("https://lobste.rs/rss").local,
    "/srv/mirror/lobste.rs/rss",
  );
});

Deno.test("mirrorFor names a bare host index", () => {
  assertEquals(
    mirrorFor("https://a.invalid/").local,
    "/srv/mirror/a.invalid/index",
  );
});

Deno.test("mirrorFor honours a custom root", () => {
  assertEquals(
    mirrorFor("https://a.invalid/x", "/tmp").local,
    "/tmp/a.invalid/x",
  );
});

Deno.test("stale compares against the max age", () => {
  const fetchedAt = new Date("2026-03-01T00:00:00Z");
  assert(stale(fetchedAt, new Date("2026-03-01T01:00:00Z"), 3_600_000));
  assertFalse(stale(fetchedAt, new Date("2026-03-01T00:59:59Z"), 3_600_000));
});
