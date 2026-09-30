const { parse, defaultName } = require("./parse")

describe("parse", () => {
  it("reads a route with an explicit name", () => {
    expect(parse("POST /hooks/:endpoint -> deliver").routes).toEqual([
      { method: "POST", path: "/hooks/:endpoint", name: "deliver", params: ["endpoint"] },
    ])
  })

  it("derives a name when the spec leaves it out", () => {
    expect(parse("GET /hooks/:endpoint/status").routes[0].name).toBe("get_hooks_status")
  })

  it("skips blank lines and comments", () => {
    const spec = ["# relay surface", "", "GET /health", "  ", "# end"].join("\n")

    expect(parse(spec).routes).toHaveLength(1)
    expect(parse(spec).errors).toEqual([])
  })

  it("reports an unparsable line with its number", () => {
    const spec = ["GET /health", "PATCH /hooks"].join("\n")

    expect(parse(spec).errors).toEqual([{ line: 2, text: "PATCH /hooks" }])
  })

  it("keeps the routes it could read alongside the errors", () => {
    expect(parse(["GET /health", "nonsense"].join("\n")).routes).toHaveLength(1)
  })

  it("collects every path parameter", () => {
    expect(parse("PUT /hooks/:endpoint/keys/:key").routes[0].params).toEqual(["endpoint", "key"])
  })
})

describe("defaultName", () => {
  it("joins the static segments", () => {
    expect(defaultName("GET", "/hooks/:endpoint/status")).toBe("get_hooks_status")
  })

  it("is just the method for the root path", () => {
    expect(defaultName("GET", "/")).toBe("get")
  })
})
