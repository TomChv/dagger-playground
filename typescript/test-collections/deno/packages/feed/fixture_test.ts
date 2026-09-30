import { assertEquals } from "@std/assert";
import { channelTitle, parseFeed } from "./mod.ts";

// The path is relative to the *workspace root*, the way this workspace's own CI
// runs `deno test` from there. Run this file from packages/feed instead and it
// fails with NotFound: that is the control for "a member runs from the root".
const SAMPLE = "./fixtures/sample.xml";

Deno.test("parses the sample feed from the workspace root", async () => {
  const xml = await Deno.readTextFile(SAMPLE);
  assertEquals(channelTitle(xml), "Driftwood Daily");
  assertEquals(parseFeed(xml).map((i) => i.id), ["dd-3", "dd-1", "dd-2"]);
});

Deno.test("the sample feed has no duplicates", async () => {
  const xml = await Deno.readTextFile(SAMPLE);
  const links = parseFeed(xml).map((i) => i.link);
  assertEquals(new Set(links).size, links.length);
});
