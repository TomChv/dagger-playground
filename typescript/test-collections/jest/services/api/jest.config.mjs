/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  // e2e/ is a Jest project of its own and test-utils/ holds shared assertions,
  // so neither belongs to the tree Jest walks here.
  roots: ["<rootDir>/src"],
}
