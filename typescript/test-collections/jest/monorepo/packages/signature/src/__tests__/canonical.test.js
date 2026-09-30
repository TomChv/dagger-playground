const { SIGNED_HEADERS, canonicalString } = require("../canonical")

const request = {
  method: "post",
  path: "/hooks/42",
  headers: {
    "content-type": "application/json",
    "x-relay-event": "  invoice.paid  ",
    "x-relay-timestamp": "1700000000",
    "x-request-id": "ignored",
  },
  body: '{"id":42}',
}

describe("canonicalString", () => {
  it("upper-cases the method and keeps the path verbatim", () => {
    expect(canonicalString(request).split("\n").slice(0, 2)).toEqual(["POST", "/hooks/42"])
  })

  it("signs the listed headers in a fixed order", () => {
    const lines = canonicalString(request).split("\n").slice(2, 5)

    expect(lines).toEqual([
      "content-type:application/json",
      "x-relay-event:invoice.paid",
      "x-relay-timestamp:1700000000",
    ])
  })

  it("leaves unlisted headers out", () => {
    expect(canonicalString(request)).not.toContain("x-request-id")
  })

  it("keeps a missing header as an empty line, so lines cannot shift", () => {
    const { "x-relay-event": _, ...headers } = request.headers

    expect(canonicalString({ ...request, headers })).toContain("\nx-relay-event:\n")
    expect(canonicalString({ ...request, headers }).split("\n")).toHaveLength(
      SIGNED_HEADERS.length + 3,
    )
  })

  it("treats a missing body as empty", () => {
    expect(canonicalString({ ...request, body: undefined }).endsWith("\n")).toBe(true)
  })
})
