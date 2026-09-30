import { assertEquals } from "@std/assert";
import { byTag, loadCatalog } from "./catalog.ts";

Deno.test("loadCatalog reads the bundled catalog", async () => {
  const entries = await loadCatalog("./fixtures/feeds.json");
  assertEquals(entries.length, 3);
  assertEquals(entries[0].id, "lobsters");
});

Deno.test("byTag narrows the catalog", async () => {
  const entries = await loadCatalog("./fixtures/feeds.json");
  assertEquals(byTag(entries, "tech").map((e) => e.id), [
    "lobsters",
    "hn",
  ]);
  assertEquals(byTag(entries, "nope"), []);
});
