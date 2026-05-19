# AGENTS.md — stream-fork

> `stream-fork` is a 1→N stream combinator: a Writable that duplicates every chunk to multiple downstream Writables while propagating backpressure from the slowest downstream. Part of the `stream-chain` / `stream-json` family. The package's whole purpose is correct backpressure handling — without it, a slow downstream's internal buffer would grow unboundedly.

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
│   ├── index.js              # The Fork class (Writable subclass)
│   └── index.d.ts
├── tests/                    # Test files (test-*.mjs, helpers.mjs, using tape-six)
└── .github/                  # CI workflows, Dependabot config
```

## Code style

- **CommonJS** throughout (`"type": "commonjs"` in package.json).
- **No transpilation** — code runs directly.
- **Lambda-style functions** for stand-alone definitions that don't use `this` (`const fn = (...) => …`); `function` declarations only for generators (`function*`) and the rare `this`-dependent case. `reportErrors` / `ignoreErrors` are `function` declarations because they close over `this.outputs` of the `Fork` instance they're attached to.
- **Prettier** for formatting (see `.prettierrc`): 100 char width, single quotes, no bracket spacing, no trailing commas, arrow parens "avoid".
- 2-space indentation.
- Semicolons are enforced by Prettier (default `semi: true`).
- Imports use `require()` syntax in source, `import` in tests (`.mjs`).

## Critical rules

- **Zero runtime dependencies.** `dependencies: {}` is a hard rule. Only `devDependencies` are allowed.
- **Backpressure is the whole point.** `_write` calls each downstream's `write(chunk, encoding, cb)` in parallel via `Promise.all` and only signals its own `callback` once every downstream has called back. Do not "optimize" by short-circuiting that gate — the slowest downstream must always gate the upstream.
- **Errors get the downstream removed.** A failing downstream is set to `null` in the `outputs` array during the round, then filtered out by `processResults` so subsequent writes don't touch it. The default (`!ignoreErrors`) re-emits the first error on the `Fork`; `ignoreErrors: true` swallows them.
- **Object mode default.** The default options literal is `{objectMode: true}` — opt out by passing an empty `{}` for chunk mode.
- **Do not modify or delete test expectations** without understanding why they changed.
- **Do not add comments or remove comments** unless explicitly asked.
- **Keep `src/index.js` and `src/index.d.ts` in sync.** All public API has a hand-written `.d.ts` sidecar with the `// @ts-self-types="./index.d.ts"` directive at the top of the `.js`.

## Architecture quick reference

- **`new Fork(outputs, options)`** — Writable subclass; `_write` fans the chunk to each downstream's `write` via `Promise.all`; `_final` does the same with `end`.
- **`Fork.fork(outputs, options)`** — factory; equivalent to `new Fork(...)`.
- **`outputs`** — the array of downstream Writables; mutated in place when a downstream errors out.
- **`isEmpty()`** — `true` when `outputs.length === 0`.
- **`options.ignoreErrors`** — boolean; toggles between `reportErrors` (first error re-emitted on the Fork) and `ignoreErrors` (errors swallowed; failed downstream filtered).

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

- Entry point: `src/index.js` + `src/index.d.ts` (exports the `Fork` class).
- Tests: `tests/test-*.mjs`, `tests/helpers.mjs`.
- Wiki docs: `wiki/` (git submodule).

## When reading the codebase

- Start with `ARCHITECTURE.md` for the module map and dependency graph.
- `src/index.d.ts` is the canonical API reference.
- The `tests/` files demonstrate every supported usage pattern.
- Wiki markdown files in `wiki/` contain detailed usage docs.
