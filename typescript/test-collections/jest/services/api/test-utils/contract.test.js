const { match } = require("../src/router")

// Shared assertions the e2e specs reuse. The name matches Jest's default
// testMatch, but the config's `roots` stops at src/, so nothing here runs with
// the service's own suite.
function expectRoutes(method, path, name) {
  expect(match(method, path)?.name).toBe(name)
}

test("the delivery route is reachable", () => {
  expectRoutes("POST", "/hooks/billing", "deliver")
})

module.exports = { expectRoutes }
