// @ts-self-types="./route.d.ts"

import makeWebStreamPusher from './web-stream-pusher.js';

const route = (outputs, options) => {
  if (!Array.isArray(outputs) || !outputs.length) {
    throw TypeError('route: outputs must be a non-empty array of WritableStream instances');
  }
  if (!options || typeof options.pick != 'function') {
    throw TypeError('route: options.pick must be a function');
  }

  const opts = options;
  const pick = opts.pick;
  const ignoreErrors = !!opts.ignoreErrors;
  const pushers = outputs.map(makeWebStreamPusher);

  const writable = new WritableStream(
    {
      async write(chunk) {
        const idx = pick(chunk);
        if (!Number.isInteger(idx) || idx < 0 || idx >= pushers.length || pushers[idx].isDead()) {
          return;
        }
        const error = await pushers[idx].push(chunk);
        if (!ignoreErrors && error) throw error;
      },
      async close() {
        const errors = await Promise.all(pushers.map(p => p.end()));
        if (!ignoreErrors) {
          const err = errors.find(e => e);
          if (err) throw err;
        }
      },
      async abort(reason) {
        await Promise.all(
          pushers.map(async p => {
            try {
              await p.stream.abort(reason);
            } catch {
              /* ignored */
            }
          })
        );
      }
    },
    opts.queuingStrategy
  );

  Object.defineProperty(writable, 'outputs', {
    get: () => pushers.filter(p => !p.isDead()).map(p => p.stream),
    enumerable: true
  });
  Object.defineProperty(writable, 'isEmpty', {
    value: () => pushers.every(p => p.isDead()),
    enumerable: true
  });

  return writable;
};

export default route;
export {route};
