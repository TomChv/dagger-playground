import { defineConfig } from "eslint/config";

// There is no node_modules under Plug'n'Play, so "eslint/config" only resolves
// when ESLint runs through Yarn.
export default defineConfig([
  {
    rules: {
      "no-unused-vars": "error",
      "prefer-const": "error",
    },
  },
]);
