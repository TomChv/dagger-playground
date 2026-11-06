# Findings — generated clients in a test-container pattern

Engine/CLI: `v1.0.0-beta.18`. SDKs as resolved by `dagger install`: typescript-sdk
`v1.0.3` (later `main`), go-sdk `v1.1.0`, python-sdk `v1.2.0`.

Fixtures: `{typescript,go,python}/native-tests` (suite runs on the host) and
`{typescript,go,python}/native-test-with-dagger-<module>-module` (same suite run by a
test-framework module through `dagger check`).

Every suite is the same four tests: a core-client call, a module function, a module
`Service` bound into a container the test builds, and the nested-argument bug (§2).
On the host all four behave as designed. Under `dagger check`:

| variant | module | discovery | in-container result |
| --- | --- | --- | --- |
| typescript vitest | [dagger/vitest#26](https://github.com/dagger/vitest/pull/26) | per test file | **4 pass** (was 2 pass / 2 fail) |
| typescript jest | [dagger/jest#33](https://github.com/dagger/jest/pull/33), merged | per test file | **4 pass** (was 2 pass / 2 fail); needed 5 config workarounds to load the client at all (§11) |
| typescript mocha | [dagger/mochajs#6](https://github.com/dagger/mochajs/pull/6), merged | per test file | **4 passing** (was 2 passing / 2 failing) |
| typescript deno | [dagger/deno#9](https://github.com/dagger/deno/pull/9), merged | test, lint, type-check, format-check | **4 steps pass** (was 2 / 2) |
| typescript bun | [dagger/bun#4](https://github.com/dagger/bun/pull/4) | project, with `exclude` | **4 pass** (was: no tests run at all, §12/13) |
| go | `dagger.io/go` | per test function | **every test fails** — the client panics (§1); not yet fixed |
| python pytest | [dagger/python#8](https://github.com/dagger/python/pull/8) | per test file | **3 pass** (was 1 pass / 2 fail) |

The five TypeScript runners and pytest are fixed the same way: mirror the
workspace in the container, synthesize a `.git` marker at its root, give the
tests their own session, and point the client at the CLI the engine mounts
(§20). pytest needed no mount change — its containers already mirror the
workspace under `/ws` — so the fix is the `.git` marker, the new session and
the CLI variable, in the shared `pyproject` library's `step`, on the nesting
path only. Go is untouched so far.

What no module-side change fixes: the workspace in the container is only the
project subtree, so a served module that reads `ws` sees a truncated repo.
Measured on vitest — host root listing `[.claude/, .git/, .gitignore, .skills/,
.worktrees/, README.md, go/, python/, report.md, typescript/]` versus
`[.git/, typescript/]` inside, with `README.md` and `go/native-tests` reported as
absent rather than erroring. `includeExtraFiles = ["**"]` reproduces the host view
exactly, at the cost of mounting everything. The engine-side fix — a nested session
inheriting the caller's live workspace — is the only thing that removes the
mounting decision altogether.

---

## 1. A generated module client cannot serve its module from inside another module's container

**Severity: blocks the whole pattern.** Hit by every framework module; nothing a user
can configure around.

A test run by a framework module (`dagger check`) executes inside that module's
container. The core client works there — a nested session connects and
`core.container().from("alpine").withExec(...)` runs. But the *module* client cannot
serve its module:

```
serve module "/typescript/native-test-with-dagger-vitest-module/.dagger/modules/fixtures"
  from module "vitest": dir module source does not contain a dagger config file
```

Client gen hardcodes a workspace-root-relative address:

```ts
// clients/fixtures/fixtures.gen.ts
async function __serveModule(): Promise<void> {
  await __dag.serveModule("/typescript/native-test-with-dagger-vitest-module/.dagger/modules/fixtures")
}
```

That address is workspace-root-relative, and there are **two** separate reasons it
does not resolve. Both were measured by probing the engine from inside the vitest
container (`core.currentWorkspace()`, in a throwaway test — the module's reporter
swallows stdout, so the probe reports through a thrown error):

| vitest settings | `currentWorkspace` in the nested session | `serveModule` |
| --- | --- | --- |
| default | `cwd=/`, `configFile=`, `root-entries=[]` | fails |
| `includeExtraFiles = [".git/**", "<project>/dagger.toml", "<project>/dagger.lock", "<project>/.dagger/**"]` | `cwd=/typescript/…-vitest-module`, `configFile=dagger.toml`, `root-entries=[".git/","typescript/"]`, `exists("…/.dagger/modules/fixtures/dagger-module.toml")=true` | fails identically |

**(a) By default the nested session has no workspace at all.** Empty root, no config
file. The workspace root is found from `.git`, and the module's test container does
not carry it, so a workspace-root-relative address has nothing to resolve against.
Mounting `.git` fixes the derivation completely — cwd, config file and root all come
back right.

**(b) Even then, `serveModule` does not use that workspace.** With the module's
`dagger-module.toml` demonstrably visible in the session's own workspace at exactly
the path the address names, the call still fails and still attributes the failure to
`from module "vitest"`.

Note on an earlier version of this finding: a first attempt passed
`includeExtraFiles = [".dagger/**", "dagger.toml", "dagger.lock"]` and concluded
"mounting is ruled out". Those patterns are **workspace-root**-relative, so they
matched nothing at the repo root and that run mounted nothing. Mounting does matter —
it is just not sufficient.

The engine-side trace shows where it lands:

```
✘ Directory.asModuleSource(sourceRootPath: "typescript/native-test-with-dagger-mocha-module/.dagger/modules/fixtures")
  ! dir module source does not contain a dagger config file
```

Same wall in all three languages, with the caller module named in the message
(`from module "vitest"` / `"jest"` / `"mochajs"` / `"deno"` / `"pyproject"`):

| SDK | message | behaviour |
| --- | --- | --- |
| TypeScript | `GraphQLRequestError: serve module … dir module source does not contain a dagger config file` | the two module tests fail, core keeps working |
| Python | `ClientLoadError: Failed to load client 'fixtures' from '…': serve module …` | same, and the clearest message of the three |
| Go | `panic: workspace module source "…" does not contain a dagger config file` | **panics**, see below |

**Go is worse: it takes the core API down with it.** `Connect()` serves the bound
module eagerly and the generated `dag` package does `panic(err)` in `initClient()`,
so *every* test that touches `dag` dies — including one that only calls
`dag.Container()`. `TestCoreClientReachesTheEngine` in
`go/native-test-with-dagger-go-module` pins exactly that: it uses no module function
and still panics inside the container, while passing on the host.

**Fixed for vitest in [dagger/vitest#26](https://github.com/dagger/vitest/pull/26)**,
which `typescript/native-test-with-dagger-vitest-module` now points at
(`source = "github.com/dagger/vitest@nested-client-workspace"`). Three changes, all
module-side; the suite goes from 2 passed / 2 failed to **4 passed**:

1. mount the workspace's `.git` at `/src`, so the session finds a workspace root;
2. `daggerInDaggerNewSession: true` instead of `experimentalPrivilegedNesting: true`,
   so the test's client gets its own session and addresses resolve against the user's
   workspace rather than against the vitest module;
3. `_EXPERIMENTAL_DAGGER_CLI_BIN=/dev/.dagger/dagger` — with its own session the
   client provisions through a CLI, and without this it dies with
   `TypeError: Cannot read properties of undefined (reading 'port')` (§20).

Proven independently before touching the module, with a plain container from the
host:

```
dagger workspace root  ->  /src
dagger workspace cwd   ->  /typescript/native-test-with-dagger-vitest-module
dagger call -m /src/<project>/.dagger/modules/fixtures greeting --name probe
                       ->  Hello, probe!
```

So (b) is not an engine bug after all: a nested client *can* resolve a workspace
module address, as long as it has its own session and a workspace to resolve
against. Joining the caller's session is what pins resolution to the caller's
module. The same three-line recipe should carry to jest, mocha, deno, bun and
pytest, which are all still failing.

Remaining follow-ups:

1. A nested session should inherit a usable workspace. Today a test running under a
   framework module sees an empty one, so *any* workspace-relative API is dead there,
   not just `serveModule`. If the fix is "the module must mount `.git`", that is a
   contract every test-framework module has to implement and document; a module that
   runs user tests arguably cannot know it needs to.
2. In a *shared* session, `serveModule` resolves a workspace address against the
   calling module even when the session's own workspace holds the module at exactly
   that path. Giving the client its own session avoids it, but a test that wants to
   join the caller's session — cheaper, one trace tree — still cannot.
3. Failing that, client gen could emit an address that does not depend on a workspace
   at all (a module ref / pin).
4. Separately, the Go `dag` package should not `panic` on a connect failure.

---

## 2. A module object nested in a core-client query never serves its module (TypeScript only)

`Context.execute()` (`clients/dagger/core.js`) runs the serve hook only when the
**leaf** context carries it. A module object used as an argument of a core-client
query resolves through the *core* context, which has no hook:

```ts
core.container().withServiceBinding("fixture", dag.fixtures().httpServer())
// Cannot query field "fixtures" on type "Query"
```

Any earlier call through the module client in the same session hides it, so it reads
as flaky. Pinned by the third test in each TypeScript suite.

Not reproducible in Go (one merged package, `Connect()` serves the bound module
eagerly) or Python (`Context` carries its targets through nested-ID resolution, so
each argument loads its own module). The TypeScript design is the outlier.

---

## 3. No command creates an SDK scope for a client consumer

All three languages. `dagger module client add ./.dagger/modules/fixtures` from a
directory that is not already an SDK scope fails:

```
client generation is not available from workspace cwd "typescript/native-tests"
```

`dagger sdk scope` only *edits* an existing scope (`is-module`, `name`, `sdk`); there
is no `sdk scope add`. The only way forward is hand-writing the table:

```toml
[sdks.typescript.scopes."."]
name = "native-tests"
```

after which `module client add` works and fills in `clients = [...]`. Every
"generate a client for my app" flow starts with an undocumented manual edit.

---

## 4. Go: `module client add` is blocked by the generated file it is supposed to refresh

Right after editing `main.go`, `dagger module client add` fails because it loads
(= compiles) the module against the scaffold's `dagger.gen.go`:

```
./dagger.gen.go:67:32: r.BaseImageAddress undefined (type Fixtures has no field or method BaseImageAddress)
./dagger.gen.go:232:11: undefined: New
```

`dagger generate` fixes it, but reports the module under `SKIPPED MODULES` with that
same compile error while *still* rewriting `dagger.gen.go` correctly — so the output
says it did nothing useful when it did exactly the needed thing. Workable order:
`generate`, then `client add`.

Also: `module client add` requires a `go.mod` in the consuming directory first
(`cannot generate Go clients without a go.mod`) — reasonable, but undocumented.

---

## 5. Go: initialisms collapse in generated names

`func (m *Fixtures) HTTPServer(...)` — idiomatic Go — surfaces as `Httpserver` on the
client and `httpserver` in the API, not `httpServer`. Consistent between typedef and
client, so it works; it just makes the Go source the odd one out versus the
TypeScript/Python `httpServer`.

---

## 6. Go: `go mod tidy` resolves `dagger.io/dagger` to v0.21.10

The 1.0 line is prerelease-only, so Go picks the latest stable 0.x for the module the
generated client imports. It compiles and runs against beta.18, but the pin is
misleading and will shift when 1.0 ships.

---

## 7. The native client provisions its engine from `PATH`, ignoring the workspace

A suite generated against beta.18 dies under a 0.x CLI with `Cannot query field
"serveModule" on type "Query"` — the client shells out to whatever `dagger` is on
`PATH` to provision. Every run here needs:

```console
_EXPERIMENTAL_DAGGER_CLI_BIN=~/Library/Caches/dagger/dagger-1.0.0-beta.18 <test command>
```

and that cache path is garbage-collected between runs (the binary disappeared and was
re-downloaded mid-session). No supported way to say "use the engine/CLI this workspace
is pinned to".

---

## 8. Python: pytest's default per-test event loop kills the shared session

The SDK's default session holds an httpx client bound to the loop that opened it, so
with pytest-asyncio's default function-scoped loop the second test gets:

```
dagger.TransportError: Connection to engine has been closed.
Make sure you're calling the API within a `dagger.connection()` context.
```

The message sends you to a `dagger.connection()` context manager that the 1.0 SDK no
longer exports (it has `connect()` / `close()` on the default session). Fixed in the
fixture with `asyncio_default_test_loop_scope = session`, but the advice in the error
is a dead end. Worth either a doc note or a loop-aware session.

---

## 9. Python: generated layout needs a uv newer than the one most people have

Client gen writes a uv workspace (`uv_build` backend, `[tool.uv.workspace]`). uv
0.2.33 (current Homebrew bottle on this machine at the time) cannot read it, and the
failure is not obviously "your uv is too old". A plain venv works:

```console
python3 -m venv .venv
.venv/bin/pip install -e ./sdk -e ./clients/core -e ./clients/fixtures pytest pytest-asyncio
```

Worth a minimum-uv-version note in the generated README/pyproject.

---

## 10. Cloud engine unusable on this repo

`dagger --engine=cloud install ...` sat at "5 steps running" for 10 minutes with no
output and no files written, because the workspace upload is the whole git root
(456 MB here — `.worktrees/` and vendored `node_modules` are included even though
`.worktrees/` is `.gitignore`d). The same command on the local engine finished in
1m1s. Everything in these fixtures was therefore run locally and is not traced in
Dagger Cloud.

---

## 11. The generated TypeScript client needs five workarounds before jest can load it

Every one of these was a separate failure, found one at a time, in
`typescript/native-test-with-dagger-jest-module`:

| failure | fix |
| --- | --- |
| `Haste module naming collision: @dagger.io/dagger` — `clients/dagger/package.json` and `.dagger/modules/fixtures/clients/dagger/package.json` both claim the name | `modulePathIgnorePatterns: ["<rootDir>/.dagger/"]` |
| `Must use import to load ES Module: /src/clients/dagger/core.js` | transform `.js` too, not just `.ts` |
| the clients are in `node_modules` via `file:`, so they are not transformed | `transformIgnorePatterns: ["/node_modules/(?!@dagger\\.io/)"]` |
| `Cannot find module './client.gen.js' from 'clients/dagger/index.ts'` — the clients import siblings with `.js` while shipping `.ts` | `moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }` |
| ESM needs `NODE_OPTIONS=--experimental-vm-modules`, and the module runs `node_modules/.bin/jest` directly, so the `package.json` test script is never used | `[modules.jest.settings] environment = ["NODE_OPTIONS=--experimental-vm-modules"]` |

Only the last is jest-module-specific; the first four are the client's layout
meeting a popular runner. vitest, mocha (via `tsx`), bun and deno all consumed the
same client with no transform config at all. Worth either a documented jest recipe
or a client layout that does not need one — a second generated package named
`@dagger.io/dagger` in the same tree is a problem on its own.

That the module runs the binary and not the `test` script also deserves a line in
each module's README: `NODE_OPTIONS`, `TZ` and friends set there are silently
dropped.

---

## 12 & 13. bun: generated clients are discovered as test projects

Both earlier findings here — "the nested `file:` dependency breaks `bun install`"
and "a check that finds no tests passes" — were symptoms. The cause is that a
generated client ships a `package.json`, so bun's discovery
(`findRoots(markers: ["package.json"])`) treats each one as a project:

```
withWorkdir /src/.dagger/modules/fixtures/clients/dagger   -> No tests found!
withWorkdir /src/.dagger/modules/fixtures                  -> No tests found!
withWorkdir /src/clients/dagger                            -> No tests found!
withWorkdir /src/clients/fixtures                          -> bun install: error:
    Could not find package.json for "file:../dagger" dependency "@dagger.io/dagger"
```

Each project is mounted alone, so `clients/fixtures` cannot see the sibling its
`file:../dagger` points at; and since the fan-out is an `each`, that failure aborts
the run before the real project — which sorts last — is reached. Zero tests run,
reported as either a pass or an error naming a directory the user never considered
a project.

Two corrections to what this report said before:

- `--pass-with-no-tests` is **deliberate and documented** ("passes when a project
  legitimately has no test files"), not a bug. It only makes the real failure
  silent.
- The `file:` install failure is **not about `file:` dependencies**. The module
  mounts each project on its own, so any dependency pointing outside the project
  directory is absent.

Fixed in [dagger/bun#4](https://github.com/dagger/bun/pull/4) with an `exclude`
setting — workspace-root-relative globs left out of discovery, since clients can
live anywhere the workspace config puts them and cannot be hardcoded — plus the
same mirror/marker/session changes as the other runners. Verified: **No tests
found ×4 → 4 tests run, 4 pass**.

Still open there: `testAll` is an `each`, so one project's failure stops the rest.

---

## 14. deno: two generators fight over the same generated file

`dagger generate` with both the deno module and the TypeScript SDK installed:

```
Error: conflict between changesets 0 and 1: conflict between changesets at path
"typescript/native-test-with-dagger-deno-module/clients/fixtures/fixtures.gen.ts":
path modified in both changesets
```

The deno module's `format` generator reformats the SDK's generated client while the
SDK regenerates it, and the whole `generate` aborts — including the client
regeneration a user actually needed. Nothing is written, and the error does not say
which generators collided or what to do.

Workarounds: `"exclude": ["clients", ".dagger"]` in `deno.json`, or
`dagger generate --generator typescript-sdk/generate`. A changeset conflict between
two *generators* over a file one of them owns should probably resolve in favour of
the owner, or at least name both generators.

---

## 15. deno: the client's node builtins are not `node:`-prefixed

`clients/dagger/core.js` imports `fs`, `path`, `os`, `process`, `crypto`, `zlib`,
`events`, `buffer`, `assert`, `readline` and `url` unprefixed, which Deno only
resolves under npm compatibility.

The TypeScript SDK generator handles this — it *writes into* `deno.json`, adding:

```json
"unstable": ["bare-node-builtins", "sloppy-imports", "node-globals", "byonm"]
```

Two notes. First, that `dagger generate` edits a hand-written `deno.json` is
surprising and undocumented in the module/SDK READMEs. Second, `byonm` ("bring your
own node_modules") assumes an installed `node_modules`, which the deno module's
container does not have; the fixture works instead by mapping the client packages
and the builtins in `deno.json` `imports`, with no `package.json` at all. Emitting
`node:`-prefixed builtins would remove the need for any of it.

---

## 16. `dagger/pytest`'s README does not match the CLI

| README | beta.18 reality |
| --- | --- |
| `dagger init .` | `dagger init` takes no argument |
| `dagger toolchain install github.com/dagger/pytest` | no `toolchain` command in `dagger --help`; `dagger install dagger.io/python/pytest` is the working form |
| `dagger check pytest:test` | checks are addressed `dagger check --pytest` / `dag://?check=pytest/projects/tests/test&…` |
| install address `github.com/dagger/pytest` | resolves to `github.com/dagger/python#v0.2.0:pytest` |
| "initialized module fastapi-cli", example text says `fastly/fastly-cli` then clones `fastify`-ish repo | example is internally inconsistent |

Also, in the serve error the module identifies itself as **`from module "pyproject"`**,
not `pytest` — looks like the module name is being taken from the project file.

---

## 17. bun's README documents per-project checks that do not surface

The README lists, "per project (`Bun.project` → `BunProject`)": `test`, `audit`,
`install-check`. `dagger check -l --all` in a workspace with one project shows only
the workspace-wide variants:

```
bun  audit-all          Audit dependencies of every discovered project (`bun audit`).
bun  install-check-all  Verify every discovered project installs cleanly against its frozen lockfile
bun  test-all           Run the test suite of every discovered project (`bun test`).
```

No `--bun-project` dimension, no per-project rows, so the README's selection
examples cannot be followed. (It is also the only module here installed from a
branch — `github.com/dagger/bun@main`; it is not in `dagger module search`.)

---

## 18. Copying a workspace silently keeps the old serve address

Not a bug so much as a trap worth documenting: the address in
`clients/fixtures/fixtures.gen.ts` is the workspace path at generation time, so a
copied or renamed directory keeps pointing at the original:

```ts
await __dag.serveModule("/typescript/native-tests/.dagger/modules/fixtures")
```

Nothing warns; the client just serves someone else's module, or fails if the
original is gone. `dagger generate` fixes it. The Go variant additionally needs its
`go.mod` module path and every import rewritten by hand before the generated client
compiles.

---

## 19. Deno: a second `connection()` in one process kills the session

On the host, the first `connection()` works and the second one dies:

```
error: (in promise) ExecaError: Command failed with ERR_STREAM_PREMATURE_CLOSE:
  …/dagger-1.0.0-beta.18 session --label dagger.io/sdk.name:nodejs …
Premature close
```

The whole file is then aborted — `1 passed | 4 failed`, with three tests
`cancelled`. So a Deno suite can hold exactly one session per process: the TypeScript
SDK's provisioning spawns `dagger session` through execa, and the second spawn trips
Deno's node-compat stream handling.

Inside the module's container the same file is fine, because a nested exec inherits
`DAGGER_SESSION_PORT` and no subprocess is spawned at all. That inversion is worth
knowing: **the host path is the broken one here**, and only on Deno.

`typescript/native-test-with-dagger-deno-module` therefore runs one `Deno.test` with
four `t.step`s inside a single `connection()`. That also forces the step order:
serving is memoized per connection, so the step that expects an *unserved* module
(§2) has to run before the one that serves it.

Follow-up: the SDK's engine-session provisioning should survive repeated
connect/close on Deno, or the SDK should document one-session-per-process there.

---

## 20. The SDKs ignore the CLI the engine mounts for them

An exec started with `daggerInDaggerNewSession: true` gets only
`DAGGER_ENGINE=tcp://127.0.0.1:<port>` in its environment, so an SDK has to run a
Dagger CLI to open its session. The engine already provides one — probed from
inside such a container:

```
/dev/.dagger/dagger          75 MB, version-matched
PATH=…:/dev/.dagger          so `command -v dagger` resolves
```

But the TypeScript SDK's provisioning only looks at `_EXPERIMENTAL_DAGGER_CLI_BIN`;
it never falls back to `dagger` on `PATH`. With the variable unset, provisioning
fails with a bare

```
failed to execute function with automatic provisioning:
TypeError: Cannot read properties of undefined (reading 'port')
```

which says nothing about a missing CLI.

**Fixed in [dagger/typescript-sdk#115](https://github.com/dagger/typescript-sdk/pull/115),
shipped in typescript-sdk `v1.0.4`**, for the first two of the three below.
Verified against beta.18 from inside a container started with
`daggerInDaggerNewSession: true` and **no** `_EXPERIMENTAL_DAGGER_CLI_BIN`: the suite
that previously failed on every test now reports `pass 3, fail 0`, and pointing the
variable at `/bin/false` reports `EngineSessionError: dagger CLI "/bin/false" exited
with code 1 without starting a session` instead of the `TypeError`.

Re-checked with the released tag: the vitest fixture regenerated on `v1.0.4` passes
**4/4 with the module's `_EXPERIMENTAL_DAGGER_CLI_BIN` line removed**. The line stays
in dagger/vitest#26 anyway, as a documented compatibility shim — a generated client
ships its own bundle, so its SDK version is independent of the engine's, and a client
built before `v1.0.4` still fails without it. It can go once those are out of
support; for a newer client it names the binary `PATH` would have given anyway.

Reading [`typescript-sdk`](https://github.com/dagger/typescript-sdk)
`library/src/session/provisioning/`, there are three separate things to fix:

**1. The PATH lookup exists but is unreachable.** `Bin.findDaggerCLI()` already
resolves `dagger` from `PATH`. It is only called from `fallbackToLocalCLI()`, which
`Connect()` only calls when `downloadCLI()` throws *and*
`hasCLIReleaseUnavailableError()` recognises the error. So the happy path always
downloads. `withEngineSession()` (`provisioning/index.ts`) should try `PATH` when
`_EXPERIMENTAL_DAGGER_CLI_BIN` is unset — and when `DAGGER_ENGINE` is set it should
*prefer* it, because a CLI the engine mounted is version-matched to that engine by
construction.

**2. The `TypeError` is a swallowed error.** `readConnectParams()` is typed
`Promise<ConnectParams | undefined>` and falls off its end when the CLI prints no
line: the `for await` ends, and the handler does

```ts
try { await this.subProcess } catch {
  this.subProcess?.catch((e) => { throw new EngineSessionError(e.stderr) })
}
```

which *registers* a rejection handler rather than throwing, so the real exit code
and stderr are lost and the caller dereferences `.port` on `undefined`. (The source
carries a `// Need to find a better way to handle this part` comment right there.)
It should throw an error naming the CLI path, the exit code and the stderr.

**3. `CLI_VERSION` is stale.** `provisioning/default.ts` — and the shipped client
bundle — pin `1.0.0-beta.11` while the engine here is beta.18, so even a successful
download fetches a mismatched CLI.

Until 1 lands, every module that wants to run Dagger-using tests has to hardcode
`/dev/.dagger/dagger`, an engine-internal path, as dagger/vitest#26 does.

The Python SDK has the same shape — `provisioning/_engine.py`'s
`fallback_to_local_cli()` uses `shutil.which("dagger")` but only after a
`CLIReleaseUnavailableError` — though it at least raises a named `ExceptionGroup`
rather than a `TypeError`.

It also fails more quietly. Measured on the pytest fixture with
`_EXPERIMENTAL_DAGGER_CLI_BIN` removed from dagger/python#8: the suite still
passes 3/3, because `get_cli()` falls through to the downloader and fetches
`CLI_VERSION`, the release the client was generated against — the nested client
logs `client-version=v1.0.0-beta.18` against a `v1.0.0-beta.20` engine, over the
network, on every run. With the variable set it is `beta.20`, the CLI the engine
mounted. So for Python the variable buys a version-matched CLI and no download
rather than a working suite, and the same `PATH`-when-`DAGGER_ENGINE`-is-set fix
belongs in this SDK too.

For comparison, the default (shared-session) exec gets `DAGGER_SESSION_PORT`,
`DAGGER_SESSION_TOKEN` and `_DAGGER_NESTED_CLIENT_ID`, which is why core-API calls
work there with no CLI at all.
