export default {
  testEnvironment: "node",
  // The module has its own generated core client, so two packages in this tree
  // are named @dagger.io/dagger and jest's haste map refuses to pick one.
  modulePathIgnorePatterns: ["<rootDir>/.dagger/"],
  extensionsToTreatAsEsm: [".ts"],
  // The clients import siblings as "./client.gen.js" (the NodeNext convention)
  // while shipping them as .ts; jest's resolver does not do that mapping.
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  transform: {
    "^.+\\.[tj]s$": ["@swc/jest", { jsc: { target: "es2022" } }],
  },
  // The generated clients ship TypeScript sources and an ESM core.js, and are
  // linked into node_modules by `file:`, so they have to go through the
  // transform too.
  transformIgnorePatterns: ["/node_modules/(?!@dagger\\.io/)"],
  testTimeout: 300_000,
}
