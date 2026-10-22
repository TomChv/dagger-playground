# Jest suite run by the Dagger jest module

`typescript/native-tests` with the suite rewritten for Jest, so `dagger check` runs it
inside the module's container instead of on the host. Installed: `dagger.io/js/jest`.

```console
NODE_OPTIONS=--experimental-vm-modules npx jest   # host: 4 pass
dagger check --jest                                # in the module's container: 2 pass, 2 fail
```

Jest is the only runner here that cannot load the generated client as shipped.
`jest.config.js` carries four workarounds (haste collision between the two generated
`@dagger.io/dagger` packages, ESM `core.js`, `node_modules` transform, `.js` → `.ts`
resolution), and `dagger.toml` a fifth: the module runs `node_modules/.bin/jest`
directly, so `NODE_OPTIONS` has to go in the module's `environment` setting rather
than the `test` script. See [`report.md`](../../report.md) §11.

The two remaining failures are the shared client bug, §1.
