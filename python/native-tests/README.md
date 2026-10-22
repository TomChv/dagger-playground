# Python native tests

A Dagger workspace, a module inside it, and a plain `pytest` suite that drives that
module through its **generated client** — the testcontainers pattern: the test process
is native, the fixtures it talks to are Dagger.

```
dagger.toml                               workspace, written with `install --here`
.dagger/modules/fixtures/                 the module (greeting + an nginx Service)
sdk/                                      vendored dagger-io
clients/core/, clients/fixtures/          generated clients
pyproject.toml                            uv workspace root, written by client gen
test/test_fixtures.py                     native tests, no Dagger runtime involved
```

## Build recipe

```console
mkdir python/native-tests && cd $_
dagger install dagger.io/sdk/python --here
dagger -y module init python --name=fixtures
# edit .dagger/modules/fixtures/src/fixtures/__init__.py
dagger -y module client add ./.dagger/modules/fixtures --sdk=python
dagger -y generate
```

`module client add` needs an SDK scope at the consuming directory, and no command
creates one — add it to `dagger.toml` by hand first:

```toml
[sdks.python.scopes."."]
name = "native-tests"
```

## Run

Checked against `v1.0.0-beta.18`. Client gen lays the project out as a **uv
workspace**, but it needs a recent uv (`uv_build` backend, `[dependency-groups]`);
uv 0.2.x cannot read it. A plain venv works:

```console
python3 -m venv .venv
.venv/bin/pip install -e ./sdk -e ./clients/core -e ./clients/fixtures pytest pytest-asyncio
_EXPERIMENTAL_DAGGER_CLI_BIN=~/Library/Caches/dagger/dagger-1.0.0-beta.18 .venv/bin/pytest -q
```

The client provisions its engine with the `dagger` on `PATH`, hence the override.

## Notes

`pytest.ini` pins the asyncio loop to **session** scope. The SDK's default session
holds an httpx client bound to the loop that opened it, so pytest-asyncio's default
per-test loop closes the connection under the second test:
`TransportError: Connection to engine has been closed`.

`Context` carries its targets through nested-ID resolution, so each argument loads
its own module. The
[TypeScript nesting bug](../../typescript/native-tests/README.md#known-bug) does not
reproduce here: passing `fixtures().http_server()` straight into
`core().container().with_service_binding(...)` works with no priming call.
