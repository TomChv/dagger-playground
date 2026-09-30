const { readFileSync } = require("node:fs")
const { join } = require("node:path")

// The root config delegates everything to `projects`, so Jest never runs this
// file even though it matches the default testMatch.
test("the workspace globs the packages directory", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"))

  expect(manifest.workspaces).toEqual(["packages/*"])
})
