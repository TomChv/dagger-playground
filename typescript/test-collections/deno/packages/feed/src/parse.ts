import {
  dedupe,
  type Item,
  newestFirst,
  normalizeTitle,
} from "@driftfeed/core";

const ITEM = /<item>([\s\S]*?)<\/item>/g;

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? match[1].trim() : "";
}

export function parseFeed(xml: string): Item[] {
  const items: Item[] = [];
  for (const [, block] of xml.matchAll(ITEM)) {
    const link = tag(block, "link");
    if (link === "") continue;
    items.push({
      id: tag(block, "guid") || link,
      title: normalizeTitle(tag(block, "title")),
      link,
      published: new Date(tag(block, "pubDate")),
    });
  }
  return newestFirst(dedupe(items));
}

export function channelTitle(xml: string): string {
  const channel = xml.match(/<channel>([\s\S]*?)<item>/);
  return channel ? normalizeTitle(tag(channel[1], "title")) : "";
}
