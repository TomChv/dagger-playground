// The pre-2.0 badge API, kept for reference and excluded by
// testPathIgnorePatterns. It cannot run: ./legacy-badge was deleted with 2.0,
// so a run that stops honouring the pattern fails on the require.
const { legacyBadge } = require("./legacy-badge")

test("renders the old three-state badge", () => {
  expect(legacyBadge(0.99)).toBe("green")
})
