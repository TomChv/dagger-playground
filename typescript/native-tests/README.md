# TypeScript native tests

A Dagger workspace, a module inside it, and a plain `node:test` suite that drives
that module through its **generated client** — the testcontainers pattern: the test
process is native, the fixtures it talks to are Dagger.

```
dagger.toml                      workspace, written with `install --here`
.dagger/modules/fixtures/        the module (greeting + an nginx Service)
clients/dagger/                  generated core client
clients/fixtures/                generated client for the module
test/fixtures.test.ts            native tests, no Dagger runtime involved
```

## Build recipe

```console
mkdir typescript/native-tests && cd $_
dagger install dagger.io/sdk/typescript --here
dagger -y module init typescript --name=fixtures
# edit .dagger/modules/fixtures/src/index.ts
dagger -y module client add ./.dagger/modules/fixtures --sdk=typescript
dagger -y generate            # module source -> entrypoint + clients
npm install
```

`module client add` needs an SDK scope at the consuming directory, and no command
creates one — add it to `dagger.toml` by hand first:

```toml
[sdks.typescript.scopes."."]
name = "native-tests"
```

## Run

Checked against `v1.0.0-beta.18`. The client provisions its engine with the
`dagger` on `PATH`, so a 0.x CLI there fails with
`Cannot query field "serveModule" on type "Query"`:

```console
_EXPERIMENTAL_DAGGER_CLI_BIN=~/Library/Caches/dagger/dagger-1.0.0-beta.18 npm test
```

## Known bug

A module object used as a **nested argument** of a core-client query never serves
its module: `Context.execute()` only runs the serve hook when the module client
executes the outermost query. `dag.fixtures().httpServer()` passed straight to
`core.container().withServiceBinding()` fails with
`Cannot query field "fixtures" on type "Query"`; any earlier call through the
module client in the same session hides it. Both cases are pinned in
`test/fixtures.test.ts`.
