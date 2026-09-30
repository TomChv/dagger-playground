import { expect } from "vitest"
import type { ConfigIssue, LinkForgeConfig } from "../src/config/schema"

// Every config test asserts through this matcher, so a run that does not load
// the setup file fails loudly instead of silently skipping the assertions.
expect.extend({
  toBeIssueFor(received: ConfigIssue[], field: keyof LinkForgeConfig) {
    const fields = received.map((issue) => issue.field)

    return {
      pass: fields.length === 1 && fields[0] === field,
      message: () => `expected exactly one issue for ${field}, got [${fields.join(", ")}]`,
    }
  },
})

declare module "vitest" {
  // The parameter default has to match Vitest's own `Matchers<T = any>`.
  // biome-ignore lint/suspicious/noExplicitAny: mirrors @vitest/expect
  interface Matchers<T = any> {
    toBeIssueFor(field: keyof LinkForgeConfig): T
  }
}
