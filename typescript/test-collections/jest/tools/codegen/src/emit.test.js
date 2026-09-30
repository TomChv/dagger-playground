const { emit, emitRoute } = require("./emit")
const { parse } = require("./parse")

const routeOf = (line) => parse(line).routes[0]

describe("emitRoute", () => {
  it("interpolates the path parameters", () => {
    expect(emitRoute(routeOf("POST /hooks/:endpoint -> deliver"))).toContain(
      "`/hooks/${endpoint}`",
    )
  })

  it("takes the parameters before the body", () => {
    expect(emitRoute(routeOf("PUT /hooks/:endpoint/keys/:key"))).toContain(
      "put_hooks_keys(endpoint, key, body)",
    )
  })

  it("takes only a body when the path is static", () => {
    expect(emitRoute(routeOf("GET /health"))).toContain("get_health(body)")
  })
})

describe("emit", () => {
  it("names the client", () => {
    expect(emit("GET /health", { name: "Relay" })).toContain("const Relay = {")
  })

  it("defaults to RelayClient", () => {
    expect(emit("GET /health")).toContain("const RelayClient = {")
  })

  it("exports the client", () => {
    expect(emit("GET /health").trimEnd().endsWith("module.exports = RelayClient")).toBe(true)
  })

  it("emits one method per route", () => {
    const source = emit(["GET /health", "POST /hooks/:endpoint -> deliver"].join("\n"))

    expect(source.match(/^ {2}\w+\(/gm)).toHaveLength(2)
  })

  it("refuses a spec it cannot parse", () => {
    expect(() => emit(["GET /health", "PATCH /hooks"].join("\n"))).toThrow(SyntaxError)
    expect(() => emit(["GET /health", "PATCH /hooks"].join("\n"))).toThrow("spec line 2")
  })
})
