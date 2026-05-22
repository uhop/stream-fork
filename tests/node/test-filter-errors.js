import test from 'tape-six';

import {Writable} from 'node:stream';

import filter from '../../src/filter.js';
import {streamFromArray, streamToArray} from '../helpers.js';

const erroringWritable = message =>
  new Writable({
    objectMode: true,
    write(_chunk, _encoding, callback) {
      callback(new Error(message));
    }
  });

test.asPromise('filter errors: downstream error surfaces on the filter (default)', (t, resolve) => {
  const output1 = [];
  const f = filter([streamToArray(output1), erroringWritable('Sudden error!')], {
    predicates: [() => true, () => true]
  });

  streamFromArray([1, 2, 3]).pipe(f);

  f.on('error', error => {
    t.equal(error.message, 'Sudden error!');
    resolve();
  });
  f.on('finish', () => {
    t.fail('finish should not fire after an error');
    resolve();
  });
});

test.asPromise('filter errors: ignoreErrors swallows downstream failures', (t, resolve) => {
  const input = [1, 2, 3, 4];
  const output1 = [];
  const f = filter([streamToArray(output1), erroringWritable('boom')], {
    predicates: [() => true, () => true],
    ignoreErrors: true
  });

  streamFromArray(input).pipe(f);

  f.on('error', () => {
    t.fail('error should be ignored');
    resolve();
  });
  f.on('finish', () => {
    t.deepEqual(output1, input);
    resolve();
  });
});

test.asPromise('filter errors: dead downstream removed from outputs', (t, resolve) => {
  const output1 = [];
  const f = filter([streamToArray(output1), erroringWritable('die')], {
    predicates: [() => true, () => true],
    ignoreErrors: true
  });

  streamFromArray([1, 2, 3]).pipe(f);

  f.on('finish', () => {
    t.equal(f.outputs.length, 1);
    t.notOk(f.isEmpty());
    resolve();
  });
});

test.asPromise('filter errors: pre-write error re-emits on the filter', (t, resolve) => {
  const sink = new Writable({
    objectMode: true,
    write(_c, _e, cb) {
      cb(null);
    }
  });
  const f = filter([sink], {predicates: [() => true]});

  f.on('error', error => {
    t.equal(error.message, 'pre-write boom');
    resolve();
  });

  sink.emit('error', new Error('pre-write boom'));
});
