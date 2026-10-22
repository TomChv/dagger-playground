# Deno suite run by the Dagger deno module

`typescript/native-tests` with the suite rewritten for `Deno.test`, so `dagger check`
runs it inside the module's container instead of on the host. Installed:
`dagger.io/js/deno`.

```console
deno test -A                         # host: 1 test, 4 steps, all ok
dagger check --deno --check test     # in the module's container: 2 steps pass, 2 fail
dagger check --deno                  # also lint, type-check, format-check
```

The suite is one `Deno.test` with four `t.step`s inside a single `connection()`: on
Deno a second `connection()` in the same process dies with
`ERR_STREAM_PREMATURE_CLOSE` while spawning `dagger session`, which aborts the whole
file. In the module's container that never happens — a nested exec inherits the
session. The step order matters too; see [`report.md`](../../report.md) §19.

No `package.json` and no `node_modules`: `deno.json` `imports` maps the two generated
client packages to their source files, and the un-prefixed node builtins inside
`core.js` (`fs`, `path`, …) to `node:` equivalents. `dagger generate` also writes an
`unstable` array into `deno.json` by itself, and `exclude` keeps `deno fmt` off the
generated clients — without it `dagger generate` aborts on a changeset conflict
between the deno formatter and the TypeScript SDK. See
[`report.md`](../../report.md) §14 and §15.

The two test failures are the shared client bug, §1.
