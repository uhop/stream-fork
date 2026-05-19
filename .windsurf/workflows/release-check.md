---
description: Pre-release verification checklist for stream-fork
---

# Release Check

Run through this checklist before publishing a new version.

## Steps

1. Check that `src/index.js` and `src/index.d.ts` are in sync (the exported class and option shapes match).
2. Check that `ARCHITECTURE.md` reflects any structural changes.
3. Check that `AGENTS.md` is up to date with any rule or workflow changes.
4. Check that `.windsurfrules`, `.clinerules`, `.cursorrules` are byte-identical to each other (the canonical source is `.windsurfrules`).
5. Check that `wiki/Home.md` and `wiki/Release-notes.md` are up to date with this release.
6. Check that `llms.txt` and `llms-full.txt` are up to date with any API changes.
7. Verify `package.json`:
   - `files` array includes `src`, `LICENSE`, `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `llms.txt`, `llms-full.txt`.
   - `exports` map is correct.
   - `funding`, `llms`, `llmsFull` fields are present.
   - `dependencies` is empty (`stream-fork` has zero runtime dependencies).
8. Check that the copyright year in `LICENSE` includes the current year.
9. Bump `version` in `package.json`.
10. Update release history in `README.md` (1–2-line cliff-notes per release; technical-housekeeping floor: `_Minor housekeeping. Updated dev deps._`).
11. Update `wiki/Release-notes.md` with the detailed release notes.
12. Run `npm install` to regenerate `package-lock.json`.
    // turbo
13. Run the full test suite with Node: `npm test`
    // turbo
14. Run tests with Bun: `npm run test:bun`
    // turbo
15. Run tests with Deno: `npm run test:deno`
    // turbo
16. Run TypeScript check: `npm run ts-check`
    // turbo
17. Run JS check: `npm run js-check`
    // turbo
18. Run lint: `npm run lint`
    // turbo
19. Dry-run publish to verify package contents: `npm pack --dry-run`
