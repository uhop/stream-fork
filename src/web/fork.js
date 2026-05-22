// @ts-self-types="./fork.d.ts"

import makeWebStreamPusher from './web-stream-pusher.js';

const fork = (outputs, options) => {
  if (!Array.isArray(outputs)) {
    throw TypeError('fork: outputs must be an array of WritableStream instances');
  }

  const opts = options || {};
  const ignoreErrors = !!opts.ignoreErrors;
  const pushers = outputs.map(makeWebStreamPusher);

  const writable = new WritableStream(
    {
      async write(chunk) {
        const live = pushers.filter(p => !p.isDead());
        if (!live.length) return;
        const errors = await Promise.all(live.map(p => p.push(chunk)));
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
              /* ignored — already-aborted streams are fine */
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

export default fork;
export {fork};
