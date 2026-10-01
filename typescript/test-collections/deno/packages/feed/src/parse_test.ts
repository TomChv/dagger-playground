import { assertEquals } from "@std/assert";
import { channelTitle, parseFeed } from "./parse.ts";

const XML = `<rss><channel>
  <title>Inline</title>
  <item><guid>a</guid><title>Second</title><link>https://a/2</link>
    <pubDate>2026-02-01T00:00:00Z</pubDate></item>
  <item><guid>b</guid><title>First</title><link>https://a/1</link>
    <pubDate>2026-03-01T00:00:00Z</pubDate></item>
  <item><title>No link</title><link></link></item>
</channel></rss>`;

Deno.test("parseFeed sorts newest first", () => {
  assertEquals(parseFeed(XML).map((i) => i.id), ["b", "a"]);
});

Deno.test("parseFeed drops entries without a link", () => {
  assertEquals(parseFeed(XML).length, 2);
});

Deno.test("channelTitle reads the channel header", () => {
  assertEquals(channelTitle(XML), "Inline");
});
