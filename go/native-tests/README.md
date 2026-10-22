# Go native tests

A Dagger workspace, a module inside it, and a plain `go test` suite that drives
that module through its **generated client** — the testcontainers pattern: the test
process is native, the fixtures it talks to are Dagger.

```
dagger.toml                               workspace, written with `install --here`
.dagger/modules/fixtures/                 the module (Greeting + an nginx Service)
internal/dagger/clients/fixtures/         generated client: core API + Fixtures, one package
internal/dagger/clients/fixtures/dag/     package-level helpers over a lazily connected client
test/fixtures_test.go                     native tests, no Dagger runtime involved
```

## Build recipe

```console
mkdir go/native-tests && cd $_
dagger install dagger.io/sdk/go --here
dagger -y module init go --name=fixtures
# edit .dagger/modules/fixtures/main.go
dagger -y generate            # must come before `client add`, see below
go mod init github.com/TomChv/dagger-playground/go/native-tests
dagger -y module client add ./.dagger/modules/fixtures --sdk=go
go mod tidy
```

Two ordering traps, both absent in TypeScript:

- `module client add` **loads** the module, which compiles it. Right after editing
  `main.go` the checked-in `dagger.gen.go` is still the scaffold's and the build fails
  with `r.BaseImageAddress undefined`. Run `dagger generate` first — it rewrites
  `dagger.gen.go` even though it reports the module as skipped for the same reason.
- `module client add` refuses without a `go.mod` (`cannot generate Go clients without
  a go.mod`), and needs an SDK scope at the consuming directory, which no command
  creates. Add it to `dagger.toml` by hand:

```toml
[sdks.go.scopes."."]
name = "native-tests"
```

`go mod tidy` resolves `dagger.io/dagger` to **v0.21.10** — the 1.0 line is only
prereleased, so Go skips it. The generated code compiles and runs against it anyway.

## Run

Checked against `v1.0.0-beta.18`. The client provisions its engine with the `dagger`
on `PATH`, so point it at a 1.0 CLI:

```console
_EXPERIMENTAL_DAGGER_CLI_BIN=~/Library/Caches/dagger/dagger-1.0.0-beta.18 go test ./test/ -v
```

## Note

The Go client is one merged package — core API and `Fixtures` in the same `dagger`
package — and `Connect()` serves the bound module eagerly. So the
[TypeScript nesting bug](../../typescript/native-tests/README.md#known-bug) cannot
happen here: `dag.Container().WithServiceBinding("fixture", dag.Fixtures().Httpserver(...))`
works with no priming call.

`HTTPServer` in Go becomes `Httpserver` on the client (and `httpserver` in the API),
not `httpServer`.
