# Checks can no longer return a Container, and the Void alternative parks ~130 MiB per check

Reported after an upgrade from `v1.0.0-beta.10`: warm runs got faster and leaner, but
cold runs of a large check suite use ~2 GiB more and OOM-kill self-hosted engines.

## What changed

`@check()` functions that returned a `Container` are rejected from **v1.0.0-beta.15**
(commit `79cf408134`, "feat: add workspace artifacts") by
[`Module.validateObjectFunction`](https://github.com/dagger/dagger/blob/main/core/module.go):

```go
if fn.IsCheck && fn.CheckReturnType.Self() == nil && fn.ReturnType.Self().Kind != TypeDefKindVoid &&
    mod.sourceEngineVersionAfter("v1.0.0-0") {
    if obj.SourceModuleName == "" || fn.ReturnType.Self().ToType().Name() != "Check" {
        return fmt.Errorf("check %s.%s must return Void", obj.Name, fn.Name)
    }
}
```

The rule only applies to modules whose `engineVersion` is after `v1.0.0-0`, so pre-v1
modules keep the old behaviour.

The old behaviour was not just a different type: returning the `Container` let the SDK
runtime process **exit immediately** and the engine sync the container afterwards.
`core/check_projection.go` still does exactly that for any object result with a
no-required-arg `sync` field:

```go
result, err := callable.Call(ctx, ...)
if obj, ok := result.(dagql.AnyObjectResult); ok {
    if sync, ok := obj.ObjectType().FieldSpec("sync", srv.View); ok && !sync.Args.HasRequired(srv.View) {
        return srv.Select(ctx, obj, &result, dagql.Selector{Field: "sync"})
    }
}
```

With `Void`, the check has to `await container.sync()` itself, so the runtime process
stays resident for the whole exec instead of ~0.6 s.

## What this repro measures

`mem/` is a bun-runtime TypeScript module with the two shapes side by side:

| function               | shape                                              |
| ---------------------- | -------------------------------------------------- |
| `voidStyle`            | awaits `container.sync()` — what a v1 check must do |
| `containerStyle`       | returns the `Container` — what a pre-v1 check did   |
| `containerStyleCost`   | the same memory snapshot, taken at the return point |

`voidStyle` returns its own `process.memoryUsage()` / `/proc/self/status` samples, so the
numbers come out of the CLI rather than out of a swallowed log line.

```sh
export DAGGER_LEAVE_OLD_ENGINE=1
dagger --x-release=v1.0.0-beta.24 -m mem api call void-style --tag=a
dagger --x-release=v1.0.0-beta.24 -m mem api call container-style-cost --tag=a
./parallel.sh v1.0.0-beta.24 8 void       # N at once, engine peak memory
./parallel.sh v1.0.0-beta.24 8 container
```

### One runtime process (beta.24, bun)

```
containerStyleCost: up=0.6s rss=188MiB heap=19MiB ext=7MiB VmHWM: 330452 kB
voidStyle entered:          up=0.6s  rss=207MiB heap=19MiB VmHWM: 303444 kB
voidStyle awaiting sync:    up=10.6s rss=126MiB heap=19MiB VmHWM: 303444 kB
voidStyle awaiting sync:    up=20.6s rss=129MiB heap=19MiB VmHWM: 303444 kB
voidStyle sync returned:    up=30.7s rss=130MiB heap=19MiB VmHWM: 303444 kB
```

Both shapes pay the same ~300 MiB startup peak. The difference is **how long** the
~130 MiB steady state is held: 0.6 s versus the whole exec — so with a check group
started all at once, N runtimes overlap instead of N startup spikes being smeared out.

### Eight at once (beta.24, `./parallel.sh`, engine container peak)

| style       | SDK        | idle     | peak      | over idle |
| ----------- | ---------- | -------- | --------- | --------- |
| `container` | bundled    | 208 MiB  | 1.167 GiB | +959 MiB  |
| `void`      | bundled    | 233 MiB  | 1.880 GiB | +1.65 GiB |
| `void`      | standalone | 483 MiB  | 1.988 GiB | +1.51 GiB |

`container` → `void` is ~86 MiB per concurrent check of pure overhead, which
extrapolates to the reporter's numbers (~2 GiB over a 26-check group, ~4.6 GiB over 54).

The two `void` rows are the same within the noise of one run each: **changing SDK does
not change the at-scale cost.** Treat the over-idle deltas as rough — the idle baselines
differ by 250 MiB because the standalone run followed a cold generate in a fresh engine
container.

### Per-exec cgroup peaks, straight from the trace

Better than `docker stats`: the engine samples each exec's own cgroup
(`memory.current`, `memory.peak` — `engine/engineutil/resources/memorystat.go`) and
attaches it to that exec's span. The TUI renders it at verbosity 3, but only in plain
progress — the default output collapses the exec spans, so the metrics never print:

```sh
dagger --progress=plain -vvv -m mem api call void-style --tag=x
```

```
Mem.voidStyle      DONE [30.9s] ◆ Memory Bytes (current): 9.7 MB ◆ Memory Bytes (peak): 307 MB
Container.withExec DONE [30.0s] ◆ Memory Bytes (current): 1.8 MB ◆ Memory Bytes (peak): 9.8 MB
```

| path                            | span                 | runtime process alive | exec peak  |
| ------------------------------- | -------------------- | --------------------- | ---------- |
| bundled, `voidStyle`            | `Mem.voidStyle`      | 30 s                  | **307 MB** |
| bundled, `containerStyle`       | `Mem.containerStyle` | 0.6 s                 | **293 MB** |
| standalone + bun, `voidStyle`   | `Container.withExec` | 30 s                  | **151 MB** |
| the actual work (`alpine sleep`) | `Container.withExec` | 30 s                  | 9–18 MB    |

Three things this settles independently of the host-side measurements:

- 307 MB confirms the in-process `VmHWM` of 303 MB from a completely different source.
- The runtime exec peaks the same (**293 vs 307 MB**) whether the check awaits or hands
  the container back. The peak is startup; the regression changed how *long* the exec
  stays alive, not how big it gets.
- Dropping the TypeScript compiler halves the exec: **307 → 151 MB**. Larger than the
  119 MB the host-side `VmHWM` comparison suggested.
- The work being supervised is 9–18 MB. The TypeScript runtime around it is 16–33×
  that.

For the reporter: `dagger check --progress=plain -vvv` prints `Memory Bytes (peak)` per
check, which attributes the suite's memory per check without watching the engine.

### Where the ~130 MiB goes

Measured with `bun -e` against `sdk/typescript` (bun 1.3.14, macOS arm64):

| import                                                      | RSS     |
| ----------------------------------------------------------- | ------- |
| bun, nothing imported                                       | 22 MiB  |
| `typescript` alone                                          | 88 MiB  |
| `src/index.ts` (what `@dagger.io/dagger` resolves to)       | 140 MiB |
| client.gen + decorators + connect + telemetry (no introspector) | 79 MiB  |

And on the real bundle (`bun build ./src/index.ts --external=typescript --target=node`,
the command from `.dagger/modules/engine-dev/build/sdk.go`):

| bundle                                           | RSS     |
| ------------------------------------------------ | ------- |
| `core.js` as shipped                             | 118 MiB |
| `core.js` without `export { entrypoint }`        | 69 MiB  |

`src/index.ts` line 22 is `export { entrypoint } from "./module/entrypoint/entrypoint.js"`.
That is the legacy *runtime-introspection* entrypoint, which imports the introspector,
which imports `typescript`. Deleting that one export drops all 9 `from "typescript"`
imports out of the bundle.

Nothing needs it any more: since the static-dispatch entrypoint
(`__dagger.entrypoint.ts`, `cmd/codegen/generator/typescript/templates/src/entrypoint/`)
the runtime never calls `scan()`, and the introspector is already shipped separately as
the compiled `/bin/ts-introspector` binary. `entrypoint` has no other consumer in the
repo. Because `core.js` is one bundled file, importing *anything* from it evaluates the
`typescript` import — tree shaking at import time cannot help.

`bun -e` reports RSS right after the import completes, so the 118/69 MiB above is a
**peak**, not a steady state. In-container that shows up as `VmHWM`, not as the parked
RSS — see the next section.

## Which SDK a beta.24 module actually loads

`whichSdk` resolves `@dagger.io/dagger` inside the runtime and greps the bundle.
Measured on beta.24 with the same module source, both on bun 1.3.0:

| module config                                                              | SDK                                  | `from "typescript"` | RSS at entry | parked RSS | `VmHWM`    |
| -------------------------------------------------------------------------- | ------------------------------------ | ------------------- | ------------ | ---------- | ---------- |
| `dagger.json` with `"sdk": {"source": "typescript"}`                       | bundled, from the engine image       | 9                   | 207 MiB      | 126 MiB    | **303 MB** |
| `dagger-module.toml` with `[runtime] source = "typescript"`                | bundled (same — `TypescriptSdk.moduleRuntime`) | 9         | —            | —          | —          |
| workspace `[sdks.typescript] module = <installed typescript-sdk>`, no `[runtime]` | `github.com/dagger/typescript-sdk` | 0                   | 176 MiB      | 125 MiB    | **184 MB** |

So dropping the compiler is worth **~119 MB of startup peak** per runtime process
(−39 %) and **~0 of parked memory**. Both paths park ~126 MiB while awaiting a
container — bun returns the import spike to the OS and then sits at the same floor.

That matters for which half of the reporter's problem it addresses. A cold group run
starts every check at once, so N startup peaks overlap and the peak fix is real there.
The *sustained* `N × 126 MiB` of parked runtimes is identical on both SDKs, and nothing
on the SDK side touches it.

Caveats: the two rows differ in more than the compiler — different dispatcher
architecture (`__dagger.entrypoint.ts` vs a dang `__dagger.dispatch.ts`), npm layout,
and a slightly smaller bundle (4.20 vs 4.41 MB) — so −119 MB is the whole delta between
the two SDKs, not a clean attribution to `typescript` alone. The direction matches the
isolated `bun -e` probe (`typescript` alone = +66 MiB). Left at the default the
standalone scope generates for **node**, not bun, where the same call parks **496 MiB**
(heap 271 MiB, `VmHWM` 515 MB) — ~4× the bun figure. `runtime = "bun"` under
`[sdks.typescript.scopes.<path>.settings]` is what makes the comparison fair.

## Fix options

1. **Already fixed, if you are on the standalone SDK.** `github.com/dagger/typescript-sdk`
   ships `core.js` with zero `typescript` imports — see `library/src/index.ts`,
   `library/VENDOR.md` row "`entrypoint` no longer re-exported", and the
   `packager:module-bundle-check` that keeps the compiler out. Switching a module to it
   (workspace `[sdks.typescript]`, no `[runtime]` block, `runtime = "bun"`) is worth
   ~119 MB of startup peak per check and nothing in parked memory.

   For modules still on the bundled SDK, the same change in `dagger/dagger` is
   `sdk/typescript/src/index.ts:22` plus the `entrypoint,` re-export in
   `sdk/typescript/runtime/tsutils/module/index.ts`. A lazy `await import()` wrapper
   does **not** work: `bun build --outfile` hoists the nine `from "typescript"` imports
   to the top of the single output file either way (measured 223 MiB, worse). The export
   has to leave the bundle entry.
2. **Engine, restores the old profile.** Relax `validateObjectFunction` to accept an
   object return type for a check: `Check.runFunction` already syncs it, so the runtime
   process gets to exit first. This reverses a deliberate v1 design decision, so it is a
   maintainer call, not a bug fix.
3. **Workaround today.** Pin the module's `engineVersion` to a pre-v1 value
   (e.g. `v0.21.11`) and keep returning `Container`; the compatibility field in
   `core/object.go` keeps working.

## What the beta.24 upgrade path actually does to a bun module

Clean-room git repo, `dagger.json` + `package.json` with `"dagger": {"runtime": "bun"}`,
one `@func`. Each row is the state after running the command the previous step told you
to run:

| step                                           | `dagger-module.toml`             | SDK        | JS runtime | parked RSS                 |
| ---------------------------------------------- | -------------------------------- | ---------- | ---------- | -------------------------- |
| start                                          | (`dagger.json`)                  | bundled    | bun        | 126 MiB (`VmHWM` 303 MB)   |
| `dagger workspace migrate -y`                  | `[runtime] source = "typescript"` | —          | —          | **does not load**          |
| `dagger generate -y`                           | `[entrypoint] kind = "dang"`     | standalone | **node**   | **506 MiB** (heap 279 MiB) |
| + `runtime = "bun"` in the scope settings      | same                             | standalone | bun        | 133 MiB (`VmHWM` 184 MB)   |

Three separate problems on that path:

1. `workspace migrate` emits `[runtime] source = "typescript"`, which routes to the
   bundled SDK, whose runtime codegen is off for a `dagger-module.toml`
   (`useRuntimeCodegen` is `ConfigFilename != "dagger.json"`). The module will not load
   until `dagger generate` runs, and the error names the *bundled* layout — "commit the
   whole `sdk/` directory and `__dagger.entrypoint.ts`" — while `generate` actually
   produces the standalone layout (`clients/`, `__dagger.dispatch.ts`, `entrypoint/`)
   and rewrites `[runtime]` to `[entrypoint]`.
2. Migration can silently move the module from bun to **node** — 4× the parked memory
   per check, strictly worse than the regression being investigated. Not a `migrate`
   bug: `migrate` records no runtime, by design, because the standalone SDK's `runtime`
   setting defaults to `""` = detect. The gap is *what* it detects — "deno.json for
   Deno, a bun lockfile for Bun, otherwise Node" (`typescript-sdk.dang:22-24`,
   `effectiveRuntime`). It never reads `package.json`'s `"dagger": {"runtime": "bun"}`,
   which is the **bundled** SDK's first-priority signal (`runtime/config.go`
   `detectRuntime`, checked before any lockfile). Measured both ways:

   | scope contents                                   | detected | parked RSS |
   | ------------------------------------------------ | -------- | ---------- |
   | `dagger.runtime = "bun"`, no lockfile            | node     | 506 MiB    |
   | `dagger.runtime = "bun"` + `bun.lock`            | bun      | 119 MiB    |

   So it bites bun modules that pin the runtime in `package.json` without committing a
   lockfile. `effectiveRuntime`'s own docstring says detection is the default
   specifically so that adoption "does not silently move a Bun or Deno project onto
   Node", so adding `dagger.runtime` to the chain is in the spirit of the existing code.
3. A hand-written `[runtime] source = "typescript"` in a workspace with no
   `[sdks.typescript]` install is a hard deadlock: loading demands committed generated
   files and `generate` has no generator to run ("no changes to apply"). That was my own
   earlier dead end, not a property of the config form.

## Repro limitation

`reject/` holds the rejected shape (`@check() lint(): Container`, next to a plain
`@func() marker()` that proves the check really registered as a check — it is the only
name `api functions` lists). It does **not**
trip `must return Void` here: as a legacy `dagger.json` module in a workspace inferred
from `dagger.json`, `sourceEngineVersionAfter("v1.0.0-0")` is false even with
`"engineVersion": "v1.0.0-beta.24"` in the config, and `dagger check` does not discover
the module's checks at all. Reproducing the error needs a migrated `dagger.toml`
workspace; the reporter hit it on theirs.
