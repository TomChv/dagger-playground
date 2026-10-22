# pytest suite run by the Dagger pytest module

`python/native-tests`, so `dagger check` runs the same pytest suite inside the
module's container instead of on the host. Pinned to
`github.com/dagger/python/pytest@nested-client-workspace`
([dagger/python#8](https://github.com/dagger/python/pull/8)), which gives the test's
Dagger client a workspace and its own session.

```console
.venv/bin/pytest -q      # host: 3 pass
dagger check --pytest     # in the module's container: 3 pass
```

`pyproject.toml` needed a real `[project]` table with the deps: the module installs
what the project declares, and the generated uv-workspace root declares none, so the
first run failed with `async def functions are not natively supported` — i.e. no
`pytest-asyncio` in the container.

On the released `dagger.io/python/pytest` v0.2.0 the same suite is 1 pass / 2 fail,
with the clearest error message of the three SDKs:

```
dagger.ClientLoadError: Failed to load client 'fixtures' from
  '/python/native-test-with-dagger-pytest-module/.dagger/modules/fixtures':
  serve module … from module "pyproject": dir module source does not contain a dagger config file
```

The fix is the same three lines as the other modules, in the shared `pyproject`
library this one builds its containers with: an empty `.git` at `/ws` (the container
already mirrors the workspace there), `daggerInDaggerNewSession: true`, and
`_EXPERIMENTAL_DAGGER_CLI_BIN=/dev/.dagger/dagger`. Unlike TypeScript, the Python SDK
runs without the last one — it downloads the CLI release its client was generated
against instead, here beta.18 against a beta.20 engine — so it buys a version-matched
CLI and no download, not a working suite.

To go back to the released module, set `source = "dagger.io/python/pytest"` in
`dagger.toml` and run `dagger module update`.

See [`report.md`](../../report.md) §1 and §20, and §16 (README/CLI mismatches in this
module, plus the module calling itself `pyproject`).
