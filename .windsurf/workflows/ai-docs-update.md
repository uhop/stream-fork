---
description: Update AI-facing documentation files after API or architecture changes
---

# AI Documentation Update

Update all AI-facing files after changes to the public API or project structure.

## Steps

1. Read `src/index.js` and `src/index.d.ts` to identify the current public API.
2. Read `AGENTS.md` and `ARCHITECTURE.md` for the current documented state.
3. Identify what changed (added/renamed/removed options, behavior changes, new examples worth surfacing).
4. Update `llms.txt`:
   - Ensure the API section matches `src/index.d.ts`.
   - Add or update common patterns if relevant.
   - Keep it concise — this is for quick LLM consumption.
5. Update `llms-full.txt`:
   - Full reference with examples for every option and behavior.
   - Include the backpressure mechanics, error handling modes, and composition with `stream-chain`.
6. Update `ARCHITECTURE.md` if project structure or module dependencies changed.
7. Update `AGENTS.md` if critical rules, commands, or the architecture quick reference changed.
8. Sync `.windsurfrules`, `.cursorrules`, `.clinerules` if the condensed rules need updating:
   - These three files MUST remain byte-identical (verify with `md5sum`).
   - `.windsurfrules` is the canonical condensed source; copy it to the other two.
9. Update `wiki/Home.md` if the overview needs to reflect new behavior.
10. Track progress with the todo list and provide a summary when done.
