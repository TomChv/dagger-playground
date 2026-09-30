const { emit } = require("../emit")

// Work in progress on TypeScript output, parked under src/scratch and excluded
// by testPathIgnorePatterns. Static discovery cannot read that config, so it
// lists this file anyway; selecting it runs nothing and passes.
test("emits a typed client", () => {
  expect(emit("GET /health", { language: "ts" })).toContain("interface RelayClient")
})
