const { parse } = require("../src/parse")

// A real suite that only the config's own testMatch reaches: the name matches
// no default pattern, so static discovery never lists it, yet a whole-project
// run executes it.
const SPEC = [
  "POST /hooks/:endpoint -> deliver",
  "GET /hooks/:endpoint/status -> status",
  "GET /health",
].join("\n")

test("every generated method name is a valid identifier", () => {
  for (const route of parse(SPEC).routes) {
    expect(route.name).toMatch(/^[a-z][a-z0-9_]*$/)
  }
})

test("no two routes generate the same method name", () => {
  const names = parse(SPEC).routes.map((route) => route.name)

  expect(new Set(names).size).toBe(names.length)
})
