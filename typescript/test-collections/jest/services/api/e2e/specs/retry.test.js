const { stubEndpoint, relay } = require("../src/relay")

const delivery = { id: "d-2", body: '{"id":7}' }

describe("retrying a flaky endpoint", () => {
  it("gives up after the attempt budget", async () => {
    const endpoint = stubEndpoint([503])

    await expect(relay(endpoint, delivery, { attempts: 3 })).resolves.toMatchObject({
      ok: false,
      attempts: 3,
      tried: [503, 503, 503],
    })
  })

  it("succeeds once the endpoint recovers", async () => {
    const endpoint = stubEndpoint([503, 200])

    await expect(relay(endpoint, delivery)).resolves.toMatchObject({ ok: true, attempts: 2 })
    expect(endpoint.seen).toEqual(["d-2", "d-2"])
  })

  it("treats a rate limit as retryable", async () => {
    const endpoint = stubEndpoint([429, 429, 204])

    await expect(relay(endpoint, delivery)).resolves.toMatchObject({
      ok: true,
      status: 204,
      tried: [429, 429],
    })
  })

  it("stops at a permanent failure it meets mid-retry", async () => {
    const endpoint = stubEndpoint([503, 410])

    await expect(relay(endpoint, delivery)).resolves.toMatchObject({
      ok: false,
      status: 410,
      attempts: 2,
    })
  })
})
