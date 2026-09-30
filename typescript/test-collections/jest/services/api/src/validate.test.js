const { MAX_BODY_BYTES, validate } = require("./validate")
const { payload } = require("./support/factories")

const fieldsOf = (issues) => issues.map((issue) => issue.field)

describe("validate", () => {
  it("accepts a well-formed payload", () => {
    expect(validate(payload())).toEqual([])
  })

  it("requires an event name", () => {
    expect(validate(payload({ event: undefined }))).toEqual([
      { field: "event", reason: "required" },
    ])
  })

  it("rejects an event name that is not dotted", () => {
    expect(validate(payload({ event: "invoicepaid" }))[0]).toMatchObject({
      field: "event",
      reason: expect.stringContaining("dotted"),
    })
  })

  it("rejects an upper-case event name", () => {
    expect(fieldsOf(validate(payload({ event: "Invoice.Paid" })))).toEqual(["event"])
  })

  it("requires sentAt to be a whole number of seconds", () => {
    expect(fieldsOf(validate(payload({ sentAt: 1.5 })))).toEqual(["sentAt"])
    expect(fieldsOf(validate(payload({ sentAt: "1700000000" })))).toEqual(["sentAt"])
  })

  it("rejects a body over the size limit", () => {
    expect(fieldsOf(validate(payload({ body: "x".repeat(MAX_BODY_BYTES + 1) })))).toEqual(["body"])
  })

  it("accepts a body exactly at the limit", () => {
    expect(validate(payload({ body: "x".repeat(MAX_BODY_BYTES) }))).toEqual([])
  })

  it("accepts a missing body", () => {
    expect(validate(payload({ body: undefined }))).toEqual([])
  })

  it("reports every problem at once", () => {
    expect(fieldsOf(validate({ event: "", sentAt: null }))).toEqual(["event", "sentAt"])
  })
})
