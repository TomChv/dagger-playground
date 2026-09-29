import { afterEach } from "vitest"

// The render helpers mount into document.body, so a leftover tree would leak
// into the next test's queries.
afterEach(() => {
  document.body.innerHTML = ""
})
