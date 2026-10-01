import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // The scaffolding templates and the recorded snapshots carry ESLint configs
  // of their own, but they are not part of this project.
  globalIgnores(["templates/*", "!templates/keep", "**/snapshots/**"]),
  {
    rules: {
      "no-unused-vars": "error",
      "prefer-const": "error",
      eqeqeq: "error",
    },
  },
]);
