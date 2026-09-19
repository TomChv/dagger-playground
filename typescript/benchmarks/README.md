# Benchmarks

Timing the `hello-world` module (a single `hello()` function) across three setups:

- **v0.21.9** — pre-beta engine
- **1.0.0-beta.14** — beta engine, standard TypeScript runtime
- **1.0.0-beta.14 + dang entrypoint** — beta engine, with a generated [`dang`](./beta-entrypoint/entrypoint/main.dang) entrypoint

## What is actually measured

The module under test is deliberately trivial:

```ts
@object()
export class HelloWorld {
  @func()
  hello(): string {
    return "hello"
  }
}
```

It returns a string literal — no I/O, no dependencies, no work. Its own execution time is
effectively zero, and every run starts from a pruned local cache. So the numbers below are
**not** measuring the module: they measure what Dagger does *around* it — bootstrapping the
SDK, building the runtime container, pulling base images, introspecting types, and dispatching
the call. Any difference between setups is a difference in setup cost, not in user code.

See [analyze.md](./analyze.md) for the per-phase breakdown pulled from the traces.

## Results

| Version | List functions | Call `hello` |
| --- | --- | --- |
| v0.21.9 | [22.6s](https://dagger.cloud/Quartz/traces/cd922dd2514e37603a6a89cafd4a0ac1#124b7c3b89fe66af) | [27.8s](https://dagger.cloud/Quartz/traces/a81873fc2657985cd6550e908ac9d2a3#839c87eeb7afc61e) |
| 1.0.0-beta.14 | [25.5s](https://dagger.cloud/Quartz/traces/fe8f946ae7a8296ebfb45960987b5529) | [24.5s](https://dagger.cloud/Quartz/traces/f33ae3f3af0ea24c59e84d26e02efe40) |
| 1.0.0-beta.14 + dang entrypoint | [2.2s](https://dagger.cloud/Quartz/traces/425e77dc3a29145737567c544387a094) | [16.4s](https://dagger.cloud/Quartz/traces/231beb44e4ebad711f60599647b1b5fd#c10ce0ec59a56683) |

The dang entrypoint is **~11.6x faster** to list functions and **~1.5x faster** to call a function than plain beta.14.

## Steps

For each module, starting from a cold local cache:

1. Clear cache — `dagger --x-release=<beta-version> -m core api call engine local-cache prune` (or `dagger core engine local-cache prune` on v0.21.9)
2. List functions — `dagger --x-release=<beta-version> -m hello-world api functions` (or `dagger functions` on v0.21.9)
3. Clear cache again — same command as step 1
4. Call `hello` — `dagger --x-release=<beta-version> -m hello-world api call hello` (or `dagger call hello` on v0.21.9)
