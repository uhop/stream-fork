# Architecture

`stream-fork` is a toolkit of 1→N stream combinators — functions that take an array of downstream `Writable` streams and return a single `Writable` that distributes incoming chunks across them under a particular dispatch shape. Three primitives cover the three useful control-flow shapes: `fork` (every chunk → every output), `route` (every chunk → one picked output), `filter` (every chunk → a predicate-selected subset). All three share a single internal piece of infrastructure (the stream pusher) and forward backpressure correctly by gating their own `_write` callback on the receiving downstreams' completions.

## Project layout

```
package.json                  # Package config; "tape6" section configures test discovery
src/                          # Source code
├── index.js                  # Entry point; re-exports fork as the default
├── index.d.ts
├── fork.js                   # Main component: broadcast to every live output
├── fork.d.ts
├── route.js                  # Main component: per-chunk picker → one output
├── route.d.ts
├── filter.js                 # Main component: per-chunk predicate per output → subset
├── filter.d.ts
├── stream-pusher.js          # Internal: Promise-based wrapper over Writable
├── stream-pusher.d.ts
└── utils/                    # Picker helpers users compose into route
    ├── pick-round-robin.js   # Cycles 0..N-1
    ├── pick-round-robin.d.ts
    ├── pick-by-hash.js       # hash(keyFn(chunk)) % N — stable sharding
    ├── pick-by-hash.d.ts
    ├── pick-by-key.js        # keyFn(chunk) → table[key] — explicit routing
    ├── pick-by-key.d.ts
    ├── pick-first-match.js   # First true predicate's index — priority routing
    └── pick-first-match.d.ts
tests/                        # Test files (test-*.mjs using tape-six)
wiki/                         # GitHub wiki documentation (git submodule)
.github/                      # CI workflows, Dependabot config
```

The split between `src/` root and `src/utils/` is structural: **main components and shared internal infrastructure** stay at root; **helpers users compose with main components** go under `utils/`. Per fleet convention (mirrors `stream-chain` and `stream-join` `src/` layouts).

## Main components

### `fork(outputs, options?)`

**Control flow:** broadcast. Every incoming chunk is forwarded to every live downstream concurrently via `Promise.all` over the pushers' `push(chunk, encoding)` calls. The promise resolves when **every** downstream has acknowledged the write, at which point `_write`'s callback fires and upstream is signalled "ready for the next chunk". The slowest downstream gates upstream — exactly the backpressure shape Node's pipe contract expects.

**Backpressure shape:** every receiving output gates upstream.

### `route(outputs, options)`

**Control flow:** single-target dispatch. For each incoming chunk, `options.pick(chunk, encoding)` returns the index of the output to forward to. Valid indices in `[0, outputs.length)` pointing at a live output trigger the write; any non-index value (`undefined`, `null`, `NaN`, negative, out-of-range, non-integer) — or pointing at a dead slot — drops the chunk silently.

**Backpressure shape:** only the picked output gates upstream; the other outputs are inert for this round.

### `filter(outputs, options)`

**Control flow:** subset broadcast. `options.predicates` is an array of predicates, one per output. For each chunk, every output whose predicate returns truthy receives the chunk; the rest skip this round. An all-true mask is equivalent to `fork`; an all-false mask drops the chunk.

**Backpressure shape:** the slowest of the selected subset gates upstream. If zero outputs match, the chunk is dropped and upstream isn't blocked.

## The shared stream pusher

`src/stream-pusher.js` is the internal substrate every main component uses. Given a Writable, it returns `{push, end, isDead, stream}`:

- `push(chunk, encoding)` returns `Promise<Error | null>` — resolves to the error from `stream.write(chunk, encoding, cb)`'s callback, or any sync throw from `stream.write`. Resolves immediately with the stored error if the stream has already died.
- `end()` is symmetric, wrapping `stream.end(cb)`.
- `isDead()` is `true` once any error has been observed via callback, sync throw, or the stream's own `'error'` event.
- `stream` exposes the wrapped Writable so the outer primitives can attach additional listeners (the default-mode pre-write `'error'` re-emission listener).

**Why it exists.** Each main component needs the same per-stream concerns: Promise-wrap the write/end callbacks, gate dead streams out of subsequent writes, prevent Node from crashing on otherwise-unhandled `'error'` events. Centralizing keeps the three primitives' source files compact and parallel. Mirror of stream-join's `makeStreamPuller` pattern (read-side, returns `{next, close}`).

**Not exported publicly.** The contract may change between minor releases; callers should use the main components.

## Picker helpers (`src/utils/`)

All helpers produce a `pick` function for `route()`'s `options.pick`.

