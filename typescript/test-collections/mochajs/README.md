# mochajs-checkout

A small e-commerce checkout library in TypeScript, tested with [Mocha](https://mochajs.org),
[Chai](https://www.chaijs.com) and [Sinon](https://sinonjs.org). It exists as a realistic
Mocha test collection: several suites, nested `describe` blocks, sync and async tests, fixtures
and hooks, test doubles, and one pending test.

## Layout

```
src/
  pricing/money.ts                  integer-cent Money value object (arithmetic, allocation, formatting)
  pricing/coupons.ts                coupon book with expiry, minimum subtotal and redemption limits
  catalog/                          products and a sku-indexed catalog
  cart/cart.ts                      cart lines, subtotal and per-line tax
  inventory/inventory-service.ts    async stock levels with reserve / release / commit
  orders/                           order model, repository port and in-memory adapter
  checkout/checkout-service.ts      orchestrates coupon, stock, payment and persistence
  support/                          clock and id-generator seams for tests
test/
  setup.ts                          registers chai-as-promised, root afterEach restores sinon
  helpers/fixtures.ts               products, stock, coupons, fake payment gateway, harness
  <mirrors src>/*.test.ts           one suite per module
```

`CheckoutService` is the piece worth reading: it quotes the coupon, reserves every line, charges
the gateway, then commits the reservations and redeems the coupon — releasing the stock again if
the payment is declined or a later line is out of stock.

## Running

```sh
npm install
npm test              # mocha, via tsx — no build step
npm run test:watch
npm run coverage      # c8, thresholds in .c8rc.json
npm run typecheck
npm run build
```

Mocha is configured in [`.mocharc.json`](./.mocharc.json). TypeScript sources run straight from
`test/**/*.test.ts` through the [`tsx`](https://tsx.is) ESM loader (`--node-option import=tsx`).

## Suites

| Suite | Covers |
| --- | --- |
| `test/pricing/money.test.ts` | construction, arithmetic, allocation, comparison, formatting |
| `test/pricing/coupons.test.ts` | registration, quoting, expiry, redemption limits (sinon fake timers) |
| `test/catalog/catalog.test.ts` | registration, lookup, category filtering |
| `test/cart/cart.test.ts` | line management, per-line tax rounding, totals |
| `test/inventory/inventory-service.test.ts` | async reserve / release / commit, oversell, concurrency |
| `test/checkout/checkout-service.test.ts` | happy path, coupons, declines, gateway failures, rollback |
| `test/support/clock.test.ts`, `test/support/ids.test.ts` | the injectable seams |
