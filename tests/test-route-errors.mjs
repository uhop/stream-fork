'use strict';

import test from 'tape-six';

import {Writable} from 'node:stream';

import route from '../src/route.js';
import {streamFromArray, streamToArray} from './helpers.mjs';

const erroringWritable = message =>
  new Writable({
    objectMode: true,
    write(_chunk, _encoding, callback) {
      callback(new Error(message));
    }
  });

test.asPromise('route errors: downstream error surfaces on the route (default)', (t, resolve) => {
  const r = route([erroringWritable('Sudden error!')], {pick: () => 0});

  streamFromArray([1, 2, 3]).pipe(r);

  r.on('error', error => {
    t.equal(error.message, 'Sudden error!');
    resolve();
  });
  r.on('finish', () => {
    t.fail('finish should not fire after an error');
    resolve();
  });
});

test.asPromise('route errors: ignoreErrors swallows downstream failures', (t, resolve) => {
  const input = [1, 2, 3, 4];
  const output = [];
  const r = route([erroringWritable('boom'), streamToArray(output)], {
    pick: chunk => (chunk === 1 ? 0 : 1),
    ignoreErrors: true
  });

  streamFromArray(input).pipe(r);

  r.on('error', () => {
    t.fail('error should be ignored');
    resolve();
  });
  r.on('finish', () => {
    t.deepEqual(output, [2, 3, 4]);
    resolve();
  });
});

test.asPromise('route errors: dead downstream removed from outputs', (t, resolve) => {
  const output = [];
  const r = route([erroringWritable('die'), streamToArray(output)], {
    pick: chunk => (chunk === 1 ? 0 : 1),
    ignoreErrors: true
  });

  streamFromArray([1, 2, 3]).pipe(r);

  r.on('finish', () => {
    t.equal(r.outputs.length, 1);
    t.notOk(r.isEmpty());
    resolve();
  });
});

test.asPromise('route errors: pre-write error re-emits on the route', (t, resolve) => {
  const sink = new Writable({
    objectMode: true,
    write(_c, _e, cb) {
      cb(null);
    }
  });
  const r = route([sink], {pick: () => 0});

  r.on('error', error => {
    t.equal(error.message, 'pre-write boom');
    resolve();
  });

  sink.emit('error', new Error('pre-write boom'));
});
