// @ts-self-types="./route.d.ts"

'use strict';

const {Writable} = require('node:stream');
const makeStreamPusher = require('./stream-pusher.js');

const route = (outputs, options) => {
  if (!Array.isArray(outputs) || !outputs.length) {
    throw TypeError('route: outputs must be a non-empty array of Writable streams');
  }
  if (!options || typeof options.pick != 'function') {
    throw TypeError('route: options.pick must be a function');
  }

  const opts = options;
  const pick = opts.pick;
  const ignoreErrors = !!opts.ignoreErrors;
  const pushers = outputs.map(makeStreamPusher);

  let startedWriting = false;

  const writable = new Writable({
    objectMode: true,
    ...opts,
    write(chunk, encoding, cb) {
      startedWriting = true;
      const idx = pick(chunk, encoding);
      if (typeof idx != 'number' || idx < 0 || idx >= pushers.length || pushers[idx].isDead()) {
        cb(null);
        return;
      }
      pushers[idx].push(chunk, encoding).then(error => {
        cb(ignoreErrors ? null : error || null);
      });
    },
    final(cb) {
      startedWriting = true;
      Promise.all(pushers.map(p => p.end())).then(errors => {
        if (ignoreErrors) {
          cb(null);
          return;
        }
        cb(errors.find(e => e) || null);
      });
    }
  });

  if (!ignoreErrors) {
    pushers.forEach(p => {
      p.stream.on('error', error => {
        if (startedWriting) return;
        writable.emit('error', error);
      });
    });
  }

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

module.exports = route;
