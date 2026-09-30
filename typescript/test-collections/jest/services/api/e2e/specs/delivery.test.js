const { stubEndpoint, relay } = require("../src/relay")

const delivery = { id: "d-1", body: '{"id":42}' }

describe("delivering to a healthy endpoint", () => {
  it("succeeds on the first attempt", async () => {
    const endpoint = stubEndpoint([200])

    await expect(relay(endpoint, delivery)).resolves.toMatchObject({
      ok: true,
      status: 200,
      attempts: 1,
    })
  })

  it("sends the delivery exactly once", async () => {
    const endpoint = stubEndpoint([202])

    await relay(endpoint, delivery)

    expect(endpoint.seen).toEqual(["d-1"])
  })

  it("does not retry a rejection the endpoint will not change its mind about", async () => {
    const endpoint = stubEndpoint([400])

    await expect(relay(endpoint, delivery)).resolves.toMatchObject({ ok: false, attempts: 1 })
    expect(endpoint.seen).toHaveLength(1)
  })
})
