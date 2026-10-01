const ROUTES = Object.freeze({
  dashboard: "/",
  invoice: "/invoices/:id",
});

export function routeFor(name) {
  return ROUTES[name] ?? ROUTES.dashboard;
}
