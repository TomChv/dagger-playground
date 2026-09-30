function payload(overrides = {}) {
  return {
    event: "invoice.paid",
    sentAt: 1_700_000_000,
    body: '{"id":42}',
    ...overrides,
  }
}

function headers(overrides = {}) {
  return {
    "content-type": "application/json",
    "x-relay-event": "invoice.paid",
    "x-relay-timestamp": "1700000000",
    ...overrides,
  }
}

module.exports = { payload, headers }
