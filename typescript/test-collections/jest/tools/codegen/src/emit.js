const { parse } = require("./parse")

function emitRoute(route) {
  const args = [...route.params, "body"].join(", ")
  const path = route.path.replace(/:(\w+)/g, "${$1}")

  return [
    `  ${route.name}(${args}) {`,
    `    return this.send("${route.method}", \`${path}\`, body)`,
    "  },",
  ].join("\n")
}

function emit(spec, { name = "RelayClient" } = {}) {
  const { routes, errors } = parse(spec)

  if (errors.length > 0) {
    throw new SyntaxError(`spec line ${errors[0].line}: ${errors[0].text}`)
  }

  return [`const ${name} = {`, ...routes.map(emitRoute), "}", "", `module.exports = ${name}`].join(
    "\n",
  )
}

module.exports = { emit, emitRoute }
