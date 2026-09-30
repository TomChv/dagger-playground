# relaykit — a Jest collection fixture

A webhook-relay codebase in JavaScript, tested with [Jest](https://jestjs.io). It exists to
exercise the Jest module's collection support ([dagger/jest#31](https://github.com/dagger/jest/pull/31))
on engine `v1.0.0-beta.15`: five projects, seventeen test-file keys, and one deliberate failure.

The *layout* is the test. Each project covers a different part of discovery and execution, and a
handful of files are there to prove what must **not** show up as a key — or what runs without ever
being one.

## Projects

A project is a directory holding a `jest.config.{js,mjs,cjs,ts,mts,cts,json}`. Everything here is
plain CommonJS JavaScript on npm, so each project installs with nothing but `jest`.

| Project | Marker | What it covers |
| --- | --- | --- |
| `monorepo` | `jest.config.js` | a root config whose literal `projects` list absorbs its packages; an npm-workspaces install root; a shared `jest.base.config.js` above the package roots; a `jest.config-*.js` named variant |
| `services/api` | **`jest.config.mjs`** | the `.mjs` marker and `export default`; `roots` narrowing the tree Jest walks; the `environment` setting |
| `services/api/e2e` | **`jest.config.cjs`** | a project nested inside another one that no `projects` list names; a `<rootDir>`-anchored `testMatch` |
| `apps/web` | **`jest.config.json`** | the JSON marker; `testRegex` instead of `testMatch`; `testPathIgnorePatterns`; the one failing file |
| `tools/codegen` | `jest.config.js` | a config the module **cannot** read statically (`module.exports = withDefaults(…)`), so discovery falls back to Jest's defaults and is wrong in both directions |

The fixture root itself holds no Jest config, so it exercises the "a directory that belongs to no
project" rule that a repository-rooted workspace cannot reach.

## The grid

17 test files across the 5 projects, keyed by project-relative path:

```
apps/web               src/__tests__/format.test.js, src/badge.test.js, src/totals.test.js
monorepo               packages/queue/src/backoff.test.js, packages/queue/src/queue.test.js,
                       packages/report/src/digest.test.js,
                       packages/signature/src/__tests__/canonical.test.js,
                       packages/signature/src/hmac.test.js
services/api           src/__tests__/headers.test.js, src/router.test.js, src/schedule.test.js,
                       src/validate.test.js
services/api/e2e       specs/delivery.test.js, specs/retry.test.js
tools/codegen          src/emit.test.js, src/parse.test.js, src/scratch/wip.test.js
```

Project keys are **workspace-root-relative**, and the workspace root is the git repository root, not
this directory — so they all carry the `typescript/test-collections/jest/` prefix even though
`dagger.toml` was written here with `--here`.

`monorepo`'s keys are the packages' files, not the packages themselves: the root config runs them
through `projects`, so they are keyed under the root and filtered by each package's own config.

### What must not be a key

| Path | Why it must be absent |
| --- | --- |
| `monorepo/scripts/health.test.js` | the root config delegates everything to `projects`, so no package claims it |
| `monorepo/jest.base.config.js` | a shared config fragment, not a marker and not a test |
| `monorepo/packages/queue/src/fixtures/seed.test.js` | recorded deliveries, excluded by the package's `testPathIgnorePatterns`. It declares no test, so a run that picks it up fails loudly |
| `services/api/test-utils/contract.test.js` | a real test file, but outside the config's `roots` |
| `services/api/e2e/specs/*` under `services/api` | files of a nested project belong to that project |
| `apps/web/src/legacy/old.test.js` | excluded by `testPathIgnorePatterns`. It requires a module deleted in 2.0, so a run that picks it up fails loudly |
| `tools/codegen/checks/naming.js` | a real suite, but only the dynamic config's `testMatch` reaches it |
| anything under `node_modules/` | run `npm install` in each project first, so pruning is actually exercised |

## Expected results

`dagger check` runs one native `jest` per project, so the grid resolves to five runs:

| Project | Files run | Tests | Result |
| --- | --- | --- | --- |
| `monorepo` | 5 | 35 passed, 1 skipped, 1 todo | ✔ |
| `services/api` | 4 | 32 passed | ✔ |
| `services/api/e2e` | 2 | 7 passed | ✔ |
| `apps/web` | 3 | 19 passed, **1 failed** | ✘ |
| `tools/codegen` | 3 | 18 passed | ✔ |

The one red check is `apps/web/src/totals.test.js › attempted › counts every attempt`, which asserts
`99` where the fixture's rows add up to `42`. Flip that number to make the whole grid green.

`tools/codegen` runs **3** files for **3** keys, but they are not the same three: `checks/naming.js`
is added by the dynamic config's `testMatch` (so it runs but has no key) and `src/scratch/wip.test.js`
is dropped by its `testPathIgnorePatterns` (so it has a key but does not run).

## Running it

```sh
npm install                                 # in each install root, see below
RELAY_RETENTION_DAYS=7 npm test             # per project, the framework's own view

dagger install github.com/dagger/jest@collections --here
dagger settings jest environment RELAY_RETENTION_DAYS=7 --here

dagger check -l --all                       # the grid, one row per (project, test file)
dagger check -l --all -f link               # canonical dag:// links
dagger check -l --all -f cli                # paste-ready flag sets
dagger check                                # every project
dagger list jest-projects -a
dagger list jest-test-files -a --jest-project=typescript/test-collections/jest/tools/codegen
```

Every command above needs `dagger --x-release=v1.0.0-beta.15` until that engine ships.

`npm install` has to run in the five install roots: `monorepo` (which covers its three packages),
`services/api`, `services/api/e2e`, `apps/web` and `tools/codegen`. Only `services/api` needs
`RELAY_RETENTION_DAYS=7`.

### Selection

```sh
# a passing file inside the failing project
dagger check --jest --jest-project=typescript/test-collections/jest/apps/web \
  --jest-test-file=src/badge.test.js

# two files of one project
dagger check --jest --jest-project=typescript/test-collections/jest/services/api \
  --jest-test-file=src/router.test.js --jest-test-file=src/validate.test.js

# a file inside a package the root config runs through `projects`
dagger check --jest --jest-project=typescript/test-collections/jest/monorepo \
  --jest-test-file=packages/queue/src/queue.test.js

# cwd scopes the selection: no project flag needed
cd apps/web/src && dagger check --jest-test-file=src/badge.test.js
```

With every test file of a project selected the module runs `jest` with no file arguments; with some
filtered out it runs `jest --passWithNoTests --runTestsByPath <files>`.

### Where you run it from

| cwd | Projects in view |
| --- | --- |
| the fixture root | all five |
| `monorepo` | `monorepo` — its `projects` list absorbs `packages/signature` and `packages/queue` |
| `monorepo/packages/signature` | `…/packages/signature`, a project of its own, keys relative to the package |
| `services/api` | `services/api` and `services/api/e2e` |
| `services/api/src` | `services/api` — a nested project that is not below the cwd stays out |
| `apps/web/src/helpers` | `apps/web` |

## Things this fixture pins down

- **A root `projects` list is run once, from the root.** `monorepo` is one check; its packages are
  not keyed again, and `dagger check --jest-test-file=packages/queue/src/queue.test.js` routes
  through the root config to the right package.
- **A package of that workspace is still a project on its own.** `cd monorepo/packages/signature`
  and it runs alone, installing from the workspace root above it so `../../jest.base.config` and the
  hoisted `node_modules/.bin/jest` are both there.
- **A named config variant is not a marker.** `packages/report` holds only
  `jest.config-nightly.js`, so it is not a project — but the root's `projects` names that file, so
  its tests are keyed under `monorepo` and filtered by it.
- **Static discovery is wrong in both documented directions.** `tools/codegen` proves it at once: a
  file only the config excludes is keyed, and a file only the config includes runs unkeyed.
  Selecting the keyed-but-excluded `src/scratch/wip.test.js` runs nothing and passes.
- **`roots` and `testPathIgnorePatterns` are honoured statically.** `services/api/test-utils/` and
  `apps/web/src/legacy/` hold files that look exactly like tests and are absent from the grid.
- **The `environment` setting reaches the tests.** Unset it and `services/api` fails with
  `Jest project …/services/api: jest failed (exit 1)` on the two retention-window assertions.
- **Discovery starts no container.** `dagger check -l --all --progress=plain | grep -c withExec`
  is `0`.

### Not covered here

- The `.ts`, `.mts` and `.cts` config markers: Jest needs `ts-node` to load them, which the rest of
  the fixture does not want.
- ESM projects (`"type": "module"`), which Jest only runs under `--experimental-vm-modules`.
- pnpm, yarn and bun install roots, and the `build`, `useEnv`, `installFlags` and `flags` settings.

## Version sensitivity

Jest is pinned at `^30.5.2`. The framework internals the module reaches into are exactly where it
breaks, so it is worth re-running the grid against other majors:

```sh
npm i -D jest@29   # last major before 30
npm i -D jest@28   # jsdom split out, testEnvironment resolution changed
```
