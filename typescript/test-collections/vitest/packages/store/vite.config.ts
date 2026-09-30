// No vitest.config here on purpose: Vitest falls back to vite.config.*, and so
// must the module's project discovery.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    testTimeout: 5000,
  },
})
