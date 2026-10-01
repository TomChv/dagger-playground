import { assert, assertEquals } from "@std/assert";
import { matchRoute, type Route } from "./routes.ts";

const routes: Route[] = [
  { method: "GET", pattern: "/feeds", handler: "listFeeds" },
  { method: "GET", pattern: "/feeds/:id", handler: "getFeed" },
  { method: "GET", pattern: "/feeds/:id/items", handler: "listItems" },
  { method: "POST", pattern: "/feeds", handler: "createFeed" },
];

Deno.test("matchRoute picks the literal route", () => {
  const match = matchRoute(routes, "GET", "/feeds");
  assertEquals(match?.route.handler, "listFeeds");
  assertEquals(match?.params, {});
});

Deno.test("matchRoute captures parameters", () => {
  const match = matchRoute(routes, "GET", "/feeds/lobsters");
  assertEquals(match?.route.handler, "getFeed");
  assertEquals(match?.params, { id: "lobsters" });
});

Deno.test("matchRoute prefers the earlier of two candidates", () => {
  const match = matchRoute(routes, "GET", "/feeds/lobsters/items");
  assertEquals(match?.route.handler, "listItems");
});

Deno.test("matchRoute is method-sensitive", () => {
  assertEquals(
    matchRoute(routes, "POST", "/feeds")?.route.handler,
    "createFeed",
  );
  assert(matchRoute(routes, "DELETE", "/feeds") === undefined);
});

Deno.test("matchRoute ignores trailing slashes", () => {
  assertEquals(
    matchRoute(routes, "GET", "/feeds/")?.route.handler,
    "listFeeds",
  );
});
