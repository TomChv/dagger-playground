const base = require("../../jest.base.config")

// A named variant: Jest never loads it on its own, only through --config or a
// `projects` entry, so this directory is not a Jest project.
/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: "report",
  testMatch: ["<rootDir>/src/**/*.test.js"],
}
