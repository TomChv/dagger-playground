export interface FeedEntry {
  id: string;
  url: string;
  tags: string[];
}

export async function loadCatalog(path: string): Promise<FeedEntry[]> {
  const raw = await Deno.readTextFile(path);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new TypeError(`${path}: expected an array of feed entries`);
  }
  return parsed as FeedEntry[];
}

export function byTag(entries: FeedEntry[], tag: string): FeedEntry[] {
  return entries.filter((entry) => entry.tags.includes(tag));
}
