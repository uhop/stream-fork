# Architecture

`stream-fork` is a toolkit of 1→N stream combinators — functions that take an array of downstream streams and return a single stream that distributes incoming chunks across them under a particular dispatch shape. Three primitives cover the three useful control-flow shapes: `fork` (every chunk → every output), `route` (every chunk → one picked output), `filter` (every chunk → a predicate-selected subset). Each primitive ships in two flavors that share the same API surface but wrap different stream APIs: **Node Streams** (`stream-fork`, default entry) and **Web Streams** (`stream-fork/web`).

Both flavors share a common pattern: an internal _pusher_ wraps each downstream into a Promise-based interface (`push(chunk)` → `Error | null`), and the primitive's `write` callback gates upstream backpressure on `Promise.all` over the _receiving_ downstreams' pushes. Picker helpers under `src/utils/` are pure functions used by callers to construct `route`'s `pick` argument; they are runtime-neutral and shared across both trees.

## Project layout

```
package.json                         # Package config; "tape6" section configures test discovery
src/                                 # Source code (ESM, "type": "module")
├── index.js / index.d.ts            # Node entry; default = fork, named = {fork, route, filter}
├── fork.js / fork.d.ts              # Node Writable wrapper
├── route.js / route.d.ts            # Node Writable wrapper
├── filter.js / filter.d.ts          # Node Writable wrapper
├── stream-pusher.js / .d.ts         # Internal: Promise-based wrapper over Writable
├── utils/                           # Picker helpers (pure; runtime-neutral; shared)
│   ├── pick-round-robin.js / .d.ts  # Cycles 0..N-1
│   ├── pick-by-hash.js / .d.ts      # hash(keyFn(chunk)) % N — stable sharding
│   ├── pick-by-key.js / .d.ts       # keyFn(chunk) → table[key] — explicit routing
│   └── pick-first-match.js / .d.ts  # First-true predicate's index — priority routing
└── web/                             # Web Streams variant (mirrors src/ root)
    ├── index.js / .d.ts             # Web entry; default = fork, named = {fork, route, filter}
    ├── fork.js / .d.ts              # Web WritableStream wrapper
    ├── route.js / .d.ts             # Web WritableStream wrapper
    ├── filter.js / .d.ts            # Web WritableStream wrapper
    └── web-stream-pusher.js / .d.ts # Internal: Promise-based wrapper over WritableStream
tests/                               # Test files (test-*.js, using tape-six)
├── helpers.js                       # Node-only test helpers (imports node:stream)
├── web-helpers.js                   # Web Streams test helpers (no Node imports)
├── node/                            # Node Streams tests (Node + Bun + Deno)
└── web/                             # Web Streams tests + pure picker tests (also in browser)
wiki/                                # GitHub wiki documentation (git submodule)
.github/                             # CI workflows, Dependabot config
```

The Node primitives at `src/<comp>.js` and the Web primitives at `src/web/<comp>.js` both delegate to a stream-specific pusher (`makeStreamPusher` / `makeWebStreamPusher`) and apply the same dispatch logic. The split between `src/` root and `src/utils/` is structural: **main components and shared internal infrastructure** stay at root; **helpers users compose with main components** go under `utils/`. The same split applies to `src/web/` for the Web variants.

## Main components

The two flavors are intentionally symmetric. Read each subsection in pairs: Node first, then Web.

### `fork(outputs, options?)`

**Control flow:** broadcast. Every incoming chunk is forwarded to every live downstream concurrently via `Promise.all` over the pushers' `push(chunk, encoding)` calls. The promise resolves when **every** downstream has acknowledged the write; only then does the primitive's `write` callback fire and upstream is signalled "ready for the next chunk". The slowest downstream gates upstream.

- **Node:** input array is `Writable[]`; return is a `Writable`. `push(chunk, encoding)` calls `stream.write(chunk, encoding, cb)` and resolves on the callback. Backpressure shape matches Node's `pipe` contract.
- **Web:** input array is `WritableStream[]`; return is a `WritableStream`. `push(chunk)` awaits `writer.ready` then `writer.write(chunk)`. Effectively a generalized `ReadableStream.tee()` — but unlike `tee`, **does not buffer per branch** (a slow branch slows upstream rather than ballooning a per-branch queue).

### `route(outputs, options)`

**Control flow:** single-target dispatch. For each incoming chunk, `options.pick(chunk, encoding)` returns the index of the output to forward to. Valid indices in `[0, outputs.length)` pointing at a live output trigger the write; any non-index value (`undefined`, `null`, `NaN`, negative, out-of-range, non-integer) — or pointing at a dead slot — drops the chunk silently.

**Backpressure shape:** only the picked output gates upstream; the other outputs are inert for this round.

