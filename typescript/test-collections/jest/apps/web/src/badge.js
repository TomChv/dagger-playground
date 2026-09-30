const { tag } = require("./helpers/render")

const LEVELS = [
  { name: "healthy", min: 0.99 },
  { name: "degraded", min: 0.9 },
  { name: "failing", min: 0 },
]

function levelOf(successRate) {
  return LEVELS.find((level) => successRate >= level.min)?.name ?? "failing"
}

function badge(endpoint, successRate) {
  const level = levelOf(successRate)

  return tag("span", { class: `badge badge--${level}`, title: endpoint }, level)
}

module.exports = { LEVELS, levelOf, badge }
