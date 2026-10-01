const RATES = new Map([
  ["standard", 1],
  ["priority", 3],
]);

export function rateFor(tier) {
  const rate = RATES.get(tier);
  if (rate === undefined) {
    throw new Error(`unknown tier: ${tier}`);
  }
  return rate;
}
