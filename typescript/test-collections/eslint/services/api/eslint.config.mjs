import { defineConfig } from "eslint/config";

// "eslint/config" resolves from services/node_modules, one directory above
// this project's own package.json.
export default defineConfig([
  {
    rules: {
      "no-unused-vars": "error",
      "prefer-const": "error",
    },
  },
]);
