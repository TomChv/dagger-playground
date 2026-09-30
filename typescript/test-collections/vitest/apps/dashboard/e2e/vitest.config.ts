import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // A project nested inside apps/dashboard: its own config makes it a project
    // of its own, and the parent config excludes this directory.
    testTimeout: 20_000,
  },
})
