# stream-fork [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/stream-fork.svg
[npm-url]: https://npmjs.org/package/stream-fork

> A toolkit of 1→N stream combinators — sinks that distribute every chunk to N downstream sinks under different dispatch shapes, with proper backpressure handling. Three primitives cover the three useful control-flow shapes:

- **`fork`** — broadcast: every chunk to every live output, slowest gates.
- **`route`** — single-target dispatch: per-chunk picker selects one output.
- **`filter`** — subset broadcast: per-output predicates decide who receives.

Available in two flavors that share the same options surface: **Node Streams** (the default `stream-fork` entry) and **Web Streams** (`stream-fork/web`). Zero runtime dependencies. Part of the `stream-chain` / `stream-json` family.

## Installation

```bash
npm i stream-fork
```

Node 22+ required (or any host with a `WritableStream` global for the Web variant — modern browsers, Deno 2+, Bun 1+).

## Quick start (Node Streams)

```js
import fork from 'stream-fork';
import fs from 'node:fs';
import zlib from 'node:zlib';

const gzip = zlib.createGzip();
gzip.pipe(fs.createWriteStream('log.txt.gz'));

// push every chunk to both the gzip chain and stdout
dataSource.pipe(fork([gzip, process.stdout]));
```

## Quick start (Web Streams)

```js
import fork from 'stream-fork/web';

// dataSource is a ReadableStream, sinkA/B are WritableStreams
await dataSource.pipeTo(fork([sinkA, sinkB]));
```

The Web `fork` is a backpressure-preserving generalization of `ReadableStream.tee()` to N outputs — unlike `tee`, it does not buffer per branch (a slow branch slows upstream rather than ballooning a queue).

## API

The Node and Web primitives share the same options surface. Replace `Writable[]` with `WritableStream[]` in the signatures below for the Web flavor.

### `fork(outputs[, options])`

Broadcast sink. Every chunk goes to every live output; `Promise.all` over the per-output writes gates upstream backpressure to the slowest downstream.

- `outputs` — array of downstream sinks.
- `options` — Writable options (Node) or `{queuingStrategy}` (Web). Default `{objectMode: true}` on Node.
  - `options.ignoreErrors` — when truthy, downstream errors are silently dropped and the failing stream is removed from `outputs`.

```js
import fork from 'stream-fork';
source.pipe(fork([sinkA, sinkB, sinkC]));
```

### `route(outputs, options)`

Per-chunk single-target dispatch.

- `outputs` — non-empty array of downstream sinks.
- `options.pick(chunk[, encoding]) => number | undefined` — required picker. Returns the index of the output to forward to, or any non-index value to drop the chunk.
- Plus any inner-stream options and `ignoreErrors`.

```js
import route from 'stream-fork/route.js';

source.pipe(
  route([evenSink, oddSink], {
    pick: chunk => (chunk % 2 === 0 ? 0 : 1)
  })
);
```

### `filter(outputs, options)`

Per-chunk subset broadcast.

- `outputs` — non-empty array of downstream sinks.
- `options.predicates` — array of predicates, one per output (same length).
- Plus any inner-stream options and `ignoreErrors`.

```js
import filter from 'stream-fork/filter.js';

source.pipe(
  filter([auditSink, errorSink, allSink], {
    predicates: [log => log.audit, log => log.level === 'error', () => true]
  })
);
```

## Picker helpers

Shared between the Node and Web trees — pure functions, no runtime imports.

```js
import pickRoundRobin from 'stream-fork/utils/pick-round-robin.js';
import pickByHash from 'stream-fork/utils/pick-by-hash.js';
import pickByKey from 'stream-fork/utils/pick-by-key.js';
import pickFirstMatch from 'stream-fork/utils/pick-first-match.js';
```

- **`pickRoundRobin(count)`** — cycles `0..count-1`. Load-balance across N workers.
- **`pickByHash(keyFn, count)`** — stable `hash(key) % count` sharding.
- **`pickByKey(keyFn, table)`** — explicit `key → index` map (object or `Map`).
- **`pickFirstMatch(predicates)`** — first matching predicate's index; append `() => true` for catch-all.

Example: round-robin load balance (Web variant).

```js
import route from 'stream-fork/web/route.js';
import pickRoundRobin from 'stream-fork/utils/pick-round-robin.js';

await source.pipeTo(route([worker1, worker2, worker3], {pick: pickRoundRobin(3)}));
```

For detailed usage docs see the [wiki](https://github.com/uhop/stream-fork/wiki).

## Release History

- 3.0.0 _Breaking: ESM-only (`"type": "module"`). New Web Streams flavor at `stream-fork/web`. Tests restructured into `tests/node/` + `tests/web/`; added browser tests via `tape-six-playwright`._
- 2.0.0 _Breaking: functional API (`fork(...)`, no `new`). New primitives `route`, `filter`, plus picker helpers. Node 22+, `src/` layout, `tape-six` test runner._
- 1.0.5 _technical release._
- 1.0.4 _bugfix: forward errors correctly, thx [dbubovych](https://github.com/dbubovych)._
- 1.0.3 _technical release to support Node 14._
- 1.0.2 _workaround for Node 6: use `'finish'` event instead of `_final()`._
- 1.0.1 _improved documentation._
- 1.0.0 _the initial release._
