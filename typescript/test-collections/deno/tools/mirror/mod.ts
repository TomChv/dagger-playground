export interface Mirror {
  upstream: string;
  local: string;
}

export function mirrorFor(url: string, root = "/srv/mirror"): Mirror {
  const parsed = new URL(url);
  const path = parsed.pathname === "/" ? "/index" : parsed.pathname;
  return {
    upstream: url,
    local: `${root}/${parsed.hostname}${path}`.replaceAll("//", "/"),
  };
}

export function stale(fetchedAt: Date, now: Date, maxAgeMs: number): boolean {
  return now.getTime() - fetchedAt.getTime() >= maxAgeMs;
}
