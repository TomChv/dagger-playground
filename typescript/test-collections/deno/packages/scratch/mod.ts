// Not listed in the root `workspace` array, so this is not a workspace member —
// but it does hold a deno.json under a workspace root.
export function scratchPad(lines: string[]): string {
  return lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
}
