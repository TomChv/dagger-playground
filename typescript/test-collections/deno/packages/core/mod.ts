export interface Item {
  id: string;
  title: string;
  link: string;
  published: Date;
}

export function normalizeTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function itemKey(item: Pick<Item, "link" | "title">): string {
  return `${item.link}\u0000${normalizeTitle(item.title).toLowerCase()}`;
}

export function dedupe(items: Item[]): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const item of items) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function newestFirst(items: Item[]): Item[] {
  return [...items].sort((a, b) =>
    b.published.getTime() - a.published.getTime()
  );
}
