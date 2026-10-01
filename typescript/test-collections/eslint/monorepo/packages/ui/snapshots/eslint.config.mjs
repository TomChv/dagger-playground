// Recorded fixtures keep the keys of the payloads they came from, so this
// directory enforces camelcase where the package does not. monorepo's global
// ignores cover **/snapshots/**, so it is not a project of its own.
export default [
  {
    rules: {
      camelcase: "error",
    },
  },
];
