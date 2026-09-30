// Reads the fixture at the workspace root, four levels above this project.
// Under Dagger only the project directory is mounted, so this file needs
// `includeExtraFiles = ["fixtures/**"]` in the module's settings.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { redirectFor, type FixtureLink } from "../src/redirect"

const fixture = JSON.parse(
  readFileSync(new URL("../../../../fixtures/links.json", import.meta.url), "utf8"),
) as { links: FixtureLink[] }

function bySlug(slug: string): FixtureLink | undefined {
  return fixture.links.find((link) => link.slug === slug)
}

describe("the shared fixture", () => {
  it("holds three links", () => {
    expect(fixture.links.map((link) => link.slug)).toEqual(["abcd", "efgh", "ijkl"])
  })

  it("redirects every live link to its target", () => {
    for (const link of fixture.links.filter((candidate) => !candidate.expired)) {
      expect(redirectFor(link)).toEqual({ status: 301, location: link.target })
    }
  })

  it("answers 410 for the expired link", () => {
    expect(redirectFor(bySlug("ijkl"))).toEqual({ status: 410 })
  })

  it("404s a slug the fixture does not hold", () => {
    expect(redirectFor(bySlug("zzzz"))).toEqual({ status: 404 })
  })
})
