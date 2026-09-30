import { loadSettings } from "./settings.ts";
import { matchRoute, type Route } from "./routes.ts";

export const routes: Route[] = [
  { method: "GET", pattern: "/feeds", handler: "listFeeds" },
  { method: "GET", pattern: "/feeds/:id", handler: "getFeed" },
];

if (import.meta.main) {
  const settings = loadSettings(Deno.env);
  const probe = matchRoute(routes, "GET", "/feeds/lobsters");
  console.log(
    `driftfeed-api as ${settings.token}, max ${settings.maxItems} items, ` +
      `probe -> ${probe?.route.handler ?? "none"}`,
  );
}
