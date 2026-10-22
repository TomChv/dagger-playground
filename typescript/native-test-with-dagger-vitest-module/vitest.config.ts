import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Every test opens an engine session and pulls images; the 5s default
    // expires long before the first container runs.
    testTimeout: 300_000,
  },
})
