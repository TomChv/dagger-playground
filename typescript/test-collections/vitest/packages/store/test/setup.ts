import { afterEach, vi } from "vitest"

// Several suites install fake timers; restoring them here keeps a file that
// fails mid-test from leaking frozen time into the next one.
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
