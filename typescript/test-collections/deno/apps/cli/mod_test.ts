import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { parseArgs, usage } from "./mod.ts";

Deno.test("parseArgs reads a bare command", () => {
  assertEquals(parseArgs(["list"]), {
    command: "list",
    flags: {},
    operands: [],
  });
});

Deno.test("parseArgs splits --key=value", () => {
  const got = parseArgs(["add", "--tag=tech", "https://lobste.rs/rss"]);
  assertEquals(got.flags, { tag: "tech" });
  assertEquals(got.operands, ["https://lobste.rs/rss"]);
});

Deno.test("parseArgs treats a bare --flag as true", () => {
  assertEquals(parseArgs(["prune", "--dry-run"]).flags, { "dry-run": true });
});

Deno.test("parseArgs keeps an empty value", () => {
  assertEquals(parseArgs(["add", "--tag="]).flags, { tag: "" });
});

Deno.test("parseArgs rejects an unknown command", () => {
  assertThrows(() => parseArgs(["frobnicate"]), Error, "unknown command");
  assertThrows(() => parseArgs([]), Error, "(none)");
});

Deno.test("usage lists every command", () => {
  assertStringIncludes(usage(), "add|pull|list|prune");
});
