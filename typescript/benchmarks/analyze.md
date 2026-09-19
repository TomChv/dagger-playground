# Trace analysis

Where the time in [README.md](./README.md) actually goes, read from the Dagger Cloud traces.

Reproduce any table below with:

```sh
dagger --x-release=1.0.0-beta.14 trace <traceID> -vvv -d --progress=plain
```

The `-d` flag is what makes the CLI fetch and print the full span subtree with span IDs; without
it you only get the two top-level spans.

Reminder: `hello()` returns a string literal and every run starts from a pruned cache. None of
the time below is spent running user code.

## Summary

| Setup | Command | Total | Bootstrap the SDK | Build the runtime container | Introspect / dispatch |
| --- | --- | ---: | ---: | ---: | ---: |
| v0.21.9 | `functions` | 22.6s | 16.5s | — | 5.6s |
| v0.21.9 | `call hello` | 27.8s | 14.8s | 4.7s | 5.4s + 2.1s |
| beta.14 | `functions` | 25.5s | 14.9s | 8.2s | 1.1s |
| beta.14 | `call hello` | 24.5s | 15.0s | 6.1s | 1.1s + 1.0s |
| beta.14 + dang | `functions` | 2.2s | — | — | 0.1s |
| beta.14 + dang | `call hello` | 16.4s | — | 9.1s | 5.9s |

Three costs dominate everywhere: **compiling the TypeScript SDK's own Go runtime**, **pulling a
base image**, and **starting a Node process to introspect the module**. The dang entrypoint
removes the first two from `functions` entirely and the first one from `call`.

## v0.21.9

### `dagger functions` — 22.6s

