// @ts-self-types="./index.d.ts"

'use strict';

// `stream-fork` is a multi-component package: `fork()`, `route()`, `filter()`.
// The default export points to `fork()` (broadcast) — the canonical 1→N
// operation and the back-compat name for the only function 1.x shipped.

module.exports = require('./fork.js');
