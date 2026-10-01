// No package.json at or above this directory, so npx fetches ESLint. Nothing
// is installed here, so this config cannot import from "eslint".
export default [
  {
    rules: {
      "no-unused-vars": "error",
      "prefer-const": "error",
    },
  },
];
