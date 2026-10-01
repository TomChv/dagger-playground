export function badge(label, count) {
  const shown = count > 99 ? "99+" : String(count);
  return `${label} (${shown})`;
}
