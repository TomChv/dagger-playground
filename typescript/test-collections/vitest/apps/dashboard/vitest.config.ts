import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
    // checks/ holds accessibility checks written as plain .ts modules, which
    // the default include does not match.
    include: [...configDefaults.include, "checks/**/*.ts"],
    // e2e/ is a Vitest project of its own; src/quarantine holds specs that are
    // kept in the tree but not run.
    exclude: [...configDefaults.exclude, "e2e/**", "src/quarantine/**"],
  },
})
