const ROUTES = [
  { method: "POST", pattern: /^\/hooks\/([^/]+)$/, name: "deliver", params: ["endpoint"] },
  { method: "GET", pattern: /^\/hooks\/([^/]+)\/status$/, name: "status", params: ["endpoint"] },
  { method: "GET", pattern: /^\/health$/, name: "health", params: [] },
]

function match(method, path) {
  const normalised = path.replace(/\/+$/, "") || "/"

  for (const route of ROUTES) {
    const hit = route.pattern.exec(normalised)

    if (hit && route.method === method.toUpperCase()) {
      const params = Object.fromEntries(route.params.map((name, index) => [name, hit[index + 1]]))

      return { name: route.name, params }
    }
  }

  return null
}

function allowedFor(path) {
  const normalised = path.replace(/\/+$/, "") || "/"

  return ROUTES.filter((route) => route.pattern.test(normalised)).map((route) => route.method)
}

module.exports = { ROUTES, match, allowedFor }
