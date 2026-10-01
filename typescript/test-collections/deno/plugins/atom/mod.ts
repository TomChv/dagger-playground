const ATOM_NS = "http://www.w3.org/2005/Atom";

export function sniff(xml: string): boolean {
  return xml.includes(ATOM_NS);
}

export function entryIds(xml: string): string[] {
  return [...xml.matchAll(/<entry>[\s\S]*?<id>([\s\S]*?)<\/id>/g)]
    .map(([, id]) => id.trim());
}
