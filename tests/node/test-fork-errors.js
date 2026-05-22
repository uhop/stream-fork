import test from 'tape-six';

import {Writable} from 'node:stream';

import fork from '../../src/index.js';
import {streamFromArray, streamToArray} from '../helpers.js';

const erroringWritable = message =>
  new Writable({
    objectMode: true,
    write(_chunk, _encoding, callback) {
      callback(new Error(message));
    }
  });

test.asPromise('fork errors: downstream error surfaces on the fork (default)', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const f = fork([streamToArray(output1), erroringWritable('Sudden error!')]);

  streamFromArray(input).pipe(f);

  f.on('error', error => {
    t.equal(error.message, 'Sudden error!');
    resolve();
  });
  f.on('finish', () => {
    t.fail('finish should not fire after an error');
    resolve();
  });
});

test.asPromise('fork errors: ignoreErrors swallows downstream failures', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const f = fork([streamToArray(output1), erroringWritable('Sudden error!')], {
    objectMode: true,
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

test.asPromise('fork errors: dead downstream removed from outputs', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const f = fork([streamToArray(output1), erroringWritable('die')], {ignoreErrors: true});

  streamFromArray(input).pipe(f);

  f.on('finish', () => {
    t.equal(f.outputs.length, 1);
    t.notOk(f.isEmpty());
    resolve();
  });
});

test.asPromise('fork errors: pre-write error re-emits on the fork', (t, resolve) => {
  const sink1 = new Writable({
    objectMode: true,
    write(_c, _e, cb) {
      cb(null);
    }
  });
  const sink2 = new Writable({
    objectMode: true,
    write(_c, _e, cb) {
      cb(null);
    }
  });
  const f = fork([sink1, sink2]);

  f.on('error', error => {
    t.equal(error.message, 'pre-write boom');
    resolve();
  });

  sink1.emit('error', new Error('pre-write boom'));
});
