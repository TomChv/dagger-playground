# Vitest suite run by the Dagger vitest module

`typescript/native-tests` with the suite rewritten for Vitest, so `dagger check` runs
it inside the module's container instead of on the host.

This is the one variant where the testcontainers pattern **works end to end**: the
module tracks the latest `github.com/dagger/vitest` tag, v0.3.0, which carries
[dagger/vitest#26](https://github.com/dagger/vitest/pull/26) and so gives the test's
Dagger client a workspace and its own session.

```console
npm test                    # host: 4 pass
dagger check --vitest       # in the module's container: 4 pass
dagger check -l --all       # one check per test file
```

On v0.2.0 the same suite is 2 pass / 2 fail: the generated module client cannot
serve its module, because the runner mounts no `.git` (so the nested session has no
workspace) and the test joins the session running Vitest (so module addresses
resolve against the vitest module). The fix is three lines in the module — `.git`
mounted at `/src`, `daggerInDaggerNewSession: true`, and
`_EXPERIMENTAL_DAGGER_CLI_BIN=/dev/.dagger/dagger`. Measurements and the standalone
proof are in [`report.md`](../../report.md) §1 and §20.

To pin a specific version, set `source = "github.com/dagger/vitest@<tag>"` in
`dagger.toml` and run `dagger lock update`.

Host runs need a 1.0 CLI on `PATH`:
`_EXPERIMENTAL_DAGGER_CLI_BIN=~/Library/Caches/dagger/dagger-1.0.0-beta.18 npm test`.
