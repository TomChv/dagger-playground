---
name: test-collection
description: |
  Testing a Dagger test-framework module's collection support end to end — building a
  realistic fixture project, wiring a workspace at the fixture with `dagger install --here`,
  then exercising discovery, dimension keys, whole-project runs and filtered runs, and
  triaging what breaks. Use when asked to try out / validate a module's collections
  (mochajs, pytest, go, cargo, …), a collections PR, or `dagger check --<mod>-<dim>=…`
  behavior on a new engine release.
---

# Testing collections in a test-framework module

Collections turn "run the tests" into an addressable grid: one check per (project, test
file) pair, each selectable from the CLI. Testing that support means checking two very
different code paths — **discovery** (static, no container, must be cheap and exact) and
**execution** (the whole project vs a filtered subset) — plus the seams where the module
guesses at the test framework's internals.

Worked reference: `typescript/test-collections/mochajs` against
[dagger/mochajs#4](https://github.com/dagger/mochajs/pull/4) on engine `v1.0.0-beta.15`.

## 0. Before the first command

- Ask which engine to use: an experimental release (`dagger --x-release=v1.0.0-beta.15 …`)
  or the installed one. A collections PR usually names the release it needs.
- Default to `dagger --cloud …` for traces; drop `--cloud` when you need engine logs to
  triage a failure. Add `--progress=plain` when you need to read/grep the whole log.

## 1. Shape of the fixture project

The fixture is the input to discovery, so its *layout* is the test. A single `assert(true)`
file proves nothing. Aim for:

- **A real library with real tests.** ≥3 suites, in nested directories (`test/pricing/…`,
  `test/support/…`), so keys are multi-segment and sorting is observable.
- **Discovery driven by the framework's config.** Modules parse the config *statically* —
  the mochajs module reads `spec`, `extension` and `recursive` from `.mocharc.json`/YAML and
  never evaluates a JS config. Use a config form the module claims to support, and make
  `spec` a glob (`["test/**/*.test.ts"]`) rather than a literal file list.
- **Non-test files living inside `test/`.** Helpers (`test/helpers/fixtures.ts`) and a root
  hook file (`test/setup.ts`, loaded via `require`) must **not** show up as keys. Cheap,
  high-signal negative check.
- **Variety the runner has to cope with:** sync + async tests, hooks (`beforeEach`, root
  hooks), a pending test, test doubles. This exercises reporter and exit-code paths.
- **A loader / non-trivial runtime.** ESM `"type": "module"` plus
  `"node-option": ["import=tsx"]` exercises the module's `NODE_OPTIONS` and register
  handling (it branches on `package.json` `type`).
- **Optionally one deliberately failing test file**, to test "filter to a passing file
  passes while the whole run fails".
- **A deliberate framework version.** Test both the latest major and the version the PR says
  it was checked against — modules reach into framework internals, and that is exactly where
  they break (§6).
- Commit the lockfile (the module installs deps in-container, so runs stay reproducible);
  `.gitignore` `node_modules/`, `dist/`, `coverage/`.

## 2. Wiring the workspace with `--here`

The fixture sits in a subdirectory of a larger repo, so pin the workspace to the fixture:

```console
cd typescript/test-collections/mochajs
dagger --x-release=v1.0.0-beta.15 install dagger.io/js/mocha@collections --here
```

- `--here` writes `dagger.toml` at the **cwd** instead of at the workspace root (the git
  repo root). Without it the config lands at the repo root and every unrelated directory in
  the repo becomes part of the workspace.
- `@<branch>` tracks the PR branch. `dagger.lock` records the resolved commit
  (`["","git-sha",["github.com/dagger/mochajs","collections"],"dfb008b…"]`) — compare it with
  `gh pr view 4 --repo dagger/mochajs --json headRefOid`, and run `dagger lock update` after
  the branch moves.
- Consequence of `--here`: the workspace is not itself a git root, so `--absolute` fails with
  `workspace file://… has no Git address`. Dimension keys are still **repo-root**-relative.

## 3. How collections surface in the CLI

The module's types map onto CLI flags; for mochajs the shape is
`Mochajs.projects(ws)` → `MochajsProject.tests(ws)` → one check:

| Collection | Item | Dimension flag | Key is relative to |
| --- | --- | --- | --- |
| `MochajsProjects` | `MochajsProject` | `--mochajs-project=PATH` | repo root |
| `MochajsTestFiles` | `MochajsTestFile` | `--mochajs-test-file=PATH` | project root |

The flag name is the kebab-case item type. `--mochajs` is shorthand for `--module=mochajs`
(use `--by-mochajs` on a name clash). A module filter alone does **not** load collection keys.

```console
dagger check -l --all                     # the grid: one row per (project, test file)
dagger check -l --all -f link             # canonical dag:// links, keys in full
dagger check -l --all -f cli              # paste-ready flag sets
dagger list mochajs-projects -a           # keys of one collection
dagger list mochajs-test-files -a --mochajs-project=<path>
dagger check                              # run everything
dagger check --mochajs --mochajs-test-file=test/support/clock.test.ts
dagger check "dag://mochajs/projects/tests/test?mochajs-project=.&mochajs-test-file=test/support/clock.test.ts"
```

- Repeating a flag within one dimension means *alternatives*; different dimensions must all
  match.
- The `check -l` **table shortens the project key to `.`** relative to cwd, while `-f link`
  and `dagger list` print it in full (`typescript/test-collections/mochajs`). Both forms are
  accepted on input — don't read the table as the canonical key.
- A failed run prints a `== RUN LOCALLY ==` line: the exact single-check command to rerun.

## 4. What to look for

| # | Check | How |
| --- | --- | --- |
| 1 | Discovery starts no container | `dagger check -l --all --progress=plain \| grep -c withExec` → `0` |
| 2 | Keys are complete and exact | diff against the framework's own view: `find test -name '*.test.ts'`; helpers/setup absent |
| 3 | Keys are stable wherever you run | same keys from the project root, from `test/support`, from outside any project |
| 4 | cwd scopes *selection* | inside a project → that project; in a dir owning no project → the projects below it |
| 5 | Whole-project run honors the project's own config | `dagger check` → native `npx mocha`, every suite runs, count matches `npm test` |
| 6 | Filtered run runs *only* the selection | compare the reported test count with `npx mocha <file>` locally |
| 7 | Multi-select and subsets | repeat `--mochajs-test-file`; check order and dedup |
| 8 | Bad input is rejected | unknown key, duplicate key, empty subset |
| 9 | Failures are legible | make one test fail: does the error name the project + file, and is the exit code non-zero? |
| 10 | Breaking changes in the PR body actually hold | removed functions gone, moved args moved, settings honored |

## 5. Triage recipe when a check fails

1. **Read the failing `withExec` line verbatim** — it is the complete command, including any
   generated config path:
   `npx mocha --config /dagger-mocha/mocharc.cjs --no-package test/support/clock.test.ts`.
2. **Compare code paths.** Whole run passes, filtered run fails → the fault is in the filtered
   path (typically the generated config), not discovery. That split alone rules out "my
   project is misconfigured" for anything discovery already got right.
3. **Reproduce outside Dagger**, in the fixture dir, with the same flags. Copy the module's
   generated script to `/tmp/x.cjs` and run `npx mocha --config /tmp/x.cjs --no-package <file>`.
   If it fails there too, it is the module, not the engine or the workspace.
4. **Bisect the framework version** — `npm i -D mocha@11`, rerun the same Dagger command. A
   version-dependent pass/fail is a module assumption about framework internals.
5. **Prove the fix**: take the module's script *verbatim*, change only the suspect line, rerun
   locally, then rerun through Dagger to confirm end to end.
6. Drop `--cloud` and add `-v` / `-d` if the container output is not enough.

## 6. Worked example — the mocha 12 break

`dagger check` passed; `dagger check --mochajs --mochajs-test-file=test/support/clock.test.ts`
failed with `Cannot find module 'mocha/lib/cli/options'` (`ERR_MOCHA_UNPARSABLE_FILE`).

Cause: the module's generated config did
`require.resolve("mocha/lib/cli/options", { paths })`. Mocha 12 went ESM and renamed its
internal CJS files, so that module is now `lib/cli/options.cjs` — and Node's CJS resolver only
tries `.js`, `.json`, `.node`, never `.cjs`. Only the filtered path mounts that config, which
is why the whole-project run (native `npx mocha`) was fine.

| specifier | mocha 11.8.0 | mocha 12.0.2 |
| --- | --- | --- |
| `mocha/lib/cli/options` | resolves | `MODULE_NOT_FOUND` |
| `mocha/lib/cli/options.cjs` | absent | resolves, exports `loadRc`, `loadPkgRc` |

Both directions confirmed: `mocha@11` → filtered check passes; `mocha@12` + the module's script
with only the specifier changed → the single file runs and `spec` is correctly dropped.

## 7. Reporting it

Prefer an inline review comment carrying a committable `suggestion` block over a prose comment.
Anchor it to added lines on the PR head:

```bash
gh pr view 4 --repo dagger/mochajs --json headRefOid -q .headRefOid   # commit_id
gh pr diff 4 --repo dagger/mochajs | grep -n "<the line>"             # confirm it is a + line
grep -n "" mochajs.dang | sed -n '237,240p'                           # exact new-file line numbers

jq -n --rawfile body /tmp/comment.md '{body:$body,
  commit_id:"<sha>", path:"mochajs.dang",
  start_line:238, start_side:"RIGHT", line:239, side:"RIGHT"}' \
  | gh api --method POST /repos/dagger/mochajs/pulls/4/comments --input - -q .html_url
```

Include: the failing command, the trimmed error, the root cause in one sentence, a
version/behavior table, both verification directions, then the ```suggestion block. Keep the
fix backward-compatible with the version the PR was tested against.
