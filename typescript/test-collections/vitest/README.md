# linkforge — a Vitest collection fixture

A link-shortener monorepo in TypeScript, tested with [Vitest](https://vitest.dev). It exists to
exercise the Vitest module's collection support ([dagger/vitest#24](https://github.com/dagger/vitest/pull/24))
on engine `v1.0.0-beta.15`: five projects, seventeen test files, and one deliberate failure.

The *layout* is the test. Each project covers a different part of discovery and execution, and a
handful of files are there to prove what must **not** show up as a key.

## Projects

Every project installs independently — the module mounts one project directory at a time and runs
`npm install` in it, so no npm workspaces, no cross-project imports, and one lockfile per project.

| Project | Marker | What it covers |
| --- | --- | --- |
| `.` | `vitest.config.ts` | a project holding other projects; its own run excludes `apps/**` and `packages/**`; `setupFiles` with a custom matcher; a `.spec.ts` alongside `.test.ts` |
| `packages/slug` | `vitest.config.ts` | pure sync logic, `test.each` tables, one pending test, an empty test file |
| `packages/store` | **`vite.config.ts`** | the `vite.config.*` fallback marker; async tests, `vi.fn`, fake timers; helpers and a setup file living inside `test/` |
| `apps/dashboard` | `vitest.config.ts` | `happy-dom` environment, Preact JSX, a custom `include`, a custom `exclude`, a substring-colliding key family, the one failing file |
| `apps/dashboard/e2e` | `vitest.config.ts` | a project nested inside another one; reads a fixture above its own root, so it needs `includeExtraFiles` |

## The grid

17 test files across the 5 projects, keyed by project-relative path:

```
.                          src/config/load.test.ts, src/config/schema.spec.ts, src/errors.test.ts
apps/dashboard             legacy/src/badge.test.ts, src/badge.test.ts, src/badge.test.tsx,
                           src/link-list.test.tsx, src/quarantine/retry.test.ts, src/totals.test.ts
apps/dashboard/e2e         specs/shared-fixture.test.ts, specs/smoke.test.ts
packages/slug              src/base62.test.ts, src/slug.spec.ts, src/validate.test.ts
packages/store             src/store.test.ts, src/ttl.test.ts, test/integration/roundtrip.spec.ts
```

Project keys are **workspace-root-relative**, and the workspace root is the git repository root, not
this directory — so they all carry the `typescript/test-collections/vitest/` prefix even though
`dagger.toml` was written here with `--here`.

### What must not be a key

| Path | Why it must be absent |
| --- | --- |
| `test/setup.ts`, `packages/store/test/setup.ts`, `apps/dashboard/test/setup.ts` | setup files, not test files |
| `test/helpers/env.ts`, `packages/store/test/helpers/fake-store.ts` | helpers living inside a `test/` directory |
| `packages/slug/src/blank.test.ts` | empty: ripgrep only reports files with content |
| `apps/dashboard/checks/labels.ts` | a real test file, but only the project's custom `include` matches it |
| `apps/dashboard/e2e/specs/*` under `apps/dashboard` | files of a nested project belong to that project |
| anything under `node_modules/` | run `npm install` in each project first, so pruning is actually exercised |

## Expected results

`dagger check` runs one native `npx vitest` per project, so the grid resolves to five runs:

| Project | Files run | Tests | Result |
| --- | --- | --- | --- |
| `.` | 3 | 21 passed | ✔ |
| `packages/slug` | 3 | 35 passed, 1 skipped | ✔ |
| `packages/store` | 3 | 20 passed | ✔ |
| `apps/dashboard` | 6 | 33 passed, **1 failed** | ✘ |
| `apps/dashboard/e2e` | 2 | 7 passed | ✔ |

The one red check is `apps/dashboard/src/totals.test.ts › summarise › sums the clicks`, which asserts
`99` where the fixture's clicks add up to `42`. Flip that number to make the whole grid green.

`apps/dashboard` runs **6** files for **5** keys: `checks/labels.ts` is added by the config's
`include` (so it runs but has no key) and `src/quarantine/retry.test.ts` is dropped by the config's
`exclude` (so it has a key but does not run).

## Running it

```sh
npm install                                 # in each project, see below
npx vitest                                  # per project, the framework's own view

dagger install github.com/dagger/vitest@collections --here
dagger settings vitest includeExtraFiles 'typescript/test-collections/vitest/fixtures/**' --here

dagger check -l --all                       # the grid, one row per (project, test file)
dagger check -l --all -f link               # canonical dag:// links
dagger check                                # every project
dagger list vitest-projects -a
dagger list vitest-test-files -a --vitest-project=typescript/test-collections/vitest/packages/store
```

Every command above needs `dagger --x-release=v1.0.0-beta.15` until that engine ships.

`npm install` has to run in all five project directories: `.`, `packages/slug`, `packages/store`,
`apps/dashboard` and `apps/dashboard/e2e`.

### Selection

```sh
# exactly one file out of a colliding family
dagger check --vitest-project=typescript/test-collections/vitest/apps/dashboard \
  --vitest-test-file=src/badge.test.ts

# two files of one project
dagger check --vitest-project=typescript/test-collections/vitest/apps/dashboard \
  --vitest-test-file=src/badge.test.ts --vitest-test-file=src/link-list.test.tsx

# cwd scopes the selection: no flag needed
cd apps/dashboard/src && dagger check --vitest-test-file=src/badge.test.ts
```

`src/badge.test.ts` is a substring of both `src/badge.test.tsx` and `legacy/src/badge.test.ts`, so
selecting it makes the module pass two exclusions:

```
npx vitest src/badge.test.ts --exclude legacy/src/badge.test.ts --exclude src/badge.test.tsx
```

That is the selection to reach for when testing the documented Vitest 1.x limit of a single
`--exclude`.

## Things this fixture pins down

- **A project's own config wins in a whole run.** `apps/dashboard` proves it in both directions at
  once: a file only the config includes runs, a file the config excludes does not.
- **Selecting a config-excluded file fails.** `--vitest-test-file=src/quarantine/retry.test.ts`
  leaves Vitest with `No test files found, exiting with code 1`.
- **`includeExtraFiles` patterns are workspace-root-relative.** Under `--here` in a subdirectory
  they need the whole repo-relative prefix (`typescript/test-collections/vitest/fixtures/**`, not
  `fixtures/**`). Unset the setting and `apps/dashboard/e2e` fails on the missing fixture.
- **The workspace is only visible at or below this directory.** `--here` wrote `dagger.toml` here, so
  running `dagger list vitest-projects -a` from `typescript/test-collections` finds no modules.

### Not reachable in this layout

- A project keyed `.`, and the "directory that belongs to no project" cwd rule: the workspace root is
  the repository root and the project at this directory encloses everything below it. Both need a
  workspace rooted at a directory that holds no Vitest config.

## Version sensitivity

Vitest is pinned at `^4.1.0` (currently 4.1.11), the version the module dev-depends on. The
framework internals the module reaches into are exactly where it breaks, so it is worth re-running
the grid against other majors:

```sh
npm i -D vitest@5   # latest major
npm i -D vitest@2   # last major before 4
npm i -D vitest@1   # accepts a single --exclude: the colliding selection above should fail here
```
