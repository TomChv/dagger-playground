# driftfeed architecture

`docs/` holds no `deno.json` and sits under no project, so it is the place to
stand when testing the "a directory that belongs to no project" selection rule:

```sh
cd docs && dagger list deno-projects -a   # the four projects below the fixture root
```

## Pieces

| Piece | Kind | Role |
| --- | --- | --- |
| `apps/api` | standalone project | HTTP surface; routing, settings, feed catalog |
| `apps/cli` | standalone project | `driftfeed` command-line entry point |
| `apps/worker` | standalone project | retry/backoff loop over the spool |
| `packages/` | Deno workspace | the shared libraries: `core`, `feed`, `store` |
| `plugins/` | Deno workspace | format sniffers: `rss`, `atom` |
| `tools/janitor` | standalone project | retention sweeps (deliberately broken, see the README) |
| `tools/mirror` | standalone project | on-disk mirror of upstream feeds |

Items flow `plugins/* → packages/feed → packages/core → packages/store`, and
both `apps/api` and `apps/worker` read from the store.
