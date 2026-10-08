# collections-projected-list — an item type that exists only through `get`

A Go module reproducing [dagger/dagger#14447](https://github.com/dagger/dagger/pull/14447)
(`fix: include a collection's projected types in currentTypeDefs`) on engine `v1.0.0-beta.15`,
and verifying the fix against a dev engine built from the PR branch.

## The bug

`TypeDef.asObject` projects a collection on read — a consumer sees `keys`, a synthesized `list`,
`get` and `subset` — but `expandTypeDefClosure` walked the author's definition only. The projected
`list` field is the only thing that mentions `[CollectionsItem]`, so unless the author happened to
write a function returning a list of the item type, that typedef never entered
`currentTypeDefs(returnAllTypes: true)`. `dagger call` resolves every return type in the command
tree up front, so every call into the collection failed before running anything, `--help` included:

```
! load return type for function "list": typedef "[CollectionsItem]" not found in currentTypeDefs(returnAllTypes: true)
```

## Layout

`collections/main.go` declares three collections; the *shape* is the test.

| Collection | Item | Reached through | Why it is there |
| --- | --- | --- | --- |
| `Items` (`+keys Names`, `+get Lookup`) | `Item` | `get` only | the bug: no author member mentions `[Item]` |
| `Parts`, under `Item.parts` | `Part` | `get` only | a nested collection in the same situation |
| `Letters` | `Letter` | `get` and `All() []*Letter` | control: the author's own list already put `[Letter]` in the closure, so it worked before the fix |

`Items.Selected` is an author function the projection hides (a consumer reaches it through
`batch`), which is why the fix walks both the author definition and the projection.

`dagger.toml` makes `collections` the workspace entrypoint, so both `dagger call items …` and
`dagger -m ./collections call items …` are covered. `queries/list.graphql` is the GraphQL control.
`test.sh` runs the matrix below: every case states the exit status it expects, and the summary
counts the disagreements.

## Run

Against a dev engine built from a dagger/dagger checkout — run from that checkout, since the
playground builds the CLI and engine from it (≈13 min, almost all of it the build):

```console
dagger --engine=cloud --x-release=v1.0.0-beta.15 api call playground \
  with-directory --path=/home/testdir --source=<absolute path to this directory> \
  with-exec --args=sh,/home/testdir/test.sh --expect=ANY stdout
```

Swap the last line for `terminal` to poke at it by hand: `sh /home/testdir/test.sh`, or
`env -u DAGGER_SESSION_PORT -u DAGGER_SESSION_TOKEN dagger …` for single commands — the exec
inherits a session to the outer engine, and the CLI prefers it over the dev engine.

Against a released engine, from this directory:

```console
DAGGER_ENGINE=cloud DAGGER="dagger --x-release=v1.0.0-beta.15" sh test.sh
```

## Results — 2026-10-08

Stock: `v1.0.0-beta.15` (`cbf69413`). Fixed: dev build of dagger/dagger `2ba3bdb4`, the head of
#14447 (reports itself as `v1.0.0-beta.17`).

| Case | Command | beta.15 | #14447 |
| --- | --- | --- | --- |
| items-keys-module | `-m ./collections call items keys` | ✘ typedef not found | ✔ `b a c` |
| items-keys-entrypoint | `call items keys` | ✘ | ✔ `b a c` |
| items-list | `call items list` | ✘ | ✔ 3 × `CollectionsItem@…` |
| items-get | `call items get --key=a name` | ✘ | ✔ `item:a` |
| items-subset | `call items subset --keys=a,c keys` | ✘ | ✔ `a c` |
| items-help | `call items --help` | ✘ dies right after `USAGE` | ✔ `batch get keys list subset` |
| parts-keys | `call items get --key=a parts keys` | ✘ | ✔ `left right` |
| parts-list | `call items get --key=a parts list` | ✘ | ✔ 2 × `CollectionsPart@…` |
| parts-get | `call items get --key=a parts get --key=left name` | ✘ | ✔ `left` |
| letters-keys / -list / -get | `call letters …` (control) | ✔ | ✔ |
| script-keys | `-m ./collections -c 'items \| keys'` | ✔ | ✔ |
| script-list | `-m ./collections -c 'items \| list'` | ✘ typedef not found | ✔ |
| script-get | `-m ./collections -c 'items \| get a \| name'` | ✔ | ✔ |
| graphql-list | `api query -m ./collections < queries/list.graphql` | ✔ | ✔ |
| artifacts / artifacts-items | `list`, `list collections-items -a` | ✔ | ✔ |
| subset-unknown-key | `call items subset --keys=zzz keys` | ✘ typedef not found | ✘ `collection "CollectionsItems" does not contain keys ["zzz"] in the current subset` |
| get-missing-key | `call items get name` | ✘ typedef not found | ✘ `required flag(s) "key" not set` |

Summary lines: beta.15 `9 passed, 2 failed as expected, 10 unexpected`;
#14447 `19 passed, 2 failed as expected, 0 unexpected`.

Reading the two columns:

- `dagger call` resolves the whole command tree, so on beta.15 everything under `items` fails,
  including the two cases that should fail for their own reason; the fix restores the real errors.
- `-c` scripts resolve types lazily: only `items | list` touches `[CollectionsItem]`, so `keys` and
  `get` already worked.
- GraphQL and `dagger list` never consult the closure, so they pass either way — which is why the
  existing integration coverage (`daggerQueryAt`, `dagger list`) missed this.
- The nested `Parts` collection is in the same situation as `Items` and is fixed by the same walk.

Not covered: a dependent module generated against this one through SDK codegen (the TypeScript
consumer this was found with, dagger/typescript-sdk#63).
