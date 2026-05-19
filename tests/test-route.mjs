'use strict';

import test from 'tape-six';

import route from '../src/route.js';
import {streamFromArray, streamToArray} from './helpers.mjs';

test.asPromise('route: dispatches each chunk to one output', (t, resolve) => {
  const input = [1, 2, 3, 4, 5, 6];
  const evens = [];
  const odds = [];
  const r = route([streamToArray(evens), streamToArray(odds)], {
    pick: chunk => (chunk % 2 === 0 ? 0 : 1)
  });

  streamFromArray(input).pipe(r);

  r.on('finish', () => {
    t.deepEqual(evens, [2, 4, 6]);
    t.deepEqual(odds, [1, 3, 5]);
    resolve();
  });
});

test.asPromise('route: picker returning non-index drops the chunk', (t, resolve) => {
  const input = [1, 2, 3, 4];
  const output = [];
  const r = route([streamToArray(output)], {
    pick: chunk => (chunk > 2 ? 0 : undefined)
  });

  streamFromArray(input).pipe(r);

  r.on('finish', () => {
    t.deepEqual(output, [3, 4]);
    resolve();
  });
});

test.asPromise('route: out-of-range index drops the chunk', (t, resolve) => {
  const input = [1, 2, 3];
  const output = [];
  const r = route([streamToArray(output)], {pick: () => 99});

  streamFromArray(input).pipe(r);

  r.on('finish', () => {
    t.deepEqual(output, []);
    resolve();
  });
});

test.asPromise('route: NaN index drops the chunk', (t, resolve) => {
  const input = [1, 2, 3];
  const output = [];
  const r = route([streamToArray(output)], {pick: () => NaN});

  streamFromArray(input).pipe(r);

  r.on('finish', () => {
    t.deepEqual(output, []);
    resolve();
  });
});

test.asPromise('route: non-integer index drops the chunk', (t, resolve) => {
  const input = [1, 2, 3];
  const output1 = [];
  const output2 = [];
  const r = route([streamToArray(output1), streamToArray(output2)], {pick: () => 1.5});

  streamFromArray(input).pipe(r);

  r.on('finish', () => {
    t.deepEqual(output1, []);
    t.deepEqual(output2, []);
    resolve();
  });
});

test('route: throws when outputs is empty', t => {
  t.throws(() => route([], {pick: () => 0}), TypeError);
});

test('route: throws when options.pick is missing', t => {
  t.throws(() => route([streamToArray([])]), TypeError);
  t.throws(() => route([streamToArray([])], {}), TypeError);
});