- **`pickRoundRobin(count)`** — cycles `0, 1, …, count-1` on each call. Pair with `route` for load-balancing across N parallel workers.
- **`pickByHash(keyFn, count)`** — returns a picker that maps each chunk to a stable index via `hash(keyFn(chunk)) % count`. Same key always lands on the same output. djb2 hash internally; numeric keys are used directly modulo `count`.
- **`pickByKey(keyFn, table)`** — returns a picker that looks up `keyFn(chunk)` in `table` (plain object or `Map`) and returns the mapped index, or `undefined` to drop the chunk if the key is missing.
- **`pickFirstMatch(predicates)`** — returns a picker that tries each predicate in order and returns the index of the first one to match, or `undefined` if none match. Append `() => true` to act as a catch-all.

## Module dependency graph

```
src/index.js → src/fork.js
src/fork.js, src/route.js, src/filter.js
        ↓
   src/stream-pusher.js (internal)
        ↓
   node:stream (Writable)

src/utils/pick-round-robin.js   (no deps)
src/utils/pick-by-hash.js       (no deps)
src/utils/pick-by-key.js        (no deps)
src/utils/pick-first-match.js   (no deps)
```

Zero runtime dependencies.

## Backpressure

Push-based, gated by the receiving downstreams:

- Each primitive is a Writable. The upstream pipe calls `_write(chunk, encoding, cb)` and expects `cb` to fire once the chunk has been consumed.
- The primitive forwards the chunk to the receiving downstreams via their pushers' `push(chunk, encoding)`. Each `push` resolves when the downstream's `write` callback fires.
- `_write` only calls its own `cb` once `Promise.all` over the receiving pushers' `push` promises resolves. The upstream pipe sees the deferred ack as backpressure.
- The slowest of the receiving downstreams gates upstream. For `fork`, that's every live output. For `route`, the single picked one. For `filter`, the selected subset.

No buffering is added between layers.

## Error handling

Errors propagate end-to-end with the original value preserved. Two modes, controlled by `options.ignoreErrors`.

### Default mode (`!ignoreErrors`)

1. The pusher's per-stream `'error'` listener captures the error and marks the pusher dead.
2. Pre-write only (before any `_write` has been called), each primitive has its own per-stream `'error'` listener that re-emits the error on the primitive itself.
3. Post-write start, the error surfaces through the per-push promise: `push(chunk, encoding)` resolves with the error, and `_write` forwards the first error in its round to its own `cb` (which surfaces as `'error'` on the primitive via the Writable contract).
4. Dead pushers' streams are excluded from subsequent writes via the live-pusher filter at the top of `_write`.

### Ignore mode (`ignoreErrors: true`)

1. The pusher's per-stream `'error'` listener still captures and marks dead.
2. The pre-write re-emission listener is not installed.
3. `_write` calls its `cb(null)` regardless of round errors — the error is swallowed and the failing downstream is filtered out.
4. `'error'` never fires on the primitive in this mode.

## Testing

- **Framework:** `tape-six` (`tape6`).
- **Run all:** `npm test` (parallel workers via `tape6 --flags FO`).
- **Run single file:** `node tests/test-<name>.mjs`.
- **Run with Bun:** `npm run test:bun`.
- **Run with Deno:** `npm run test:deno`.
- **TypeScript check:** `npm run ts-check`.
- **`tsc --checkJs` against the JS sources:** `npm run js-check`.
- **Lint:** `npm run lint` (Prettier check).
- **Lint fix:** `npm run lint:fix` (Prettier write).

## Import paths

```js
// Default (fork)
const fork = require('stream-fork');
const fork = require('stream-fork/fork.js');

// Other main components
const route = require('stream-fork/route.js');
const filter = require('stream-fork/filter.js');

// Picker helpers
const pickRoundRobin = require('stream-fork/utils/pick-round-robin.js');
const pickByHash = require('stream-fork/utils/pick-by-hash.js');
const pickByKey = require('stream-fork/utils/pick-by-key.js');
const pickFirstMatch = require('stream-fork/utils/pick-first-match.js');
```

The default export remains `fork` (also accessible as `require('stream-fork')`) for back-compat with 1.x callers who imported the constructor under the name `Fork`.

## What is NOT here

- **No 1→1 stream operations.** That's `stream-chain`'s territory.
- **No N→1 combinators.** That's `stream-join`'s territory.
- **No per-output transforms.** Compose them externally: `fork([chain([t1, sink1]), chain([t2, sink2])])`.
- **No speculative race-fork (cancel-rest semantics).** Node streams aren't cancellable; the primitive would not be implementable cleanly.
- **No lossy fork (slow outputs drop).** Inverts the project's whole thesis (backpressure preservation). Build a non-blocking sink wrapper externally if needed.
- **No `[Symbol.asyncIterator]()` consumption.** All primitives are Writables, not Readables — there is no read-side surface.
