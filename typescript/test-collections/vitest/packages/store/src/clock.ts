export type Clock = {
  now(): number
}

export const systemClock: Clock = {
  now: () => Date.now(),
}

export function fixedClock(at: number): Clock {
  return { now: () => at }
}
