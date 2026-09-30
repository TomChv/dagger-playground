const { match } = require("../router")
const { validate } = require("../validate")
const { headers, payload } = require("../support/factories")

// __tests__ is the other half of Jest's default testMatch; this file is here so
// discovery has to find both shapes.
describe("relay headers", () => {
  it("carries the event the payload declares", () => {
    const sent = payload()

    expect(headers()["x-relay-event"]).toBe(sent.event)
    expect(validate(sent)).toEqual([])
  })

  it("carries the timestamp as seconds, as sentAt does", () => {
    expect(Number(headers()["x-relay-timestamp"])).toBe(payload().sentAt)
  })

  it("is sent to a route that accepts deliveries", () => {
    expect(match("POST", "/hooks/billing")?.name).toBe("deliver")
  })

  it("can be overridden per delivery", () => {
    expect(headers({ "content-type": "application/cloudevents+json" })["content-type"]).toBe(
      "application/cloudevents+json",
    )
  })
})
