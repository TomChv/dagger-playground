import { assertEquals } from "@std/assert";
import { spoolSize } from "./mod.ts";

// This project declares no `permissions` in deno.json, so `deno test -P` grants
// nothing and this read raises NotCapable. It is the fixture's only check that
// the `permissions` setting alone can turn green.
Deno.test("spoolSize counts the pending entries", async () => {
  const raw = await Deno.readTextFile("./fixtures/spool.json");
  assertEquals(spoolSize(JSON.parse(raw)), 2);
});
