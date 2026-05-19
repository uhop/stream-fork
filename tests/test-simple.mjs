'use strict';

import test from 'tape-six';

import Fork from '../src/index.js';
import {streamFromArray, streamToArray} from './helpers.mjs';

test.asPromise('simple: class form, object mode', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const output2 = [];
  const output3 = [];
  const fork = new Fork([streamToArray(output1), streamToArray(output2), streamToArray(output3)]);

  streamFromArray(input).pipe(fork);

  fork.on('finish', () => {
    t.deepEqual(output1, input);
    t.deepEqual(output2, input);
    t.deepEqual(output3, input);
    resolve();
  });
});

test.asPromise('simple: factory form, object mode', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const output2 = [];
  const output3 = [];
  const fork = Fork.fork([streamToArray(output1), streamToArray(output2), streamToArray(output3)]);

  streamFromArray(input).pipe(fork);

  fork.on('finish', () => {
    t.deepEqual(output1, input);
    t.deepEqual(output2, input);
    t.deepEqual(output3, input);
    resolve();
  });
});

test.asPromise('simple: chunk mode (strings)', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const output2 = [];
  const output3 = [];
  const fork = new Fork(
    [streamToArray(output1, false), streamToArray(output2, false), streamToArray(output3, false)],
    {}
  );

  streamFromArray(input, false).pipe(fork);

  fork.on('finish', () => {
    const str = input.join('');
    t.equal(output1.join(''), str);
    t.equal(output2.join(''), str);
    t.equal(output3.join(''), str);
    resolve();
  });
});

test('simple: isEmpty reflects outputs length', t => {
  t.ok(new Fork([]).isEmpty());
  t.notOk(new Fork([streamToArray([])]).isEmpty());
});
