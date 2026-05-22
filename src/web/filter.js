// @ts-self-types="./filter.d.ts"

import makeWebStreamPusher from './web-stream-pusher.js';

const filter = (outputs, options) => {
  if (!Array.isArray(outputs) || !outputs.length) {
    throw TypeError('filter: outputs must be a non-empty array of WritableStream instances');
  }
  if (
    !options ||
    !Array.isArray(options.predicates) ||
    options.predicates.length != outputs.length
  ) {
    throw TypeError('filter: options.predicates must be an array the same length as outputs');
  }
  if (options.predicates.some(p => typeof p != 'function')) {
    throw TypeError('filter: every predicate must be a function');
  }

  const opts = options;
  const predicates = opts.predicates;
  const ignoreErrors = !!opts.ignoreErrors;
  const pushers = outputs.map(makeWebStreamPusher);

  const writable = new WritableStream(
    {
      async write(chunk) {
        const targets = [];
        for (let i = 0; i < pushers.length; ++i) {
          if (!pushers[i].isDead() && predicates[i](chunk)) {
            targets.push(pushers[i]);
          }
        }
        if (!targets.length) return;
        const errors = await Promise.all(targets.map(p => p.push(chunk)));
        if (!ignoreErrors) {
          const err = errors.find(e => e);
          if (err) throw err;
        }
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

export default filter;
export {filter};
