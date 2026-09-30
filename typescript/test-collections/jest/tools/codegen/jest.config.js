const { withDefaults } = require("./config/defaults")

// The export is a call, so nothing here can be read without running Node:
// static discovery falls back to Jest's defaults for this directory.
module.exports = withDefaults({
  testPathIgnorePatterns: ["/node_modules/", "/src/scratch/"],
})
