import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // src/blank.test.ts is an empty placeholder; Vitest fails a file that
    // declares no test, so keep it out of the run.
    exclude: [...configDefaults.exclude, "src/blank.test.ts"],
  },
})
