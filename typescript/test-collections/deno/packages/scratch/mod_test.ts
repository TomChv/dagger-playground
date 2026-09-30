import { assertEquals } from "@std/assert";
import { scratchPad } from "./mod.ts";

Deno.test("scratchPad numbers the lines", () => {
  assertEquals(scratchPad(["a", "b"]), "1. a\n2. b");
});

Deno.test("scratchPad handles an empty pad", () => {
  assertEquals(scratchPad([]), "");
});
