const base = require("../../jest.base.config")

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: "queue",
  // src/fixtures holds recorded deliveries named like suites. They declare no
  // test, so Jest fails the run if this pattern ever stops being honoured.
  testPathIgnorePatterns: ["<rootDir>/src/fixtures/"],
}
