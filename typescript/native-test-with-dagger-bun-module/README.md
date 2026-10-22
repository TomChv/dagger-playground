# Bun suite run by the Dagger bun module

`typescript/native-tests` with the suite rewritten for `bun:test`, so `dagger check`
runs it inside the module's container instead of on the host. Installed:
`github.com/dagger/bun@main` (not in `dagger module search`).

```console
bun test                              # host: 4 pass in 9.2s
dagger check --check test-all          # in the module's container: PASSES WITHOUT RUNNING ANYTHING
```

**This variant never exercised the pattern.** Two module-side problems, in order:

1. `bun install` in the container could not resolve the clients' nested
   `file:../dagger` dependency. Worked around with `"workspaces": ["clients/*"]` in
   `package.json`, which client gen does not write.
2. With that fixed, the module runs `bun test` four times and each prints
   `No tests found!` — and `dagger check` reports a pass. The host finds
   `test/fixtures.test.ts` with bun's default pattern, so the sources are not where
   the module runs.

See [`report.md`](../../report.md) §12 and §13. A green check that ran zero tests is
the most dangerous finding in this set.
