const { sign, verify } = require("./hmac")

const request = {
  method: "POST",
  path: "/hooks/42",
  headers: {
    "content-type": "application/json",
    "x-relay-event": "invoice.paid",
    "x-relay-timestamp": "1700000000",
  },
  body: '{"id":42}',
}

describe("sign", () => {
  it("is stable for the same request", () => {
    expect(sign("s3cret", request)).toBe(sign("s3cret", request))
  })

  it("changes with the secret", () => {
    expect(sign("s3cret", request)).not.toBe(sign("other", request))
  })

  it("changes with a signed header", () => {
    const moved = { ...request, headers: { ...request.headers, "x-relay-timestamp": "1700000001" } }

    expect(sign("s3cret", moved)).not.toBe(sign("s3cret", request))
  })

  it("ignores an unsigned header", () => {
    const tagged = { ...request, headers: { ...request.headers, "x-trace-id": "abc" } }

    expect(sign("s3cret", tagged)).toBe(sign("s3cret", request))
  })

  it("is a hex sha256 digest", () => {
    expect(sign("s3cret", request)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("verify", () => {
  it("accepts a signature it produced", () => {
    expect(verify("s3cret", request, sign("s3cret", request))).toBe(true)
  })

  it("rejects a signature made with another secret", () => {
    expect(verify("s3cret", request, sign("other", request))).toBe(false)
  })

  it("rejects a signature of the wrong length instead of throwing", () => {
    expect(verify("s3cret", request, "deadbeef")).toBe(false)
  })
})
