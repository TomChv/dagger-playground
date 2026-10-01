import { defineConfig } from "eslint/config";

// A TypeScript flat config. ESLint loads it through jiti, which the workspace
// root above installs.
export default defineConfig([
  {
    rules: {
      "no-unused-vars": "error",
      "prefer-const": "error",
    },
  },
]);
