# Architecture

`stream-fork` is a 1→N stream combinator — a single class (`Fork`) that extends Node's `Writable` and duplicates every chunk to N downstream Writables. The package's whole reason to exist is correct backpressure: `Fork._write` only signals "ready for the next chunk" once **every** downstream has consumed the current one, so the slowest fork gates the upstream pipe.

## Project layout

```
package.json                  # Package config; "tape6" section configures test discovery
src/                          # Source code
├── index.js                  # The Fork class (Writable subclass)
└── index.d.ts
tests/                        # Test files (test-*.mjs, helpers.mjs, using tape-six)
.github/                      # CI workflows, Dependabot config
```

There is one source file. The class is small (~95 lines); the public API is the constructor plus two members (`outputs`, `isEmpty()`) plus the static `Fork.fork()` factory.

## The `Fork` class

`Fork` extends `Writable`. The constructor accepts:

- `outputs` — array of downstream Writables.
- `options` — passed through to the `Writable` super-constructor. Default: `{objectMode: true}`. Plus one custom flag:
  - `ignoreErrors` — when truthy, downstream errors are silently dropped and the failing stream is removed from `outputs`. Otherwise, the first error fires `'error'` on the `Fork`.

The constructor wires `'error'` listeners on every downstream:

- A no-op listener (`stream.on('error', () => {})`) on every downstream prevents Node's default uncaught-error handler from crashing the process when a downstream errors before the Fork has wired its own listener.
- When `!ignoreErrors`, a second listener filters the failed stream out of `outputs` and — if writing hasn't started yet — re-emits the error on the `Fork`.

### `_write(chunk, encoding, callback)`

1. Sets `startedWriting = true` (so post-start downstream errors do **not** re-emit on the Fork; they propagate via the per-write Promise instead).
2. Maps each output to a `Promise<error | null>` via `waitForWrite(chunk, encoding)`:
   - Each promise calls `output.write(chunk, encoding, cb)` and resolves with the error (if any). If the inner callback reports an error, the failing output is `null`ed in place in the array.
3. Awaits all promises via `Promise.all` (this is the backpressure gate — the slowest downstream gates the upstream).
4. Runs `processResults(callback)` over the resolved errors. Two modes:
   - **`reportErrors`** (default): if any error, calls `callback(error)` with the first one and filters nulls out of `outputs`. Otherwise `callback(null)`.
   - **`ignoreErrors`**: always `callback(null)`; filters any nulls.

### `_final(callback)`

Same shape as `_write`, but calls `output.end(cb)` on each downstream via `waitForEnd`. Closes every downstream in parallel and waits for all to acknowledge.

### `isEmpty()`

Returns `true` if `outputs.length === 0`. Useful for detecting that every downstream has errored out (in default error mode).

### `Fork.fork(outputs, options)`

Static factory. Returns `new Fork(outputs, options)`. Lets callers write `dataSource.pipe(fork([s1, s2]))` without `new`.

## Backpressure mechanics

Node's `Writable.write(chunk, encoding, callback)` invokes `callback` when the chunk has been consumed (either flushed downstream or accepted into the internal buffer with room to spare). The upstream pipe checks the _return value_ of `write` (false = high-water-mark exceeded, pause) and listens for `'drain'` events to resume.

`Fork` participates in this contract by NOT calling its own `_write` callback until **every** downstream has consumed the chunk. Concretely:

- If 3 of 4 downstreams have callbacks that fire immediately but the 4th sits on its buffer, the Promise.all hangs on the 4th. The Fork's own write-callback hangs until the 4th acks. The upstream pipe receives the deferred ack, sees backpressure, and pauses the source.
- When the slow downstream finally drains, its callback fires, the Promise.all resolves, the Fork's callback runs, and the upstream pipe resumes.

There is no built-in Node primitive for backpressure-preserving fan-out. `Readable.pipe()` is 1:1. Calling `output.write(chunk)` without waiting on its callback discards backpressure entirely. This package is the correct shape: each downstream's callback is what gates the upstream.

## Error handling

Two modes, controlled by `options.ignoreErrors`:

### Default mode (`!ignoreErrors`)

1. Every downstream gets a no-op `'error'` listener + a real listener.
2. The real listener removes the failing stream from `outputs` and — if writing hasn't started — re-emits `'error'` on the `Fork` itself.
3. Errors reported through `write(chunk, encoding, cb)`'s callback path also `null` the slot and trigger the first-error re-emission via `reportErrors`.
4. After the round, `outputs` is filtered to drop nulls. Subsequent writes skip dead downstreams.
5. `'error'` fires **once** on the `Fork` per write-round (the first error wins).

### Ignore mode (`ignoreErrors: true`)

1. Per-stream `'error'` listener installation is skipped for the failure-re-emit case (no-op listener still installed).
2. Errors reported via write-callback `null` the slot.
3. `processResults` does NOT propagate the error to the Fork's callback; it always calls `callback(null)`.
4. `'error'` never fires on the `Fork`.

## Module dependency graph

```
src/index.js → node:stream
```

Zero runtime dependencies. Only `Writable` from Node's built-in `stream` module.

## What is NOT here

- **No 1→1 stream operations.** That's `stream-chain`'s territory.
- **No N→1 combinators.** That's `stream-join`'s territory.
- **No per-output transforms.** Compose them externally: `new Fork([chain([t1, sink1]), chain([t2, sink2])])`.
- **No conditional fan-out.** Every chunk goes to every output. Predicate-based dispatch will land in a future minor as a separate primitive (see queue).
- **No `Symbol.asyncIterator` consumption.** `Fork` is a Writable, not a Readable; it has no read-side surface.
