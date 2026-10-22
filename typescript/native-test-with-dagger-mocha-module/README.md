# Mocha suite run by the Dagger mochajs module

`typescript/native-tests` with the suite rewritten for Mocha, so `dagger check` runs
it inside the module's container instead of on the host. Installed:
`dagger.io/js/mocha`.

```console
npx mocha                     # host: 4 passing
dagger check --mochajs         # in the module's container: 2 passing, 2 failing
```

TypeScript comes from `tsx`, loaded through `.mocharc.json` `node-option` — no
transform config needed, unlike jest. The two failures are the shared client bug:
see [`report.md`](../../report.md) §1.

Mocha's reporter output arrives as raw log lines rather than structured per-test
rows, so a tally needs `dagger check --mochajs` without filtering the output.
