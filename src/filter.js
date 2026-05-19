// @ts-self-types="./filter.d.ts"

'use strict';

const {Writable} = require('node:stream');
const makeStreamPusher = require('./stream-pusher.js');

const filter = (outputs, options) => {
  if (!Array.isArray(outputs) || !outputs.length) {
    throw TypeError('filter: outputs must be a non-empty array of Writable streams');
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
  const pushers = outputs.map(makeStreamPusher);

  let startedWriting = false;

  const writable = new Writable({
    objectMode: true,
    ...opts,
    write(chunk, encoding, cb) {
      startedWriting = true;
      const targets = [];
      for (let i = 0; i < pushers.length; ++i) {
        if (!pushers[i].isDead() && predicates[i](chunk, encoding)) {
          targets.push(pushers[i]);
        }
      }
      if (!targets.length) {
        cb(null);
        return;
      }
      Promise.all(targets.map(p => p.push(chunk, encoding))).then(errors => {
        if (ignoreErrors) {
          cb(null);
          return;
        }
        cb(errors.find(e => e) || null);
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

module.exports = filter;
