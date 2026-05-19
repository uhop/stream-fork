# stream-fork [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/stream-fork.svg
[npm-url]: https://npmjs.org/package/stream-fork

> A toolkit of 1→N stream combinators — Writables that distribute every chunk to N downstream Writables under different dispatch shapes, with proper backpressure handling. Three primitives cover the three useful control-flow shapes:

- **`fork`** — broadcast: every chunk to every live output, slowest gates.
- **`route`** — single-target dispatch: per-chunk picker selects one output.
- **`filter`** — subset broadcast: per-output predicates decide who receives.

Zero runtime dependencies. Part of the `stream-chain` / `stream-json` family.

## Installation

```bash
npm i stream-fork
```

Node 22+ required.

## Quick start

```js
const fork = require('stream-fork');
const fs = require('node:fs');
const zlib = require('node:zlib');

const gzip = zlib.createGzip();
gzip.pipe(fs.createWriteStream('log.txt.gz'));

// push data to both the gzip chain and stdout
dataSource.pipe(fork([gzip, process.stdout], {}));
```

## API

### `fork(outputs[, options])`

Broadcast Writable. Every chunk goes to every live output; `Promise.all` over the per-output write callbacks gates upstream backpressure to the slowest downstream.

- `outputs` — array of downstream Writables.
- `options` — Writable options. Default `{objectMode: true}`.
  - `options.ignoreErrors` — when truthy, downstream errors are silently dropped and the failing stream is removed from `outputs`.

```js
const fork = require('stream-fork');

source.pipe(fork([sinkA, sinkB, sinkC]));
```

### `route(outputs, options)`

Per-chunk single-target dispatch.

- `outputs` — non-empty array of downstream Writables.
- `options.pick(chunk, encoding) => number | undefined` — required picker. Returns the index of the output to forward to, or any non-index value to drop the chunk.
- Plus any Writable options and `ignoreErrors`.

```js
const route = require('stream-fork/route.js');

source.pipe(
  route([evenSink, oddSink], {
    pick: chunk => (chunk % 2 === 0 ? 0 : 1)
  })
);
```

### `filter(outputs, options)`

Per-chunk subset broadcast.

- `outputs` — non-empty array of downstream Writables.
- `options.predicates` — array of predicates, one per output (same length).
- Plus any Writable options and `ignoreErrors`.

```js
const filter = require('stream-fork/filter.js');

source.pipe(
  filter([auditSink, errorSink, allSink], {
    predicates: [log => log.audit, log => log.level === 'error', () => true]
  })
);
```

## Picker helpers

```js
const pickRoundRobin = require('stream-fork/utils/pick-round-robin.js');
const pickByHash = require('stream-fork/utils/pick-by-hash.js');
const pickByKey = require('stream-fork/utils/pick-by-key.js');
const pickFirstMatch = require('stream-fork/utils/pick-first-match.js');
```

- **`pickRoundRobin(count)`** — cycles `0..count-1`. Load-balance across N workers.
- **`pickByHash(keyFn, count)`** — stable `hash(key) % count` sharding.
- **`pickByKey(keyFn, table)`** — explicit `key → index` map (object or `Map`).
- **`pickFirstMatch(predicates)`** — first matching predicate's index; append `() => true` for catch-all.

Example: round-robin load balance.

```js
const route = require('stream-fork/route.js');
const pickRoundRobin = require('stream-fork/utils/pick-round-robin.js');

source.pipe(route([worker1, worker2, worker3], {pick: pickRoundRobin(3)}));
```

For detailed usage docs see the [wiki](https://github.com/uhop/stream-fork/wiki).

## Release History

- 2.0.0 _Breaking: functional API (`fork(...)`, no `new`). New primitives `route`, `filter`, plus picker helpers. Node 22+, `src/` layout, `tape-six` test runner._
- 1.0.5 _technical release._
- 1.0.4 _bugfix: forward errors correctly, thx [dbubovych](https://github.com/dbubovych)._
- 1.0.3 _technical release to support Node 14._
- 1.0.2 _workaround for Node 6: use `'finish'` event instead of `_final()`._
- 1.0.1 _improved documentation._
- 1.0.0 _the initial release._