[Trace `cd922dd2…`](https://dagger.cloud/Quartz/traces/cd922dd2514e37603a6a89cafd4a0ac1#124b7c3b89fe66af)

| Span | Time |
| --- | ---: |
| `connect` | 0.3s |
| `load workspace: .` → `loading type definitions` → `load module: hello-world` | 22.1s |
| ├─ `load SDK: typescript` | **16.5s** |
| │  ├─ `_builtinContainer` (unpack the Go base + bundled SDK source) | 3.2s |
| │  ├─ `ModuleSource.asModule` → `codegen generate-typedefs --module-name typescript-sdk` | 10.4s |
| │  │  └─ of which `loadPackage` | 7.0s |
| │  └─ `go SDK: load runtime` (`go build` the SDK runtime binary) | 2.6s |
| └─ `ModuleSource.asModule` → `module SDK: load typedefs object` | **5.6s** |
| ⠀⠀├─ `Container.from(oven/bun:1.3.0-alpine)` | 4.5s (4.0s pull) |
| ⠀⠀└─ `/codegen generate-module` + `ts-introspector` | 0.8s |

The TypeScript SDK is itself a Dagger module written in Go, so before Dagger can look at
`hello-world` it has to load *and compile* that Go module. That's 16.5s of the 22.6s — 73% —
spent on the SDK, not the user module.

### `dagger call hello` — 27.8s

[Trace `a81873fc…`](https://dagger.cloud/Quartz/traces/a81873fc2657985cd6550e908ac9d2a3#839c87eeb7afc61e)

| Span | Time |
| --- | ---: |
| `connect` | 0.4s |
| `load workspace: .` (identical work to `functions` above) | 20.5s |
| ├─ `load SDK: typescript` | 14.8s |
| └─ `module SDK: load typedefs object` (bun + `ts-introspector`) | 5.4s |
| `HelloWorld.hello` | **6.8s** |
| ├─ `module SDK: load runtime` → `install dependencies` | 4.7s |
| │  ├─ `Container.from(node:24.13.1-alpine)` | 3.9s (3.2s pull) |
| │  └─ `apk add ca-certificates`, `ln -s … tsx` | 0.7s |
| └─ mount + run the function | ~2.1s |

Note the double image pull: **`oven/bun` to introspect the module, then `node` to run it**. Two
different base images for one `hello()`.

## 1.0.0-beta.14 (no entrypoint)

### `dagger functions` — 25.5s

[Trace `fe8f946a…`](https://dagger.cloud/Quartz/traces/fe8f946ae7a8296ebfb45960987b5529)

| Span | Time |
| --- | ---: |
| `load workspace: .` → `load extra module: hello-world` | 25.0s |
| ├─ `moduleSource` | 15.7s |
| │  ├─ `load SDK: typescript` → `go SDK: load runtime` | **14.0s** |
| │  │  ├─ `codegen generate-module --module-name typescript-sdk` | 10.8s (`loadPackage` 5.0s) |
| │  │  └─ `go build -ldflags "-s -w" -o /runtime .` | 1.1s |
| │  └─ `Host.directory` (upload the workspace) | 0.8s |
| └─ `ModuleSource.asModule` | 9.3s |
| ⠀⠀├─ `module SDK: load runtime` → `TypescriptSdk.moduleRuntime` | **8.2s** |
| ⠀⠀│  ├─ `Container.from(node:24.13.1-alpine)` | 6.7s (5.9s pull + 0.8s unpack) |
| ⠀⠀│  └─ `apk add ca-certificates`, `ln -s … tsx` | 1.3s |
| ⠀⠀└─ `asModule getModDef` (run Node in the container to emit typedefs) | 1.1s |

Same Go-compile tax as v0.21.9 (14.0s vs 16.5s), but the shape changed: beta.14 builds the
**full runtime container** during `functions`, not just an introspection container. It also
standardises on a single base image (`node`, no more `bun`), which is why `functions` got
*slower* (25.5s vs 22.6s) while `call` got faster.

### `dagger call hello` — 24.5s

[Trace `f33ae3f3…`](https://dagger.cloud/Quartz/traces/f33ae3f3af0ea24c59e84d26e02efe40)

| Span | Time |
| --- | ---: |
| `load workspace: .` | 23.3s |
| ├─ `moduleSource` → `go SDK: load runtime` | 15.0s |
| └─ `ModuleSource.asModule` | 7.2s |
| ⠀⠀├─ `TypescriptSdk.moduleRuntime` (`node` pull 5.2s + `apk` 0.7s) | 6.1s |
| ⠀⠀└─ `asModule getModDef` | 1.1s |
| `HelloWorld.hello` | **1.0s** |

The interesting number is the last one: because loading the module already built the runtime
container, the call itself costs 1.0s. 95% of the wall clock is `load workspace`.

## 1.0.0-beta.14 + dang entrypoint

### `dagger functions` — 2.2s

[Trace `425e77dc…`](https://dagger.cloud/Quartz/traces/425e77dc3a29145737567c544387a094)

| Span | Time |
| --- | ---: |
| `load workspace: .` → `load extra module: hello-world` | 1.7s |
| ├─ `moduleSource` → `Host.directory` (upload the workspace) | 1.6s |
| └─ `ModuleSource.asModule` (`Module.withObject` from dang literals) | 0.1s |

No `load SDK`, no `go build`, no `Container.from`, no Node process — **nothing is pulled and
nothing is executed**. The entrypoint's `types()` is a literal expression evaluated in the
engine, so the typedefs come back without a container ever being built. What's left is almost
entirely the cost of uploading the workspace directory (1.5s of the 1.6s is the `typescript/`
tree).

### `dagger call hello` — 16.4s

[Trace `231beb44…`](https://dagger.cloud/Quartz/traces/231beb44e4ebad711f60599647b1b5fd#c10ce0ec59a56683)

| Span | Time |
| --- | ---: |
| `load workspace: .` | 1.2s |
| `helloWorld` (constructor) → `call module entrypoint` | **9.1s** |
| ├─ `requireGenerated` (7 × `Directory.exists`) | 0.1s |
| ├─ `Container.from(node:24.13.1-alpine)` | 4.9s (4.1s pull + 0.8s unpack) |
| ├─ `apk add --no-cache ca-certificates` | 0.9s |
| ├─ `npm install -g tsx@4.22.4` | 1.8s |
| ├─ `yarn install --prod` | 1.4s |
| └─ `tsx __dagger.dispatch.ts engine-call` (constructor) | 1.0s |
| `HelloWorld.hello` → `call module entrypoint` | **5.9s** |
| ├─ `tsx __dagger.dispatch.ts engine-call` | 1.0s |
| └─ not attributed to any child span | ~4.7s |

Loading is essentially free (1.2s), and the whole cost moves into the first dispatch, which is
where the container described by `runtime()` in `main.dang` is materialised for the first time.

Two things stand out:

- **The constructor pays for the container.** `helloWorld` is a real dispatch, so building the
  image (`node` pull + `apk` + `npm` + `yarn`) lands on it. The `hello()` call that follows
  reuses it.
- **~4.7s in the second dispatch is unaccounted for.** Every child span under the second
  `call module entrypoint` is either 0.0s or the 1.0s `tsx` exec, yet the parent reports 5.8s.
  That gap is engine-side dispatch overhead with no instrumentation on it, and it is the single
  biggest remaining win in this setup — it's larger than the `tsx` process it wraps.

## Where the wins come from

| | v0.21.9 | beta.14 | beta.14 + dang |
| --- | --- | --- | --- |
| Compile the SDK's Go runtime | 16.5s | 14.9s | **not needed** |
| Base images pulled | `bun` + `node` | `node` | `node` |
| Container built to list functions | yes (bun) | yes (node) | **no** |
| Typedefs come from | Node introspection | Node introspection | **dang literals** |
| Cost of the call once loaded | 6.8s | 1.0s | 15.0s (first dispatch builds the container) |

The dang entrypoint wins `functions` by 11.6x because listing functions no longer touches a
container at all. It wins `call` by a much smaller 1.5x because the container still has to be
built — it just moved from load time to first-dispatch time, and the Go compile step
disappeared.
