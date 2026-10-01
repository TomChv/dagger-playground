# guardrail — an ESLint collection fixture

A billing codebase in JavaScript, linted with [ESLint](https://eslint.org). It exists to exercise
the ESLint module's collection support ([dagger/eslint#14](https://github.com/dagger/eslint/pull/14))
on engine `v1.0.0-beta.15`: nine projects, five install roots, four package managers, three ESLint
majors, and one deliberate failure.

The *layout* is the test. For a linter the interesting dimension is not the file grid but **where
dependencies come from**, so each project covers a different install root, package manager or config
marker — and a handful of directories are there to prove what must **not** become a key.

## Projects

A project is a directory holding an ESLint config. Each one runs the ESLint its own install root
provides, so the fixture spans ESLint 8, 9 and 10 on purpose.

| Project | Marker | Install root | ESLint | What it covers |
| --- | --- | --- | --- | --- |
| `monorepo` | `eslint.config.mjs` | itself (npm `workspaces`) | 10.11.0 | a project holding three others; `globalIgnores` with a `!` re-include; the `--ignore-pattern` exclusions |
| `monorepo/packages/core` | `eslint.config.mjs` | `monorepo` | 10.11.0 | a workspace package resolving the hoisted `eslint`; the one failing project |
| `monorepo/packages/ui` | **`eslint.config.ts`** | `monorepo` | 10.11.0 | the TypeScript config marker, loaded through the `jiti` the root installs |
| `monorepo/templates/keep` | `eslint.config.mjs` | `monorepo` | 10.11.0 | a directory the root ignores with `templates/*` and puts back with `!templates/keep` |
| `apps/web` | `eslint.config.mjs` | itself (**Yarn PnP**) | 10.11.0 | `packageManager: yarn@4.18.1` through corepack, no `node_modules`, so the runner falls through to `yarn eslint` |
| `apps/cli` | `eslint.config.mjs` | itself (**bun**) | 10.11.0 | `bun.lock` detection and the `npm install -g bun` bootstrap on an Alpine image |
| `services/api` | `eslint.config.mjs` | **`services`** | 9.39.5 | a lockfile *above* the project's own `package.json`, so the runner walks up to find ESLint |
| `standalone` | `eslint.config.mjs` | **none** | npx latest | no `package.json` at or above it, so `npx --yes eslint` fetches ESLint |
| `legacy` | **`.eslintrc.yml`** | itself | 8.57.1 | the legacy YAML marker on the last ESLint that reads eslintrc natively |

The fixture root holds no config and no `package.json`, so it exercises the "outside any project"
rule and keeps `standalone` genuinely rootless.

## The grid

Nine projects, keyed by their path from the workspace root — which is the git repository root, not
this directory, so every key carries the `typescript/test-collections/eslint/` prefix even though
`dagger.toml` was written here with `--here`:

```
apps/cli      apps/web      legacy      monorepo      monorepo/packages/core
monorepo/packages/ui        monorepo/templates/keep   services/api        standalone
```

### What must not be a key

| Path | Why it must be absent |
| --- | --- |
| `monorepo/templates/starter/` | holds a config, but the root's `globalIgnores(["templates/*"])` covers it. Its `index.js` has an unused variable that no project reports |
| `monorepo/packages/ui/snapshots/` | holds a config, but the root's `**/snapshots/**` covers it — **except when you `cd` into it**, see below |
| `pkg-config-only/` | a config given only in `package.json` (`eslintConfig`) is not discovered |
| `monorepo/src/`, `services/api/src/` | directories without their own config belong to the project that encloses them |
| 18 configs under `node_modules/` | `fastq`, `reusify`, `fast-json-stable-stringify` and `json-schema-traverse` really do ship `eslint.config.js` / `.eslintrc.yml`. Run the installs first so the exclusion is exercised against real packages, not a synthetic tree |

## Expected results

`dagger check` runs one `eslint .` per project, so the grid resolves to nine runs:

| Project | Command the runner picked | Result |
| --- | --- | --- |
| `apps/cli` | `apps/cli/node_modules/.bin/eslint .` | ✔ |
| `apps/web` | `yarn eslint .` | ✔ 2 warnings |
| `legacy` | `legacy/node_modules/.bin/eslint .` | ✔ |
| `monorepo` | `monorepo/node_modules/.bin/eslint .` + 5 × `--ignore-pattern` + `--no-error-on-unmatched-pattern` | ✔ |
| `monorepo/packages/core` | `monorepo/node_modules/.bin/eslint .` | ✘ **2 errors** |
| `monorepo/packages/ui` | `monorepo/node_modules/.bin/eslint . --ignore-pattern snapshots/** …` | ✔ |
| `monorepo/templates/keep` | `monorepo/node_modules/.bin/eslint .` | ✔ |
| `services/api` | `services/node_modules/.bin/eslint .` | ✔ |
| `standalone` | `npx --yes eslint .` | ✔ |

The one red check is `monorepo/packages/core/src/totals.js`: a `prefer-const` ESLint can fix and a
`no-unused-vars` it cannot, so `fix` leaves the project failing on purpose. Delete the `pending`
constant to make the whole grid green.

`apps/web`'s two warnings are `Unused eslint-disable directive` in the `.pnp.cjs` that Yarn
generates during the install. A local `yarn eslint .` reports exactly the same two, so the module
matches ESLint here rather than diverging from it.

## Running it

```sh
# the framework's own view, per install root
(cd monorepo && npm install && npx eslint .)
(cd services && npm install) && (cd services/api && ../node_modules/.bin/eslint .)
(cd legacy   && npm install && npx eslint .)
(cd apps/web && corepack yarn install && corepack yarn eslint .)
(cd apps/cli && bun install && ./node_modules/.bin/eslint .)
(cd standalone && npx --yes eslint .)

dagger install github.com/dagger/eslint@collections --here

dagger check -l --all                       # the grid, one row per project
dagger check -l --all -f link               # canonical dag:// links
dagger check                                # every project
dagger list eslint-projects -a
```

Every command above needs `dagger --x-release=v1.0.0-beta.15` until that engine ships. No settings
are needed; the fixture runs on the defaults.

### Selection

```sh
P=typescript/test-collections/eslint

dagger check --eslint --eslint-project=$P/monorepo/packages/core   # one project
dagger check --eslint --eslint-project=$P/legacy --eslint-project=$P/standalone  # two
dagger -c "eslint | projects | get $P/monorepo/packages/core | fix | export ."   # apply fixes
cd monorepo/src && dagger check                                    # cwd picks the project
```

### Where you run it from

| cwd | Projects in view |
| --- | --- |
| the fixture root | all nine |
| `monorepo` | `monorepo` and the three projects below it |
| `monorepo/src` | `monorepo` — inside a project, nothing below |
| `monorepo/packages` | `monorepo` (enclosing) plus `packages/core` and `packages/ui` |
| `apps` | `apps/cli` and `apps/web` |
| `services/api/src` | `services/api` |
| `pkg-config-only` | none |
| `monorepo/packages/ui/snapshots` | **`…/snapshots`** — a key that does not exist from anywhere else |

## Things this fixture pins down

- **The runner finds the right ESLint four different ways.** The nearest `node_modules/.bin/eslint`
  (`apps/cli`), one walked up to from a deeper project (`services/api` → `services`), Yarn's under
  Plug'n'Play (`apps/web`), and `npx` when there is no `package.json` at all (`standalone`). All four
  work; `apps/web` and `standalone` are branches the module's own e2e suite never reaches.
- **Install-root detection beats the project's own `package.json`.** `services/api` has a
  `package.json` of its own, but the lockfile one level up wins, so the install happens at `services`
  and `services/node_modules/.bin/eslint` is what runs.
- **`eslint.config.ts` really loads.** Dropping a `let` into `packages/ui/src` fails that project with
  `prefer-const`, so the TypeScript config is in effect and not silently skipped.
- **bun works on `node:25-alpine`.** `npm install -g bun` pulls the musl build and `bun install`
  succeeds, so the un-versioned global install is fine on the default image.
- **The install is reused across source edits.** Editing `monorepo/src/report.js` leaves
  `withExec npm install` at `CACHED [0.0s]`; touching `monorepo/package.json` puts it back to
  `DONE [0.7s]`. The PR's caching claim holds.
- **`baseImageAddress` works.** The whole grid passes identically on `node:22`, which still ships
  corepack, so the `command -v corepack || npm install -g --force corepack` branch is covered in both
  directions.
- **`fix` is rooted at the caller.** From the fixture root the changeset is
  `monorepo/packages/core/src/totals.js`; it applies `prefer-const` and leaves `no-unused-vars` for
  `lint` to keep reporting.
- **The breaking changes in the PR body hold.** `eslint:lint` → `no checks matched pattern`,
  `dagger call eslint lint` → `unknown command`, and the constructor takes no workspace
  (`eslint | projects | keys` works on its own).
- **Discovery starts no container.** `dagger check -l --all --progress=plain | grep -c withExec` is
  `0`, and the nine keys come back sorted and complete.

## What this fixture found

Three things the module's own e2e suite does not catch. The first two come from the same place: the
module decides what a project is by reading an *enclosing* config's global ignores.

1. **A key that only exists from inside the directory.** `monorepo/packages/ui/snapshots` is not a
   project from anywhere above it, but `cd monorepo/packages/ui/snapshots && dagger check` makes it
   one — and it **fails** with two `camelcase` errors. `findRoots` starts at the cwd, so the
   enclosing project whose ignores would have dropped it is not in the list to do the dropping. The
   same workspace is green from the repository root and red from that directory, and
   `--eslint-project=…/snapshots` from the root answers `no checks selected`.

2. **ESLint 10 stopped agreeing with the premise.** On ESLint 10 a directory holding its own
   `eslint.config.*` starts a fresh config scope, and an ancestor's `ignores` no longer apply below
   it:

   | file | ESLint 9.39.5 | ESLint 10.11.0 |
   | --- | --- | --- |
   | `mid/leaf/code.js`, root ignores `**/leaf/**`, `mid` and `leaf` both hold configs | ignored | **linted, with `leaf`'s config** |
   | `leaf/code.js`, same ignore, `leaf` directly under the root | ignored | ignored |

   So `ignoredByParent` asks a question ESLint 10 answers differently. In this fixture
   `npx eslint .` inside `packages/ui` reports the two `camelcase` errors from `snapshots/`, while
   `dagger check --eslint-project=…/packages/ui` passes: the module's `--ignore-pattern snapshots/**`
   hides files that plain ESLint lints.

3. **`Workspace.findRoots` is the whole cost, and it is paid N+1 times.** Every call takes **7–12s**
   and never caches — 7.2s even with `node_modules` moved out of the way, on a 123-file workspace, so
   it is the call itself and not the tree. Discovery makes one, and `eslint(ws)` makes another per
   project to build its `--ignore-pattern` list, so the nine-project grid pays ten of them. Since
   every project is at or below the cwd, one `configRoots(ws, cwd)` result could be filtered by
   prefix to serve them all, leaving a second call only for the enclosing-project case.

And one smaller gap: `installFiles` lists `.yarn/releases/**`, `.yarn/plugins/**` and
`.yarn/patches/**` but not `.yarn/cache/**`, so a Yarn **zero-install** repository re-downloads every
package inside the container instead of installing from the cache it committed. `apps/web` would be
such a repository if its `.yarn/cache` were not gitignored here — 11 MB of zips the install never
reads.

## Not covered here

- pnpm, `catalog:` dependencies and `file:`/`link:` local dependencies — the module's e2e suite
  covers these with its `pnpm-workspace` fixture.
- The `packageManager`, `installFlags` and `environment` settings, also covered by the e2e suite.
- The `.eslintrc`, `.eslintrc.js`, `.eslintrc.cjs` and `.eslintrc.json` markers, and
  `eslint.config.cjs` / `.mts` / `.cts`.
- A project whose `package.json` installs no ESLint, which the e2e `no-eslint` fixture covers.

## Version sensitivity

The fixture deliberately spans three ESLint majors, because the module reaches into ESLint's own
model of what a config is, and that model changed:

```sh
(cd monorepo && npm i -D eslint@9)   # before per-file config resolution
(cd monorepo && npm i -D eslint@10)  # back to the default
(cd legacy   && npm i -D eslint@9)   # .eslintrc.yml stops being read without ESLINT_USE_FLAT_CONFIG=false
```
