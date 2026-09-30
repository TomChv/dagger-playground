/** @type {(config: import('jest').Config) => import('jest').Config} */
function withDefaults(config) {
  return {
    testEnvironment: "node",
    // checks/ holds spec checks written as plain modules, which the default
    // testMatch does not pick up.
    testMatch: ["**/?(*.)+(spec|test).js", "**/checks/*.js"],
    ...config,
  }
}

module.exports = { withDefaults }
