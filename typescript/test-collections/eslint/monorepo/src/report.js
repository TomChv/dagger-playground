import { rateFor } from "./ledger.js";

export function summarise(entries) {
  return entries.reduce((total, entry) => total + entry.units * rateFor(entry.tier), 0);
}
