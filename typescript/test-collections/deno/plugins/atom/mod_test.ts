import { assert, assertEquals, assertFalse } from "@std/assert";
import { entryIds, sniff } from "./mod.ts";

const DOC = `<feed xmlns="http://www.w3.org/2005/Atom">
  <entry><id>tag:a,2026:1</id></entry>
  <entry><id> tag:a,2026:2 </id></entry>
</feed>`;

Deno.test("sniff recognises the atom namespace", () => {
  assert(sniff(DOC));
});

Deno.test("sniff rejects rss", () => {
  assertFalse(sniff(`<rss version="2.0"/>`));
});

Deno.test("entryIds trims every id", () => {
  assertEquals(entryIds(DOC), ["tag:a,2026:1", "tag:a,2026:2"]);
});

Deno.test("entryIds is empty for a feed with no entries", () => {
  assertEquals(
    entryIds(`<feed xmlns="${"http://www.w3.org/2005/Atom"}"/>`),
    [],
  );
});
