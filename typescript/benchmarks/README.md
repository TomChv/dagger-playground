# Benchmarks


## Results 

Beta version: 1.0.0-beta.14
Pre beta version: v0.21.9

v0.21.9 result

[List functions](https://dagger.cloud/Quartz/traces/cd922dd2514e37603a6a89cafd4a0ac1#124b7c3b89fe66af): 22.6s
[Call hello](https://dagger.cloud/Quartz/traces/a81873fc2657985cd6550e908ac9d2a3#839c87eeb7afc61e): 27.8s

beta (.14) result

[List functions](https://dagger.cloud/Quartz/traces/fe8f946ae7a8296ebfb45960987b5529): 25.5s
[Call hello](https://dagger.cloud/Quartz/traces/f33ae3f3af0ea24c59e84d26e02efe40): 24.5s

beta (.14) with dang entrypoint result

[List functions](https://dagger.cloud/Quartz/traces/425e77dc3a29145737567c544387a094): 2.2s
[Call hello](https://dagger.cloud/Quartz/traces/231beb44e4ebad711f60599647b1b5fd#c10ce0ec59a56683): 16.4s

## Steps

For each module:

1. Clear cache: `dagger --x-release=<beta-version> -m core api call engine local-cache prune` or `dagger core engine local-cache prune`
2. List functions `dagger --x-release v1.0.0-beta.14 -m hello-world api functions` or `dagger functions`
3. Clear cache: `dagger --x-release=<beta-version> -m core api call engine local-cache prune` or `dagger core engine local-cache prune`
4. Execute hello `dagger --x-release=<beta-version> -m hello-world api call hello` or `dagger call hello`