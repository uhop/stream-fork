// @ts-self-types="./fork.d.ts"

'use strict';

const {Writable} = require('node:stream');
const makeStreamPusher = require('./stream-pusher.js');

const fork = (outputs, options) => {
  if (!Array.isArray(outputs)) {
    throw TypeError('fork: outputs must be an array of Writable streams');
  }

  const opts = options || {};
  const ignoreErrors = !!opts.ignoreErrors;
  const pushers = outputs.map(makeStreamPusher);

  let startedWriting = false;

  const writable = new Writable({
    objectMode: true,
    ...opts,
    write(chunk, encoding, cb) {
      startedWriting = true;
      const live = pushers.filter(p => !p.isDead());
      if (!live.length) {
        cb(null);
        return;
      }
      Promise.all(live.map(p => p.push(chunk, encoding))).then(errors => {
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

module.exports = fork;
