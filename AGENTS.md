# AGENTS.md — stream-fork

> `stream-fork` is a toolkit of 1→N stream combinators: Writables that distribute every chunk to N downstream Writables under different dispatch shapes, with proper backpressure handling. The package ships three primitives — `fork` (broadcast), `route` (per-chunk picker → exactly one output), `filter` (per-chunk predicate per output → subset broadcast) — plus a small set of picker helpers under `src/utils/` for the common `route` shapes (round-robin, hash-shard, key-table, priority). Available in two flavors: Node Streams (default entry, `stream-fork`) and Web Streams (`stream-fork/web`).

For project structure, module dependencies, and the architecture overview see [ARCHITECTURE.md](./ARCHITECTURE.md).
For detailed usage docs and API references see the [wiki](https://github.com/uhop/stream-fork/wiki).

## Setup

This project uses a git submodule for the wiki:

```bash
git clone --recursive https://github.com/uhop/stream-fork.git
cd stream-fork
npm install
```

## Commands

- **Install:** `npm install`
- **Test:** `npm test` (runs `tape6 --flags FO`)
- **Test (Bun):** `npm run test:bun`
- **Test (Deno):** `npm run test:deno`
- **Test (browser via Playwright):** `npm run test:browser`
- **Test (single file):** `node tests/<node|web>/test-<name>.js`
- **TypeScript check:** `npm run ts-check`
- **JavaScript check (tsc --checkJs):** `npm run js-check`
- **Lint:** `npm run lint` (Prettier check)
- **Lint fix:** `npm run lint:fix` (Prettier write)

## Project structure

```
stream-fork/
├── package.json              # Package config; "tape6" section configures test discovery
├── src/                      # Source code (ESM, "type": "module")
│   ├── index.js              # Node entry; default = fork, named = {fork, route, filter}
│   ├── index.d.ts
│   ├── fork.js               # Node Writable wrapper: broadcast to every live output
│   ├── fork.d.ts
│   ├── route.js              # Node Writable wrapper: per-chunk picker → one output
│   ├── route.d.ts
│   ├── filter.js             # Node Writable wrapper: per-chunk predicate per output → subset
│   ├── filter.d.ts
│   ├── stream-pusher.js      # Internal: Promise-based wrapper over Writable
│   ├── stream-pusher.d.ts
│   ├── utils/                # Picker helpers (pure; shared between Node and Web trees)
│   │   ├── pick-round-robin.js / .d.ts   # Cycles 0..N-1
│   │   ├── pick-by-hash.js / .d.ts       # Hash(key) % N (stable sharding)
│   │   ├── pick-by-key.js / .d.ts        # Explicit key→index table
│   │   └── pick-first-match.js / .d.ts   # First-true predicate's index
│   └── web/                  # Web Streams variant (mirrors src/ root for the three primitives)
│       ├── index.js / .d.ts          # Web entry; default = fork, named = {fork, route, filter}
│       ├── fork.js / .d.ts           # Web WritableStream wrapper
│       ├── route.js / .d.ts          # Web WritableStream wrapper
│       ├── filter.js / .d.ts         # Web WritableStream wrapper
│       └── web-stream-pusher.js / .d.ts  # Internal: Promise-based wrapper over WritableStream
├── tests/                    # Test files (test-*.js, using tape-six)
│   ├── helpers.js            # Node-only test helpers (imports node:stream)
│   ├── web-helpers.js        # Web Streams test helpers (no Node imports; browser-runnable)
│   ├── node/                 # Node Streams tests (Node + Bun + Deno)
│   └── web/                  # Web Streams tests + pure picker tests (also run in browser via tape-six-playwright)
├── wiki/                     # GitHub wiki documentation (git submodule)
└── .github/                  # CI workflows, Dependabot config
```

The Node primitives at `src/<comp>.js` and the Web primitives at `src/web/<comp>.js` share the same options surface (`predicates`, `pick`, `ignoreErrors`) but wrap different stream APIs. Picker helpers under `src/utils/` are pure functions, shared across both trees — they don't import `node:*` and work as-is in the browser.

## Code style

- **ESM** throughout (`"type": "module"` in package.json). Both source and tests use `import` / `export`.
- **No transpilation** — code runs directly.
- **Lambda-style functions** for stand-alone definitions that don't use `this` (`const fn = (...) => …`); `function` declarations only for generators (`function*`) and the rare `this`-dependent case.
- **Prettier** for formatting (see `.prettierrc`): 100 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- **Default-export + named mirror.** Every module that declares `export default X` also declares `export {X}` for the same value (fleet convention `esm-default-export-with-named-mirror`).
- **Comments are _why_-markers only** — a non-trivial decision or constraint, an algorithm reference, or explicitly requested JSDoc; never narrate _what_ the code does (fleet convention `no-narrating-comments`).

## Critical rules

- **Zero runtime dependencies.** `dependencies: {}` is a hard rule. Only `devDependencies` are allowed.
- **Backpressure is the whole point.** Each primitive's `write` only signals "ready for the next chunk" once **every output that received the chunk** has called back. For `fork`, that's every live output. For `route`, the single picked output. For `filter`, every output whose predicate matched. Do not short-circuit that gate. On the Web side this means `Promise.all` over the per-output writer `.write(chunk)` promises (preceded by `writer.ready` per pusher).
- **Two pushers, same shape.** Node-side `makeStreamPusher` (`src/stream-pusher.js`) wraps `Writable.write` / `Writable.end`; Web-side `makeWebStreamPusher` (`src/web/web-stream-pusher.js`) wraps `writer.write` / `writer.close`. Both expose `{push, end, isDead, stream}` and both swallow errors locally — write errors resolve to `Error | null` rather than rejecting, and a stream-level error (Node `'error'` event / Web `writer.closed` rejection) marks the pusher dead without crashing the host.
- **Object mode default (Node).** Every Node primitive forces `objectMode: true` unless the caller passes an explicit `objectMode: false` (or an empty `{}` for chunk mode via the default-arg shape). Web Streams don't have a separate "object mode" — they accept any value, so this knob doesn't apply on the Web side.
- **Dead-output handling.** When a downstream errors, it's removed from the live `outputs` view. The public `outputs` getter returns only the live ones. Subsequent writes skip dead downstreams.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Keep `.js` and `.d.ts` files in sync** for every source file. All public API has a hand-written `.d.ts` sidecar with the `// @ts-self-types="./X.d.ts"` directive at the top of the `.js`.
- **Helpers live under `src/utils/`.** Main components and shared infrastructure stay at `src/` root (Node) or `src/web/` root (Web). Pure helpers (like the picker factories) live under `src/utils/` and are imported by both trees.

## Architecture quick reference

### Node Streams (`stream-fork`)

- **`fork(outputs, options?)`** — broadcast `Writable`. Every chunk goes to every live output; `Promise.all` over the per-output write callbacks gates upstream backpressure to the slowest downstream.
- **`route(outputs, options)`** — single-target dispatch `Writable`. `options.pick(chunk, encoding)` returns the index of the output to forward to; non-index return drops the chunk. The picked output gates upstream.
- **`filter(outputs, options)`** — subset broadcast `Writable`. `options.predicates[i](chunk, encoding)` decides whether output `i` receives the chunk. Generalizes `fork` (all-true) and `route` (exactly-one). The slowest of the selected subset gates upstream.

### Web Streams (`stream-fork/web`)

- **`fork(outputs, options?)`** — broadcast `WritableStream`. Same dispatch shape as Node-side `fork`, but inputs are `WritableStream[]` and the return is a `WritableStream`. Generalizes `ReadableStream.tee()` to N outputs and avoids `tee()`'s per-branch infinite buffering.
- **`route(outputs, options)`** — single-target dispatch `WritableStream`.
- **`filter(outputs, options)`** — subset broadcast `WritableStream`.

Web wrappers honor the same `ignoreErrors` flag and expose the same `.outputs` / `.isEmpty()` introspection as the Node side.

### Picker helpers (`stream-fork/utils/*`, shared)

- `pickRoundRobin(count)` — load-balance.
- `pickByHash(keyFn, count)` — stable shard (djb2; numeric keys used directly modulo `count`).
- `pickByKey(keyFn, table)` — explicit `key → index` map (plain object or `Map`).
- `pickFirstMatch(predicates)` — priority routing; append `() => true` for catch-all.

### Internal pushers

- **`makeStreamPusher(stream)`** (Node) — returns `{push, end, isDead, stream}`. `push(chunk, encoding)` and `end()` resolve to `Error | null`; `isDead()` is `true` once any error has been observed. Installs its own `'error'` listener.
- **`makeWebStreamPusher(stream)`** (Web) — same shape. Acquires a writer via `stream.getWriter()`; awaits `writer.ready` before each `writer.write`; listens on `writer.closed` for async errors.

## Verification commands

- `npm test` — run the full test suite (parallel workers, Node)
- `node tests/<node|web>/test-<name>.js` — run a single test file directly
- `npm run test:bun` — run with Bun
- `npm run test:deno` — run with Deno
- `npm run test:browser` — run the browser-runnable subset under Chromium via tape-six-playwright
- `npm run ts-check` — TypeScript type checking
- `npm run js-check` — `tsc --allowJs --checkJs` over the JS sources
- `npm run lint` — Prettier check
- `npm run lint:fix` — Prettier write

## File layout

- Node entry: `src/index.js` + `src/index.d.ts` (default = `fork`; named = `{fork, route, filter}`).
- Web entry: `src/web/index.js` + `src/web/index.d.ts` (default = `fork`; named = `{fork, route, filter}`).
- Node primitives: `src/{fork,route,filter}.js` (each with `.d.ts`).
- Web primitives: `src/web/{fork,route,filter}.js` (each with `.d.ts`).
- Internal infrastructure: `src/stream-pusher.js` (Node), `src/web/web-stream-pusher.js` (Web).
- Picker helpers: `src/utils/*.{js,d.ts}` (pure; shared between trees).
- Tests: `tests/{node,web}/test-*.js`, `tests/helpers.js` (Node), `tests/web-helpers.js` (Web).
- Wiki docs: `wiki/` (git submodule).

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- Each primitive's `.d.ts` is the canonical API reference for that primitive.
- The `tests/node/` and `tests/web/` files demonstrate every supported usage pattern.
- Wiki markdown files in `wiki/` contain detailed usage docs (separate Node and Web sections per primitive).
