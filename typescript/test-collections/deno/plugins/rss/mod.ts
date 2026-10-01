export function sniff(xml: string): boolean {
  return /<rss[\s>]/.test(xml);
}

export function guessVersion(xml: string): string {
  const match = xml.match(/<rss[^>]*version="([^"]+)"/);
  return match ? match[1] : "unknown";
}
