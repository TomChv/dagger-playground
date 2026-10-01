export interface Route {
  method: string;
  pattern: string;
  handler: string;
}

export interface Match {
  route: Route;
  params: Record<string, string>;
}

export function matchRoute(
  routes: Route[],
  method: string,
  path: string,
): Match | undefined {
  const segments = split(path);
  for (const route of routes) {
    if (route.method !== method.toUpperCase()) continue;
    const params = matchPattern(split(route.pattern), segments);
    if (params) return { route, params };
  }
  return undefined;
}

function matchPattern(
  pattern: string[],
  segments: string[],
): Record<string, string> | undefined {
  if (pattern.length !== segments.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    if (p.startsWith(":")) params[p.slice(1)] = segments[i];
    else if (p !== segments[i]) return undefined;
  }
  return params;
}

function split(path: string): string[] {
  return path.split("/").filter((s) => s !== "");
}
