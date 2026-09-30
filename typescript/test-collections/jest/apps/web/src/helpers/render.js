function attributes(pairs) {
  return Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) => (value === true ? name : `${name}="${value}"`))
    .join(" ")
}

function tag(name, pairs, children = "") {
  const attrs = attributes(pairs)

  return `<${name}${attrs === "" ? "" : ` ${attrs}`}>${children}</${name}>`
}

module.exports = { attributes, tag }
