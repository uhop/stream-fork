# AGENTS.md — stream-fork

> `stream-fork` is a toolkit of 1→N stream combinators: Writables that distribute every chunk to N downstream Writables under different dispatch shapes, with proper backpressure handling. The package ships three primitives — `fork` (broadcast), `route` (per-chunk picker → exactly one output), `filter` (per-chunk predicate per output → subset broadcast) — plus a small set of picker helpers under `src/utils/` for the common `route` shapes (round-robin, hash-shard, key-table, priority).

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
- **Test (single file):** `node tests/test-<name>.mjs`
- **TypeScript check:** `npm run ts-check`
- **JavaScript check (tsc --checkJs):** `npm run js-check`
- **Lint:** `npm run lint` (Prettier check)
- **Lint fix:** `npm run lint:fix` (Prettier write)

## Project structure

```
stream-fork/
├── package.json              # Package config; "tape6" section configures test discovery
├── src/                      # Source code
│   ├── index.js              # Entry point; re-exports fork as the default
│   ├── index.d.ts
│   ├── fork.js               # Main component: broadcast to every output
│   ├── fork.d.ts
│   ├── route.js              # Main component: per-chunk picker → one output
│   ├── route.d.ts
│   ├── filter.js             # Main component: per-chunk predicate per output → subset
│   ├── filter.d.ts
│   ├── stream-pusher.js      # Internal: Promise-based wrapper over Writable
│   ├── stream-pusher.d.ts
│   └── utils/                # Picker helpers users compose into `route`
│       ├── pick-round-robin.js     # Cycles 0..N-1
│       ├── pick-by-hash.js         # Hash(key) % N (stable sharding)
│       ├── pick-by-key.js          # Explicit key→index table
│       ├── pick-first-match.js     # First-true predicate's index
│       └── *.d.ts
├── tests/                    # Test files (test-*.mjs, helpers.mjs, using tape-six)
├── wiki/                     # GitHub wiki documentation (git submodule)
└── .github/                  # CI workflows, Dependabot config
```

`src/utils/` follows the fleet convention of separating helpers from main components. Main components and shared internal infrastructure live at `src/` root; everything users compose **with** those main components lives under `src/utils/`.

## Code style

- **CommonJS** throughout (`"type": "commonjs"` in package.json).
- **No transpilation** — code runs directly.
- **Lambda-style functions** for stand-alone definitions that don't use `this` (`const fn = (...) => …`); `function` declarations only for generators (`function*`) and the rare `this`-dependent case.
- **Prettier** for formatting (see `.prettierrc`): 100 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- Imports use `require()` syntax in source, `import` in tests (`.mjs`).

## Critical rules

- **Zero runtime dependencies.** `dependencies: {}` is a hard rule. Only `devDependencies` are allowed.
- **Backpressure is the whole point.** Each primitive's `_write` only signals "ready for the next chunk" once **every output that received the chunk** has called back. For `fork`, that's every live output. For `route`, the single picked output. For `filter`, every output whose predicate matched. Do not short-circuit that gate.
- **Built on a shared `makeStreamPusher`.** All main components write to downstreams via the internal `src/stream-pusher.js`, which wraps Node's `Writable.write` / `Writable.end` in a Promise-based interface and installs its own `'error'` listener (so Node never crashes on an otherwise-unhandled error). Mirror of stream-join's `makeStreamPuller` pattern.
- **Object mode default.** Every primitive forces `objectMode: true` unless the caller passes an explicit `objectMode: false` (or an empty `{}` for chunk mode via the default-arg shape).
- **Dead-output handling.** When a downstream errors, it's removed from the live `outputs` view. The public `outputs` getter returns only the live ones. Subsequent writes skip dead downstreams.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Do not add comments or remove comments** unless explicitly asked.
- **Keep `.js` and `.d.ts` files in sync** for every source file. All public API has a hand-written `.d.ts` sidecar with the `// @ts-self-types="./X.d.ts"` directive at the top of the `.js`.
- **Helpers live under `src/utils/`.** Main components and shared infrastructure stay at `src/` root.

## Architecture quick reference

- **`fork(outputs, options?)`** — broadcast. Every chunk goes to every live output; `Promise.all` over the per-output write callbacks gates upstream backpressure to the slowest downstream.
- **`route(outputs, options)`** — single-target dispatch. `options.pick(chunk, encoding)` returns the index of the output to forward to; non-index return drops the chunk. The picked output gates upstream.
- **`filter(outputs, options)`** — subset broadcast. `options.predicates[i](chunk, encoding)` decides whether output `i` receives the chunk. Generalizes `fork` (all-true) and `route` (exactly-one). The slowest of the selected subset gates upstream.
- **Picker helpers under `src/utils/`:** `pickRoundRobin(count)` (load-balance), `pickByHash(keyFn, count)` (stable shard), `pickByKey(keyFn, table)` (explicit key→index map), `pickFirstMatch(predicates)` (priority routing).
- **`makeStreamPusher(stream)`** — internal. Returns `{push, end, isDead, stream}`. `push(chunk, encoding)` and `end()` resolve to `Error | null`; `isDead()` is `true` once any error has been observed. Installs its own `'error'` listener.

## Verification commands

- `npm test` — run the full test suite (parallel workers)
- `node tests/test-<name>.mjs` — run a single test file directly
- `npm run test:bun` — run with Bun
- `npm run test:deno` — run with Deno
- `npm run ts-check` — TypeScript type checking
- `npm run js-check` — `tsc --allowJs --checkJs` over the JS sources
- `npm run lint` — Prettier check
- `npm run lint:fix` — Prettier write

## File layout

- Entry point: `src/index.js` + `src/index.d.ts` (re-exports `fork` as the default for back-compat with 1.x).
- Main components: `src/fork.js`, `src/route.js`, `src/filter.js` (each with its `.d.ts`).
- Internal infrastructure: `src/stream-pusher.js`.
- Helpers: `src/utils/*.js` (each with its `.d.ts`).
- Tests: `tests/test-*.mjs`, `tests/helpers.mjs`.
- Wiki docs: `wiki/` (git submodule).

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- Each main component's `.d.ts` is the canonical API reference for that component.
- The `tests/` files demonstrate every supported usage pattern.
- Wiki markdown files in `wiki/` contain detailed usage docs.
