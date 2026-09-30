// How long delivery records are kept is deployment config, not a constant.
const RETENTION_DAYS = Number(process.env.RELAY_RETENTION_DAYS ?? 30)

// Deliveries are bucketed by the UTC day, so a relay and its replicas agree on
// which digest a delivery belongs to whatever their host clocks are set to.
function dayBucket(epochMillis) {
  return new Date(epochMillis).toISOString().slice(0, 10)
}

function expiresAt(epochMillis, days = RETENTION_DAYS) {
  return epochMillis + days * 24 * 60 * 60 * 1000
}

function isExpired(epochMillis, now, days = RETENTION_DAYS) {
  return expiresAt(epochMillis, days) <= now
}

module.exports = { RETENTION_DAYS, dayBucket, expiresAt, isExpired }
