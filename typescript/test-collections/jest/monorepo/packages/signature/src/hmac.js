const { createHmac, timingSafeEqual } = require("node:crypto")
const { canonicalString } = require("./canonical")

function sign(secret, request) {
  return createHmac("sha256", secret).update(canonicalString(request)).digest("hex")
}

function verify(secret, request, signature) {
  const expected = Buffer.from(sign(secret, request), "utf8")
  const given = Buffer.from(String(signature), "utf8")

  return expected.length === given.length && timingSafeEqual(expected, given)
}

module.exports = { sign, verify }
