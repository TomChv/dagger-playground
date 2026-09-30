const { match, allowedFor } = require("./router")

describe("match", () => {
  it("routes a delivery and captures the endpoint", () => {
    expect(match("POST", "/hooks/billing")).toEqual({
      name: "deliver",
      params: { endpoint: "billing" },
    })
  })

  it("routes a status read", () => {
    expect(match("GET", "/hooks/billing/status")).toEqual({
      name: "status",
      params: { endpoint: "billing" },
    })
  })

  it("routes the health probe with no params", () => {
    expect(match("GET", "/health")).toEqual({ name: "health", params: {} })
  })

  it("accepts a lower-case method", () => {
    expect(match("post", "/hooks/billing")?.name).toBe("deliver")
  })

  it("ignores trailing slashes", () => {
    expect(match("GET", "/health///")?.name).toBe("health")
  })

  it("does not route a known path under the wrong method", () => {
    expect(match("DELETE", "/hooks/billing")).toBeNull()
  })

  it("does not route an unknown path", () => {
    expect(match("GET", "/hooks")).toBeNull()
  })
})

describe("allowedFor", () => {
  it("lists the methods a path answers to", () => {
    expect(allowedFor("/hooks/billing")).toEqual(["POST"])
  })

  it("is empty for an unknown path", () => {
    expect(allowedFor("/nope")).toEqual([])
  })
})
