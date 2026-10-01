import { assert, assertEquals, assertFalse } from "@std/assert";
import { guessVersion, sniff } from "./mod.ts";

Deno.test("sniff recognises an rss document", () => {
  assert(sniff(`<rss version="2.0"><channel/></rss>`));
  assert(sniff(`<rss>`));
});

Deno.test("sniff rejects atom", () => {
  assertFalse(sniff(`<feed xmlns="http://www.w3.org/2005/Atom"/>`));
  assertFalse(sniff(`<rssish/>`));
});

Deno.test("guessVersion reads the version attribute", () => {
  assertEquals(guessVersion(`<rss version="2.0">`), "2.0");
  assertEquals(guessVersion(`<rss>`), "unknown");
});
