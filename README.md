# stream-fork [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/stream-fork.svg
[npm-url]: https://npmjs.org/package/stream-fork

> A 1→N stream combinator — a Writable that duplicates every chunk to multiple downstream Writables, propagating backpressure from the slowest downstream. Part of the `stream-chain` / `stream-json` family. Zero runtime dependencies.

The whole point is correct backpressure: `Fork._write` only signals "ready for the next chunk" once every downstream has called back, so the slowest fork gates the upstream pipe. Without that, a slow downstream's buffer would grow unboundedly.

## Installation

```bash
npm i stream-fork
```

Node 22+ required.

## Usage

```js
const Fork = require('stream-fork');
const fs = require('node:fs');
const zlib = require('node:zlib');

const gzip = zlib.createGzip();
gzip.pipe(fs.createWriteStream('log.txt.gz'));

// push data to both the gzip chain and stdout
const forkStream = new Fork([gzip, process.stdout], {});
dataSource.pipe(forkStream);

// now we have data on our screen and as a compressed log file
```

## API

`Fork` is a specialized [Writable](https://nodejs.org/api/stream.html#stream_class_stream_writable) stream. It propagates every chunk to its dependent Writable streams (including [Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform) and [Duplex](https://nodejs.org/api/stream.html#stream_class_stream_duplex) streams).

### Constructor: `new Fork(outputs[, options])`

- `outputs` — array of downstream Writables.
- `options` — passed through to the `Writable` super-constructor. Default: `{objectMode: true}`. Opt out by passing an empty `{}` for chunk mode.
  - `options.ignoreErrors` — when truthy, downstream errors are silently dropped and the failing stream is removed from `outputs`. When falsy (default), the first downstream error is re-emitted on the `Fork`.

```js
const forkObj = new Fork(streams); // object mode (default)
const forkChk = new Fork(streams, {}); // chunk mode (Buffer/string)
```

### Static method: `Fork.fork(outputs[, options])`

Factory equivalent to `new Fork(...)`.

```js
const {fork} = require('stream-fork');
dataSource.pipe(fork([gzip, process.stdout], {}));
```

### Property: `fork.outputs`

The array of downstream Writables. Mutated in place when a downstream errors out (the failing stream is filtered out).

### Method: `fork.isEmpty()`

Returns `true` if `outputs.length === 0`.

For detailed usage docs see the [wiki](https://github.com/uhop/stream-fork/wiki).

## Release History

- 2.0.0 _fleet-conventions refresh: repackaged under `src/`, Node 22+, `tape-six` test runner. Algorithm unchanged._
- 1.0.5 _technical release._
- 1.0.4 _bugfix: forward errors correctly, thx [dbubovych](https://github.com/dbubovych)._
- 1.0.3 _technical release to support Node 14._
- 1.0.2 _workaround for Node 6: use `'finish'` event instead of `_final()`._
- 1.0.1 _improved documentation._
- 1.0.0 _the initial release._
