// Recorded deliveries replayed by the load harness. The name matches Jest's
// default testMatch on purpose: the config's testPathIgnorePatterns is what
// keeps it out of the run, and it declares no test, so a run that picks it up
// fails with "Your test suite must contain at least one test".
module.exports = [
  { id: "d-1001", url: "https://hooks.example/1001", status: 200, attempts: 1 },
  { id: "d-1002", url: "https://hooks.example/1002", status: 503, attempts: 3 },
  { id: "d-1003", url: "https://hooks.example/1003", status: 410, attempts: 3 },
]
