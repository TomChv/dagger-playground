# Go suite run by the Dagger go module

`go/native-tests` with its module path rewritten, so `dagger check` runs the same
`go test` suite inside the module's container instead of on the host. Installed:
`dagger.io/go`.

```console
go test ./test/ -v      # host: all pass
dagger check --go        # in the module's container: every test fails
```

Go fails worse than TypeScript and Python. `Connect()` serves the bound module
eagerly and the generated `dag` package panics in `initClient()` when that fails, so
the whole package is unusable inside another module's container —
`TestCoreClientReachesTheEngine` touches no module function and still panics:

```
panic: workspace module source "go/native-test-with-dagger-go-module/.dagger/modules/fixtures"
  does not contain a dagger config file
  .../internal/dagger/clients/fixtures/dag.initClient()
```

See [`report.md`](../../report.md) §1. The module itself is fine: discovery gives one
check per test function, and the `stale` generator check passes.
