'use strict';

import test from 'tape-six';

import {Writable} from 'node:stream';

import Fork from '../src/index.js';
import {streamFromArray, streamToArray} from './helpers.mjs';

const erroringWritable = message =>
  new Writable({
    objectMode: true,
    write(_chunk, _encoding, callback) {
      callback(new Error(message));
    }
  });

test.asPromise('errors: downstream error surfaces on the fork (default)', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const fork = new Fork([streamToArray(output1), erroringWritable('Sudden error!')]);

  streamFromArray(input).pipe(fork);

  fork.on('error', error => {
    t.equal(error.message, 'Sudden error!');
    resolve();
  });
  fork.on('finish', () => {
    t.fail('finish should not fire after an error');
    resolve();
  });
});

test.asPromise('errors: ignoreErrors swallows downstream failures', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const fork = new Fork([streamToArray(output1), erroringWritable('Sudden error!')], {
    objectMode: true,
    ignoreErrors: true
  });

  streamFromArray(input).pipe(fork);

  fork.on('error', () => {
    t.fail('error should be ignored');
    resolve();
  });
  fork.on('finish', () => {
    t.deepEqual(output1, input);
    resolve();
  });
});
