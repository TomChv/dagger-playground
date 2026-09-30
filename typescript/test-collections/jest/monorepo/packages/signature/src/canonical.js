const SIGNED_HEADERS = ["content-type", "x-relay-event", "x-relay-timestamp"]

function canonicalString(request) {
  const headers = SIGNED_HEADERS.map((name) => {
    const value = request.headers[name]

    return value === undefined ? `${name}:` : `${name}:${String(value).trim()}`
  })

  return [request.method.toUpperCase(), request.path, ...headers, request.body ?? ""].join("\n")
}

module.exports = { SIGNED_HEADERS, canonicalString }
