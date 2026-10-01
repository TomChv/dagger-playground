import { assertEquals, assertThrows } from "@std/assert";
import { loadSettings } from "./settings.ts";

function withEnv(vars: Record<string, string>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    Deno.env.set(key, value);
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test("loadSettings reads the environment", () => {
  withEnv({ DRIFTFEED_TOKEN: "t-42", DRIFTFEED_MAX_ITEMS: "12" }, () => {
    assertEquals(loadSettings(Deno.env), { token: "t-42", maxItems: 12 });
  });
});

Deno.test("loadSettings falls back to anonymous", () => {
  withEnv({ DRIFTFEED_MAX_ITEMS: "7" }, () => {
    Deno.env.delete("DRIFTFEED_TOKEN");
    assertEquals(loadSettings(Deno.env).token, "anonymous");
  });
});

Deno.test("loadSettings rejects a non-positive window", () => {
  withEnv({ DRIFTFEED_MAX_ITEMS: "0" }, () => {
    assertThrows(() => loadSettings(Deno.env), RangeError);
  });
});
