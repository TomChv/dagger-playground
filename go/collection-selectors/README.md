# collection-selectors — what a collection's CLI selector is actually named

A Go module proving how the CLI names collection selectors, written to settle a question raised on
[dagger/dagger#14447](https://github.com/dagger/dagger/pull/14447): whether selecting a collection
item goes through a hardcoded `--path` flag rather than the collection's own dimension.

It does not. Two different names are at play, and the fixture is built so they cannot be confused:

| | Comes from | Example here |
| --- | --- | --- |
| the **flag** (and the URI query key) | the dimension, i.e. the collection's item type | `--runner-project`, `?project=` |
| the **value placeholder** | the author's `+get` argument name | `PATH`, because `Project(path string)` |

`--mochajs-project=PATH` in a real module reads that way for the same reason: `PATH` is the
placeholder for a key the module author named `path`. The selector itself is the dimension's.

In code: `core/artifact_collection.go` builds each dimension with
`Name: ArtifactTypeName(itemType)` and `KeyName: members.Get.Args[0].Self().Name`;
`internal/cmd/dagger/artifact_flags.go` allocates the flag from `Name`, and
`internal/cmd/dagger/artifacts.go` renders the placeholder from `cliName(dimension.KeyName)`.
There is no `path` anywhere in that path — `dagger check --path=./api` is `unknown flag: --path`.

## The fixture

`runner/main.go` is shaped like a test-framework module, with the key names deliberately unlike
the type names:

| Collection | Item | `+get` argument | Selector | Keys |
| --- | --- | --- | --- | --- |
| `Projects` | `RunnerProject` | `path` | `--runner-project PATH` | `./api`, `./web` |
| `Suites` (under a project) | `RunnerSuite` | `file` | `--runner-suite FILE` | `e2e.test.ts`, `unit.test.ts` |
| `Envs` | `RunnerEnv` | `name` | `--runner-env NAME` | `ci`, `local` |

`Suite.Run` and `Env.Ready` are `+check`, so the checks form a grid: 2 projects × 2 suites, plus
2 envs.

```console
$ dagger check -l --all
MODULE  RUNNER-ENV  RUNNER-PROJECT  RUNNER-SUITE  CHECK
runner  ci                                        ready
runner  local                                     ready
runner              ./api           e2e.test.ts   run
runner              ./api           unit.test.ts  run
runner              ./web           e2e.test.ts   run
runner              ./web           unit.test.ts  run

$ dagger check -l --all -f cli
--runner --runner-env=ci
--runner --runner-env=local
--runner --runner-project=./api --runner-suite=e2e.test.ts
...

$ dagger check -l --all -f link        # on v1.0.0-beta.15
dag+check://envs/ready?env=ci
dag+check://projects/suites/run?project=./api&suite=e2e.test.ts
...
```

The query keys are dimension names as well — note `suite=`, not `file=`, even though the
placeholder is `FILE`. Their exact shape changed after beta.15
([dagger/dagger@438a37fd51](https://github.com/dagger/dagger/commit/438a37fd51), unrelated to
#14447): the schema path moved into `check=` and the keys became the module-qualified names, so on
current `main` the same row prints as

```
dag+check://?check=projects/suites/run&runner-project=./api&runner-suite=unit.test.ts
```

i.e. the URI keys are now exactly the selector flag names. That commit states the rule outright:
"Short names come from the namespaced item type, so they cannot collide across modules."
`test.sh` asserts the invariant that holds on both — `project=`, `suite=`, `env=` present,
`path=` and `file=` absent.

### One dimension is not always enough — and is not meant to be

A grid needs one selector per axis. `--runner-project` alone leaves both suites selected:

```console
$ dagger check -l --runner-project=./api
MODULE  RUNNER-PROJECT  RUNNER-SUITE               CHECK
runner  ./api           e2e.test.ts, unit.test.ts  run

$ dagger check -l --runner-project=./api --runner-suite=unit.test.ts
MODULE  RUNNER-PROJECT  RUNNER-SUITE  CHECK
runner  ./api           unit.test.ts  run

$ dagger check --runner-project=./api --runner-suite=unit.test.ts
✔ dag://projects/suites/run?project=./api&suite=unit.test.ts 0.3s OK
```

### The call surface is a different one

`TypeDef.asObject` projects a collection, renaming the author's getter to `get(key:)`, so a call
chain selects by `--key` — again never `--path`:

```console
$ dagger call projects get --key=./api suites get --key=unit.test.ts file
unit.test.ts
```

## Run

```console
DAGGER_ENGINE=cloud DAGGER="dagger --x-release=v1.0.0-beta.15" sh test.sh
```

`test.sh` asserts on the output rather than just printing it, so a change in selector naming fails
the run. Against a dev engine built from a dagger/dagger checkout — run from that checkout:

```console
dagger --engine=cloud --x-release=v1.0.0-beta.15 api call playground \
  with-directory --path=/home/testdir --source=<absolute path to this directory> \
  with-exec --args=sh,/home/testdir/test.sh --expect=ANY stdout
```

(`--path` there is `Container.withDirectory(path:)` — mounting this directory into the playground.
It is a core container function, unrelated to collections. That is the flag the question was about.)

## Results — 2026-10-09

| engine | result |
| --- | --- |
| released `v1.0.0-beta.15` (`cbf69413`) | **45 assertions passed, 3 failed** — every selector assertion passes; the 3 failures are the two `call` cases below |
| dev build of dagger/dagger `2ba3bdb4` (#14447 merged) | **48 assertions passed, 0 failed** |

The selector half needs nothing from #14447: flag names, placeholders, the grid, combining
dimensions, `unknown flag: --path` and running a pinned check all hold on the released engine.

What #14447 does change is the call surface. On beta.15 this fixture reproduces that bug too — its
item types are reachable only through `get`, so the projected `list` field is the only mention of
`[RunnerProject]`:

```
$ dagger call projects get --key=./api suites get --key=unit.test.ts file
! load return type for function "list": typedef "[RunnerProject]" not found in currentTypeDefs(returnAllTypes: true)
```

See `../collections-projected-list` for the fixture dedicated to that fix.
