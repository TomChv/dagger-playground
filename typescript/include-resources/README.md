# Files outside the module directory

Repro for [typescript-sdk#86](https://github.com/dagger/typescript-sdk/pull/86),
which lets a TypeScript module build and run with files outside its own
directory **with nothing declared** — the set comes from what the module's code
imports. Built on the entrypoint `sources` member
([dagger/dagger#14693](https://github.com/dagger/dagger/pull/14693)).

```console
cd typescript/include-resources
./run.sh
```

16 scenarios, ~3 minutes warm. Needs **v1.0.0-beta.18** — the script passes
`--x-release=v1.0.0-beta.18`; override with `DAGGER="dagger" ./run.sh` once that
is your installed default.

## Layout

```
dagger.toml           workspace root; SDK pinned to @main
app/                  the module under test
  package.json        declares nothing — no dagger.include, no resources
  src/index.ts        imports a function AND a type from ../shared, reads a file there
bare/                 the control: the same reads, importing nothing outside itself
shared/               outside both modules
  greet.ts            a function and a type the module imports…
  version.txt         …and a file the module reads at call time
deeper/               one hop further out
  punctuate.ts        imported by shared/greet.ts, named nowhere in app/
```

The module is at `app/`, not at the workspace root: a root module already builds
with every file in the workspace and derives nothing.

## What each scenario shows

**1 — generation.** The imports are read at generation and written into
`app/entrypoint/main.dang` as the member the engine calls:

```dang
pub sources(workspace: Workspace!): Directory! {
  directory
    .withDirectory(workspace.cwd + "/..", workspace.directory("..", include: ["deeper", "shared"], exclude: ["**/.git", "**/node_modules"], gitignore: true))
    .withDirectory(workspace.cwd, workspace.directory(".", exclude: ["**/.git", "**/node_modules"]))
}
```

`deeper` is there without anything in `app/` naming it. **Re-run
`dagger generate` after changing an import** — nothing re-reads the source at
call time.

**2 — the module reaches what it imports.** `greet` calls a function imported
from `../shared`, which calls one in `../deeper`; the `!!` on the answer is how
you can tell the second hop arrived. `version` reads `../shared/version.txt` by a
path relative to the module directory.

**3 — how wide the context is.** The control gets its own directory and nothing
else, and `bare version` fails with `ENOENT`: deriving nothing means reaching
nothing, and reading a file is a `Workspace` argument's job rather than
something derivation is for.

A module that derives *anything*, though, gets its whole context root — see the
defect below. The repository above this workspace stays out either way.

**3b — gitignored paths stay out.** The scenario writes a `.env` and a
`secrets/` at the workspace root, both gitignored, and neither reaches the
container. This is the half of #86's hazard that is genuinely closed: before it,
`workspace.directory("/")` was read without `gitignore`, and a gitignored root
`.env` was readable from inside the module.

**4 — a changed file gives a new cache key.** The scenario rewrites
`shared/version.txt` and calls again. Each `dagger call` is its own session and
`version()` has no cache decorator, so this is where the old behaviour showed:
reading the file from the caller's workspace left it outside everything the call
key covered, and the first answer came back forever. The derived paths are in the
module *digest* now, so the second call runs again.

**5 — a path that leaves the workspace** fails generation, naming the config
behind it. It is a `tsconfig.json` `extends` rather than an import on purpose: an
import is only derived once it resolves to a file that exists, and nothing above
the workspace root is readable by the scan, so no import can reach the refusal.

## The open defect

`include` on the `sources` read has **no effect** on v1.0.0-beta.18. The
generated member asks for `include: ["deeper", "shared"]`, and the module's
context root arrives whole:

```console
$ dagger -m app call siblings
.gitignore
README.md
app
bare
dagger.lock
dagger.toml
deeper
run.sh
shared
```

`exclude` and `gitignore` on the same call *are* applied, and the argument is
accepted rather than rejected as unknown. Narrowed by hand to check whose side it
is on:

| `sources` reads | context |
| --- | --- |
| `.` only (the control) | the module directory alone |
| `.` + `..` with `include: ["deeper", "shared"]` | the whole context root |
| `.` + `..` with `include: ["deeper/**", "shared/**"]` | the whole context root |
| `.` + `..` with `include: ["dagger.toml"]` | the whole context root, `deeper` and `shared` included |

So the engine does narrow when a module derives nothing, and no pattern spelling
narrows the read that reaches outside. Scenario 3 pins both halves — the derived
directories arrive, and so does everything beside them — so whichever way it is
resolved, the change shows up here.

What it costs while it stands: a module's calls are keyed on its whole context
root, so editing this README invalidates `app`'s container. Not an exposure
problem — gitignored paths are still dropped (3b) — but in a monorepo it is the
cold-start cost #86 set out to remove.

## Things worth poking at by hand

```console
# What the container actually gets.
dagger --x-release=v1.0.0-beta.18 -m app call siblings

# Two sessions, no regeneration in between.
dagger --x-release=v1.0.0-beta.18 -m app call version
echo "poke" > shared/version.txt
dagger --x-release=v1.0.0-beta.18 -m app call version

# Add an import and watch the member grow. Generation prints each derived path
# with the import behind it on stderr:
#   derived typescript/include-resources/shared from .../app/src/index.ts
#   derived typescript/include-resources/deeper from .../shared/greet.ts
```

## Known gaps

- **Not tested here:** a real `file:` dependency pointing outside the module
  directory. The install context carries the derived paths, but a hoisted
  npm/pnpm workspace is unexercised.
- **Not tested here:** a Git-sourced module. The context comes from the module's
  own source now, so it should work where reading the caller's workspace could
  not — unverified.
- **Only Node.** Derivation is runtime-independent, and the SDK's own checks
  cover a Deno module importing through a `deno.json` import map, but neither Bun
  nor Deno is exercised here.
- **The context root is the nearest `.git` above the module**, not the workspace
  root — `/workspace/typescript/include-resources/app` is where the module ran.
  Copy `include-resources/` somewhere with no `.git` above it and the root moves
  to the workspace.
- A refused path fails inside a container, so its message is in that exec's log
  rather than the raised error. The script matches on the log text.
