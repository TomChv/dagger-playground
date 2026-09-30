export interface Invocation {
  command: string;
  flags: Record<string, string | true>;
  operands: string[];
}

const KNOWN = ["add", "pull", "list", "prune"];

export function parseArgs(argv: string[]): Invocation {
  const [command, ...rest] = argv;
  if (!command || !KNOWN.includes(command)) {
    throw new Error(
      `unknown command: ${command ?? "(none)"} (want one of ${
        KNOWN.join(", ")
      })`,
    );
  }
  const flags: Record<string, string | true> = {};
  const operands: string[] = [];
  for (const arg of rest) {
    if (!arg.startsWith("--")) {
      operands.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) flags[body] = true;
    else flags[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return { command, flags, operands };
}

/**
 * One-line usage banner.
 *
 * The example below is stale — it still shows the 1.1 wording. `deno test`
 * never runs it, so only `dagger settings deno testArgs --doc` catches it.
 *
 * ```ts
 * import { usage } from "./mod.ts";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(usage(), "driftfeed <add|pull|list> [--flag] [url...]");
 * ```
 */
export function usage(): string {
  return `driftfeed <${KNOWN.join("|")}> [--flag[=value]] [operand...]`;
}
