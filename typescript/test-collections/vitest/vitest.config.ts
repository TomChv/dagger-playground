import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    // Every app and package below is a Vitest project of its own; a plain
    // `vitest` here would otherwise pick their files up too.
    exclude: [...configDefaults.exclude, "apps/**", "packages/**"],
  },
})