- **Node:** Writable in / `Writable[]` out. Picker receives `(chunk, encoding)`.
- **Web:** WritableStream in / `WritableStream[]` out. Picker receives `(chunk)` (no encoding hint — Web Streams don't carry one).

### `filter(outputs, options)`

**Control flow:** subset broadcast. `options.predicates` is an array of predicates, one per output. For each chunk, every output whose predicate returns truthy receives the chunk; the rest skip this round. An all-true mask is equivalent to `fork`; an all-false mask drops the chunk.

**Backpressure shape:** the slowest of the selected subset gates upstream. If zero outputs match, the chunk is dropped and upstream isn't blocked.

- **Node:** Predicate signature `(chunk, encoding) => boolean`.
- **Web:** Predicate signature `(chunk) => boolean`.

## The shared pushers

Each primitive needs the same per-stream concerns: Promise-wrap the per-chunk write / final close, gate dead streams out of subsequent writes, prevent the host from crashing on otherwise-unhandled errors. Both flavors implement this via a small internal helper.

### `makeStreamPusher(stream)` — Node side

`src/stream-pusher.js`. Given a `Writable`, returns `{push, end, isDead, stream}`:

- `push(chunk, encoding)` → `Promise<Error | null>` — resolves to the error from `stream.write(chunk, encoding, cb)`'s callback, or any sync throw from `stream.write`. Resolves immediately with the stored error if the stream has already died.
- `end()` is symmetric, wrapping `stream.end(cb)`.
- `isDead()` is `true` once any error has been observed via callback, sync throw, or the stream's own `'error'` event.
- `stream` exposes the wrapped `Writable` so the outer primitives can attach additional listeners (the default-mode pre-write `'error'` re-emission listener).

### `makeWebStreamPusher(stream)` — Web side

`src/web/web-stream-pusher.js`. Given a `WritableStream`, returns the same `{push, end, isDead, stream}` shape:

- Acquires a writer via `stream.getWriter()` once. Sync throws (e.g., the writer is already locked) mark the pusher dead.
- Listens on `writer.closed` for asynchronously-surfaced errors (the Web Streams analog of a Node `'error'` event). A rejection marks dead and stores the reason.
- `push(chunk)` awaits `writer.ready` then `writer.write(chunk)`. Rejections resolve to the error and mark dead.
- `end()` awaits `writer.close()`. Same dead-on-reject semantics.

Both pushers are internal — the contract may change between minor releases; callers should use the main components.

## Picker helpers (`src/utils/`)

All helpers produce a `pick` function for `route()`'s `options.pick`. Pure functions, no runtime imports, work as-is in Node, Bun, Deno, and browsers.

- **`pickRoundRobin(count)`** — cycles `0, 1, …, count-1` on each call. Pair with `route` for load-balancing across N parallel workers.
- **`pickByHash(keyFn, count)`** — returns a picker that maps each chunk to a stable index via `hash(keyFn(chunk)) % count`. Same key always lands on the same output. djb2 hash internally; numeric keys are used directly modulo `count`.
- **`pickByKey(keyFn, table)`** — returns a picker that looks up `keyFn(chunk)` in `table` (plain object or `Map`) and returns the mapped index, or `undefined` to drop the chunk if the key is missing.
- **`pickFirstMatch(predicates)`** — returns a picker that tries each predicate in order and returns the index of the first one to match, or `undefined` if none match. Append `() => true` to act as a catch-all.

## Module dependency graph

```
src/index.js → src/fork.js
src/{fork,route,filter}.js
        ↓
   src/stream-pusher.js (internal)
        ↓
   node:stream (Writable)

src/web/index.js → src/web/fork.js
src/web/{fork,route,filter}.js
        ↓
   src/web/web-stream-pusher.js (internal)
        ↓
   global WritableStream (Web Streams API)

src/utils/pick-round-robin.js   (no deps)
src/utils/pick-by-hash.js       (no deps)
src/utils/pick-by-key.js        (no deps)
src/utils/pick-first-match.js   (no deps)
```

Zero runtime dependencies. The Web tree never imports `node:*`, so it bundles cleanly into a browser; the Node tree never imports Web Streams (it uses `node:stream`'s `Writable` directly), so it works on legacy hosts without a `WritableStream` global.

## Backpressure

Push-based, gated by the receiving downstreams. The Node and Web variants implement the same logical pattern through their respective stream contracts.

### Node side

- Each primitive is a `Writable`. The upstream pipe calls `_write(chunk, encoding, cb)` and expects `cb` to fire once the chunk has been consumed.
- The primitive forwards the chunk to the receiving downstreams via their pushers' `push(chunk, encoding)`. Each `push` resolves when the downstream's `write` callback fires.
- `_write` only calls its own `cb` once `Promise.all` over the receiving pushers' `push` promises resolves. The upstream pipe sees the deferred ack as backpressure.

### Web side

- Each primitive is a `WritableStream`. The upstream `pipeTo` waits for our underlying sink's `write` to resolve before producing the next chunk.
- The primitive forwards the chunk to the receiving downstreams via their pushers' `push(chunk)`. Each `push` awaits `writer.ready` (per-stream backpressure) then `writer.write(chunk)`.
- The sink's `write` resolves only once `Promise.all` over the receiving pushers' `push` promises resolves. Upstream sees the deferred resolution as backpressure.

In both flavors, the slowest of the receiving downstreams gates upstream. For `fork`, that's every live output. For `route`, the single picked one. For `filter`, the selected subset. No buffering is added between layers.

## Error handling

Errors propagate end-to-end with the original value preserved. Two modes, controlled by `options.ignoreErrors`.

### Default mode (`!ignoreErrors`)

**Node:**

1. The pusher's per-stream `'error'` listener captures the error and marks the pusher dead.
2. Pre-write only (before any `_write` has been called), each primitive has its own per-stream `'error'` listener that re-emits the error on the primitive itself.
3. Post-write start, the error surfaces through the per-push promise: `push(chunk, encoding)` resolves with the error, and `_write` forwards the first error in its round to its own `cb` (which surfaces as `'error'` on the primitive via the Writable contract).
4. Dead pushers' streams are excluded from subsequent writes via the live-pusher filter at the top of `_write`.

**Web:**

1. The pusher's `writer.closed.catch` listener captures asynchronously-surfaced errors and marks the pusher dead.
2. A failed `writer.write(chunk)` resolves the per-push promise with the rejection reason. The first error in the round is rethrown from our sink's `write` callback, which rejects upstream's `pipeTo` promise (the Web Streams analog of `'error'`).
3. Dead pushers' streams are excluded from subsequent writes via the same live-pusher filter as the Node side.

### Ignore mode (`ignoreErrors: true`)

Same pattern in both flavors. The pusher's "dead" flag still gets set; the round-error handling collapses to "swallow and resolve `null`" (Node) / "return without rethrow" (Web); pre-write re-emission is not installed (Node only — Web Streams have no event-emitter analog). The failing downstream is filtered out of subsequent writes.

## Testing

- **Framework:** `tape-six` (`tape6`).
- **Run all (Node):** `npm test` (parallel workers via `tape6 --flags FO`).
- **Run all (Bun):** `npm run test:bun`.
- **Run all (Deno):** `npm run test:deno`.
- **Run all (browser via Playwright):** `npm run test:browser` — runs the browser-runnable subset (everything under `tests/web/`) in headless Chromium.
- **Run single file:** `node tests/<node|web>/test-<name>.js`.
- **TypeScript check:** `npm run ts-check`.
- **`tsc --checkJs` against the JS sources:** `npm run js-check`.
- **Lint:** `npm run lint` (Prettier check).
- **Lint fix:** `npm run lint:fix` (Prettier write).

The `tape6.tests` glob (`/tests/web/test-*.js`) is the browser-runnable set; `tape6.cli` (`/tests/node/test-*.js`) is the Node-only set. Pure picker tests live under `tests/web/` because they're browser-runnable; they exercise the runtime-neutral helpers under `src/utils/`.

## Import paths

### Node Streams

```js
// Default (fork)
import fork from 'stream-fork';
import fork from 'stream-fork/fork.js';

// Named primitives from the top-level entry
import {fork, route, filter} from 'stream-fork';

// Or by full path
import route from 'stream-fork/route.js';
import filter from 'stream-fork/filter.js';
```

### Web Streams

```js
// Default (fork)
import fork from 'stream-fork/web';

// Named primitives from the web entry
import {fork, route, filter} from 'stream-fork/web';

// Or by full path
import fork from 'stream-fork/web/fork.js';
import route from 'stream-fork/web/route.js';
import filter from 'stream-fork/web/filter.js';
```

### Picker helpers (shared)

```js
import pickRoundRobin from 'stream-fork/utils/pick-round-robin.js';
import pickByHash from 'stream-fork/utils/pick-by-hash.js';
import pickByKey from 'stream-fork/utils/pick-by-key.js';
import pickFirstMatch from 'stream-fork/utils/pick-first-match.js';
```

The default export at the top-level remains `fork` for back-compat (`import fork from 'stream-fork'`); the same pattern carries over to the Web entry (`import fork from 'stream-fork/web'`).

## What is NOT here

- **No 1→1 stream operations.** That's `stream-chain`'s territory.
- **No N→1 combinators.** That's `stream-join`'s territory.
- **No per-output transforms.** Compose them externally: `fork([chain([t1, sink1]), chain([t2, sink2])])`.
- **No speculative race-fork (cancel-rest semantics).** Node streams aren't cancellable; on the Web side `WritableStream.abort()` exists but a partial-write abort during a round would leave the dispatch inconsistent. The primitive would not be implementable cleanly.
- **No lossy fork (slow outputs drop).** Inverts the project's whole thesis (backpressure preservation). Build a non-blocking sink wrapper externally if needed.
- **No `[Symbol.asyncIterator]()` consumption.** All primitives are sinks (Writables / WritableStreams), not sources — there is no read-side surface.
