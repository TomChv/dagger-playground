const LINE = /^(GET|POST|PUT|DELETE)\s+(\/\S*)(?:\s+->\s+(\w+))?$/

// A spec is one route per line: "POST /hooks/:endpoint -> deliver".
function parse(spec) {
  const routes = []
  const errors = []

  spec.split("\n").forEach((raw, index) => {
    const line = raw.trim()

    if (line === "" || line.startsWith("#")) {
      return
    }

    const hit = LINE.exec(line)

    if (hit === null) {
      errors.push({ line: index + 1, text: line })
      return
    }

    const [, method, path, name] = hit

    routes.push({
      method,
      path,
      name: name ?? defaultName(method, path),
      params: [...path.matchAll(/:(\w+)/g)].map(([, param]) => param),
    })
  })

  return { routes, errors }
}

function defaultName(method, path) {
  const segments = path.split("/").filter((segment) => segment !== "" && !segment.startsWith(":"))

  return [method.toLowerCase(), ...segments].join("_")
}

module.exports = { parse, defaultName }
