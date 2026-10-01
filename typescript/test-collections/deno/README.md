# driftfeed — a Deno collection fixture

A feed-aggregation toolkit in TypeScript, built for [Deno](https://deno.com). It exists to
exercise the Deno module's collection support ([dagger/deno#8](https://github.com/dagger/deno/pull/8))
on engine `v1.0.0-beta.15`: five standalone projects, two Deno workspaces, and two deliberately
broken checks.

The *layout* is the test. Unlike the mocha/vitest/jest fixtures there is no test-file dimension —
Deno keys whole **projects** and whole **workspaces** — so the layout has to carry everything:
which directory is a project, which is a workspace, which is a member, and what happens when you
stand in each of them.

The fixture root itself holds no `deno.json`, so it exercises the "a directory that belongs to no
project" rule that a repository-rooted workspace cannot reach.

## What is here

| Path | Marker | Kind | What it covers |
| --- | --- | --- | --- |
| `apps/api` | `deno.json` | standalone project | `permissions.default` in the config, so `-P` grants what the tests need; `exclude` hiding a type error; a `compile` entrypoint |
| `apps/cli` | `deno.json` **and** `deno.jsonc` | standalone project | both markers in one directory; a stale JSDoc example that only `--doc` runs |
| `apps/worker` | `deno.json` | standalone project | **no** permission sets, and a test that needs `read` — the one check the `permissions` setting alone turns green |
| `packages` | `deno.json` | **Deno workspace** | `workspace: [core, feed, store]`; a member reading a workspace-root-relative fixture; a non-member config (`scratch`) under the root |
| `plugins` | `deno.jsonc` | **Deno workspace** | a jsonc workspace root with comments, so a strict `JSON.decode` of the config fails and the module's fallback runs |
| `tools/janitor` | `deno.json` | standalone project | the deliberately broken one: fails `lint`, `test`, `type-check` and `format-check` |
| `tools/mirror` | `deno.jsonc` | standalone project | a comment that merely mentions the word `"workspace"` |
| `docs` | — | not a project | somewhere to stand that owns nothing |

## The grid

`Deno.projects` and `Deno.workspaces` are sibling collections, keyed by root. Keys are
**workspace-root-relative**, and the workspace root is the git repository root, not this directory —
so they all carry the `typescript/test-collections/deno/` prefix even though `dagger.toml` was
written here with `--here`.

| Collection | Dimension flag | Expected keys |
| --- | --- | --- |
| `DenoProjects` | `--deno-project=PATH` | `apps/api`, `apps/cli`, `apps/worker`, `tools/janitor`, `tools/mirror` |
| `DenoWorkspaces` | `--deno-workspace=PATH` | `packages`, `plugins` |

Observed on `5b413e3`, `tools/mirror` lands in the wrong collection — see
[Two things the module gets wrong](#two-things-the-module-gets-wrong).

Each collection carries `lint`, `test`, `type-check` and `format-check` batch checks plus a
`format` generator (whose staleness check lists as `format/stale`). `dagger check` therefore runs
**10 batch checks**, not one per key: each batch runs its selected items in parallel and fails
listing every item that failed.

### What must not be a key

| Path | Why it must be absent |
| --- | --- |
| `packages/core`, `packages/feed`, `packages/store` | workspace members; the workspace's own checks already cover them |
| `packages/scratch` | holds a `deno.json` but is not in the `workspace` array — still excluded from `projects`, because it sits under a workspace root |
| `plugins/rss`, `plugins/atom` | members of the `plugins` workspace |
| `apps/api/vendor` | no config of its own, and `exclude`d from the project |
| `docs`, `packages/fixtures`, `apps/*/fixtures` | directories holding no `deno.json` |

## Expected results

`dagger check` at the fixture root, with no settings: **5 failed, 5 passed**.

| Batch | Result | Failing items |
| --- | --- | --- |
| `deno/projects/lint` | ✘ | `tools/janitor` |
| `deno/projects/test` | ✘ | `apps/worker`, `tools/janitor` |
| `deno/projects/type-check` | ✘ | `tools/janitor` |
| `deno/projects/format-check` | ✘ | `tools/janitor` |
| `deno/projects/format/stale` | ✘ | `tools/janitor` |
| `deno/workspaces/*` (all five) | ✔ | — |

Per item, as `deno` itself reports it:

| Item | `lint` | `test` | `type-check` | `format-check` |
| --- | --- | --- | --- | --- |
| `apps/api` | ✔ | ✔ 10 passed | ✔ | ✔ |
| `apps/cli` | ✔ | ✔ 6 passed | ✔ | ✔ |
| `apps/worker` | ✔ | ✘ 4 passed, **1 failed** | ✔ | ✔ |
| `tools/mirror` | ✔ | ✔ 4 passed | ✔ | ✔ |
| `tools/janitor` | ✘ 2 problems | ✘ 3 passed, **1 failed** | ✘ TS2322 | ✘ |
| `packages` (workspace) | ✔ | ✔ 16 passed | ✔ | ✔ |
| `plugins` (workspace) | ✔ | ✔ 7 passed | ✔ | ✔ |

The two red items are deliberate and independent:

- **`apps/worker`** declares no `permissions` in `deno.json`, so `deno test -P` grants nothing and
  `spool_test.ts` raises `NotCapable` reading `./fixtures/spool.json`. It is the one failure that
  `dagger settings deno permissions all` fixes without editing a file.
- **`tools/janitor`** fails all four: `sweep.ts` trips `no-explicit-any` and `no-unused-vars`,
  `broken_types.ts` holds a TS2322 that no test imports, `unformatted.ts` is not `deno fmt`-clean,
  and `mod_test.ts` asserts `99` where the rows add up to `42`. Flip that number to leave only the
  three static failures. **Never run `deno fmt` in `tools/janitor`** — it would silently repair the
  format fixture.

## Running it

```sh
deno test --permit-no-files -P      # per project, the framework's own view
deno lint && deno check . && deno fmt --check

dagger install github.com/dagger/deno@collections --here

dagger check -l --all               # the grid: keys × checks
dagger check -l --all -f link       # canonical dag:// links
dagger check                        # every batch
dagger list deno-projects -a
dagger list deno-workspaces -a
```

Every command above needs `dagger --x-release=v1.0.0-beta.15` until that engine ships. Nothing needs
installing first: the module mounts each project and `deno` fetches from `jsr:` into the
`deno-cache` cache volume. Each project and each workspace root commits its own `deno.lock`.

### Selection

```sh
# one project, all five of its checks
dagger check --deno-project=typescript/test-collections/deno/apps/cli

# one check across two projects — a single batch over both keys
dagger check --check test \
  --deno-project=typescript/test-collections/deno/apps/api \
  --deno-project=typescript/test-collections/deno/apps/cli

# a workspace
dagger check --check test --deno-workspace=typescript/test-collections/deno/packages

# cwd scopes the selection: no flag needed
cd packages/feed/src && dagger check --check test

# rewrite the format fixture, then put it back
dagger generate -y --deno-project=typescript/test-collections/deno/tools/janitor
```

Repeating a key deduplicates (`--deno-project=X --deno-project=X` runs one batch over one key). An
unknown key selects nothing and exits 1 with `no checks selected`.

### Where you run it from

| cwd | `deno-projects` | `deno-workspaces` |
| --- | --- | --- |
| the fixture root | `apps/api`, `apps/cli`, `apps/worker`, `tools/janitor` | `packages`, `plugins`, `tools/mirror` |
| `docs` | — | — |
| `apps/api` | `apps/api` | — |
| `apps/api/fixtures` | `apps/api` | — |
| `packages` | — | `packages` |
| `packages/fixtures` | — | `packages` |
| `packages/feed` | `packages/feed` | — |
| `packages/feed/src` | `packages/feed` | — |
| `packages/scratch` | `packages/scratch` | — |
| `tools` | `tools/janitor` | `tools/mirror` |

A member is only a key from inside it. From the workspace root you get the workspace, whose checks
already cover every member; standing in `packages/feed/src` narrows to that member instead of
running all three. `packages/scratch` behaves the same way even though no `workspace` array names
it.

## Things this fixture pins down

- **A member runs from the workspace root.** From `packages/feed/src`, the module runs
  `deno test --permit-no-files -P feed` — the member as a *target*, not as the cwd. That is the only
  reason `fixture_test.ts` passes: it reads `./fixtures/sample.xml`, which lives at the workspace
  root. Run the same file from `packages/feed` and it fails with
  `NotFound: … readfile './fixtures/sample.xml'`. That failing run is the control.
- **Members are not keyed twice.** `packages` is one key, not four; `DenoWorkspace.members` stays a
  plain list, so `core`, `feed` and `store` never appear next to it.
- **A config under a workspace root is not a standalone project.** `packages/scratch` has its own
  `deno.json` and is absent from the `deno-projects` keys at the fixture root.
- **The config's `exclude` is honoured by `type-check`.** `apps/api` runs `deno check .` and never
  reaches `vendor/legacy.ts`, which holds a TS2322. Drop `"exclude": ["vendor"]` and the check
  turns red.
- **`deno test` only type-checks the test graph.** `tools/janitor/broken_types.ts` breaks
  `type-check` but not `test`, which is what makes the two failures independent.
- **Discovery starts no container.** `dagger check -l --all --progress=plain | grep -c withExec`
  is `0`, as is the count of image pulls.
- **The batch names every failure.** `deno/projects/test` reports both `apps/worker` and
  `tools/janitor`, not just the first.
- **A changeset applies from the cwd.** `dagger generate -y` rewrites `unformatted.ts` whether it is
  run from the fixture root or from inside `tools/janitor`.

### Settings matrix

All verified on `5b413e3`. Values starting with `--` need the `--` separator, and `--here` must come
before it: `dagger settings deno testArgs --here -- --doc`.

| Setting | Command line it produces | Effect on the grid |
| --- | --- | --- |
| `permissions` unset / `config` | `deno test --permit-no-files -P` | the default: `apps/worker` red |
| `permissions all` | `deno test --permit-no-files -A` | `apps/worker` green (5 passed) |
| `permissions none` | `deno test --permit-no-files` | `apps/api` red too (5 of 10 fail) |
| `permissions bogus` | — | rejected: `permissions must be "config", "all" or "none", got: bogus` |
| `testArgs -- --doc` | `deno test --permit-no-files -P --doc` | `apps/cli` red on the stale JSDoc example; `apps/api` stays green |
| `typeCheckTargets mod.ts` | `deno check mod.ts` | `tools/janitor` type-check green — `broken_types.ts` drops out |
| `typeCheckArgs -- --allow-import` | `deno check --allow-import .` | no change; proves the flag reaches `deno` |

## Two things the module gets wrong

Both are reproducible from this fixture on `5b413e3`.

**1. A comment mentioning `"workspace"` makes a project a workspace.** `declaresWorkspace` decodes
the config and, when that throws — which it always does for jsonc with comments — falls back to
`text.contains("\"workspace\"")`. `tools/mirror/deno.jsonc` declares no `workspace` array; it only
says so in a comment:

```jsonc
  // Standalone on purpose: mirror keeps its own lockfile and is not a member of
  // the "workspace" at ../../packages.
```

```console
$ dagger list deno-workspaces -a
deno    typescript/test-collections/deno/packages
deno    typescript/test-collections/deno/plugins
deno    typescript/test-collections/deno/tools/mirror      # <- should be a project
```

Its five checks still pass, so this is a key-placement bug, not a correctness one: the project is
unreachable through `--deno-project`, and `DenoWorkspace.members` reports it as a workspace with no
members. A jsonc-aware decode, or scoping the fallback to a `"workspace"` that is followed by
`:` and `[` outside a comment, would fix it. `plugins/deno.jsonc` is the control — a genuine jsonc
workspace root that must keep working.

**2. `deno.jsonc` is preferred over `deno.json`; deno prefers `deno.json`.** `configFileAt` comments
that "In the same directory deno.jsonc wins, as it does for deno itself". Deno does the opposite:

```console
$ cd apps/cli && deno task which-config     # the task is defined in both files
deno.json

$ dagger call deno project --path=apps/cli config contents | grep version
  "version": "1.2.0-from-deno-jsonc",
```

`apps/cli` holds both markers, with a differing `version` and a `which-config` task, to make this
visible from either side. Today it only affects
the `config` accessor, but `configFileAt` also backs `isWorkspaceRoot` and `findWorkspaceRoot`, so a
directory whose `deno.json` declares a `workspace` and whose stale `deno.jsonc` does not would be
classified the opposite way from `deno`.

## Not covered here

- `Deno.install` (the glibc toolchain injection) and `DenoProject.compile`, including
  cross-compilation and the permission flags baked into the binary.
- A custom `base` container, or a `version` below 2.5.0, where `permissionFlags` drops `-P` and
  falls back to `-A` for `test` and to nothing for `compile`.
- Nested workspaces (a Deno workspace root below another one).
- npm/node_modules-mode Deno projects (`"nodeModulesDir": "auto"`).

## Version sensitivity

Deno is whatever `denoland/deno:alpine-<version>` the module defaults to (`2.9.3` on this commit);
the ground truth above was also reproduced locally on `2.9.2`. Permission sets in the config file
are still flagged experimental by Deno and are the newest thing the module leans on, so re-run the
grid when they move:

```sh
dagger settings deno version 2.5.0    # the first release with -P
dagger settings deno version 2.4.5    # below it: test falls back to -A, so apps/worker goes green
```
