import { assertEquals } from "@std/assert";
import {
  dedupe,
  type Item,
  itemKey,
  newestFirst,
  normalizeTitle,
} from "./mod.ts";

function item(id: string, title: string, link: string, iso: string): Item {
  return { id, title, link, published: new Date(iso) };
}

Deno.test("normalizeTitle collapses whitespace", () => {
  assertEquals(normalizeTitle("  Tides\n  and   Timing "), "Tides and Timing");
});

Deno.test("itemKey ignores case and whitespace", () => {
  assertEquals(
    itemKey({ link: "https://a/1", title: "Tides  And Timing" }),
    itemKey({ link: "https://a/1", title: "tides and timing" }),
  );
});

Deno.test("dedupe keeps the first of a duplicate pair", () => {
  const items = [
    item("1", "Tides", "https://a/1", "2026-01-01T00:00:00Z"),
    item("2", "  tides ", "https://a/1", "2026-01-02T00:00:00Z"),
    item("3", "Timing", "https://a/2", "2026-01-03T00:00:00Z"),
  ];
  assertEquals(dedupe(items).map((i) => i.id), ["1", "3"]);
});

Deno.test("newestFirst sorts without mutating", () => {
  const items = [
    item("1", "a", "https://a/1", "2026-01-01T00:00:00Z"),
    item("2", "b", "https://a/2", "2026-03-01T00:00:00Z"),
    item("3", "c", "https://a/3", "2026-02-01T00:00:00Z"),
  ];
  assertEquals(newestFirst(items).map((i) => i.id), ["2", "3", "1"]);
  assertEquals(items.map((i) => i.id), ["1", "2", "3"]);
});
