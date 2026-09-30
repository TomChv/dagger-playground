const MAX_BODY_BYTES = 64 * 1024

function validate(payload) {
  const issues = []

  if (typeof payload.event !== "string" || payload.event === "") {
    issues.push({ field: "event", reason: "required" })
  } else if (!/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(payload.event)) {
    issues.push({ field: "event", reason: "expected a dotted lower-case name" })
  }

  if (!Number.isInteger(payload.sentAt)) {
    issues.push({ field: "sentAt", reason: "expected an epoch in seconds" })
  }

  if (Buffer.byteLength(payload.body ?? "", "utf8") > MAX_BODY_BYTES) {
    issues.push({ field: "body", reason: `at most ${MAX_BODY_BYTES} bytes` })
  }

  return issues
}

module.exports = { MAX_BODY_BYTES, validate }
