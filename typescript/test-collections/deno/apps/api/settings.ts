export interface Settings {
  token: string;
  maxItems: number;
}

export function loadSettings(env: Deno.Env): Settings {
  const token = env.get("DRIFTFEED_TOKEN") ?? "anonymous";
  const raw = env.get("DRIFTFEED_MAX_ITEMS") ?? "50";
  const maxItems = Number.parseInt(raw, 10);
  if (!Number.isFinite(maxItems) || maxItems <= 0) {
    throw new RangeError(
      `DRIFTFEED_MAX_ITEMS must be a positive integer, got: ${raw}`,
    );
  }
  return { token, maxItems };
}
