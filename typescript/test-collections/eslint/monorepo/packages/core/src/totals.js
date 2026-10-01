// prefer-const: ESLint can fix this one.
let carried = 0;
// no-unused-vars: ESLint cannot, so lint keeps reporting it after a fix.
const pending = "awaiting settlement";

export function settle(entries) {
  return entries.length + carried;
}
