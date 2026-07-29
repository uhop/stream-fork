# Contributing to stream-fork

Thank you for your interest in contributing!

## Getting started

This project uses a git submodule for the wiki. Clone recursively:

```bash
git clone --recursive https://github.com/uhop/stream-fork.git
cd stream-fork
npm install
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module map and dependency graph.

## Development workflow

1. Make your changes.
2. Lint: `npm run lint:fix`
3. Test: `npm test`
4. Type-check `.d.ts`: `npm run ts-check`
5. JS check (`tsc --checkJs` over `src/**/*.js`): `npm run js-check`

Cross-runtime checks when touching `src/` or `src/web/`: `npm run test:bun`, `npm run test:deno`, and `npm run test:browser` — the browser run executes the `tests/web/` suite in real headless Chromium, the only check that proves nothing browser-facing imports `node:*` (Node, Bun, and Deno all expose `node:`, so a leak passes there silently).

## Code style

- ESM (`import`) throughout — source and tests (`"type": "module"`). No CommonJS, no transpilation.
- Formatted with Prettier — see `.prettierrc` for settings.
- Zero runtime dependencies — do not add any.
- Keep `.js` and `.d.ts` files in sync for all modules under `src/`; types and documentation live in the `.d.ts` sidecar, never as JSDoc in the `.js`.
- Keep the Node (`src/`) and Web (`src/web/`) trees aligned: same primitives, same options surface.

## License

This project is distributed under the [BSD-3-Clause license](./LICENSE). External contributions are accepted only under licenses compatible with BSD-3-Clause; submissions under fundamentally incompatible licenses cannot be merged.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
