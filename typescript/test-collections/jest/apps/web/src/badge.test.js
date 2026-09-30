const { levelOf, badge } = require("./badge")

describe("levelOf", () => {
  it("is healthy at four nines", () => {
    expect(levelOf(0.9999)).toBe("healthy")
  })

  it("is healthy exactly on the boundary", () => {
    expect(levelOf(0.99)).toBe("healthy")
  })

  it("is degraded below the healthy boundary", () => {
    expect(levelOf(0.98)).toBe("degraded")
  })

  it("is failing below the degraded boundary", () => {
    expect(levelOf(0.5)).toBe("failing")
  })

  it("is failing for an endpoint nothing reached", () => {
    expect(levelOf(0)).toBe("failing")
  })
})

describe("badge", () => {
  it("renders the level as a class and as text", () => {
    expect(badge("billing", 1)).toBe(
      '<span class="badge badge--healthy" title="billing">healthy</span>',
    )
  })

  it("names the endpoint it stands for", () => {
    expect(badge("crm", 0.2)).toContain('title="crm"')
  })
})
