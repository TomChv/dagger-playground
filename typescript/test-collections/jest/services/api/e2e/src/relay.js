// A stub relay: it hands deliveries to an endpoint that answers with status
// codes from a script, so the specs can drive retries without a network.
function stubEndpoint(script) {
  const seen = []
  let call = 0

  return {
    seen,
    async receive(delivery) {
      seen.push(delivery.id)
      const status = script[Math.min(call++, script.length - 1)]

      if (status >= 500 || status === 429) {
        throw Object.assign(new Error(`endpoint answered ${status}`), { status, retryable: true })
      }
      if (status >= 400) {
        throw Object.assign(new Error(`endpoint answered ${status}`), { status, retryable: false })
      }

      return { status }
    },
  }
}

async function relay(endpoint, delivery, { attempts = 3 } = {}) {
  const tried = []

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { status } = await endpoint.receive(delivery)

      return { ok: true, status, attempts: attempt, tried }
    } catch (error) {
      tried.push(error.status)

      if (!error.retryable) {
        return { ok: false, status: error.status, attempts: attempt, tried }
      }
    }
  }

  return { ok: false, status: tried[tried.length - 1], attempts, tried }
}

module.exports = { stubEndpoint, relay }
