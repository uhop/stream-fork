import test from 'tape-six';

import route from '../../src/web/route.js';
import {webStreamFromArray, webStreamToArray} from '../web-helpers.js';

test.asPromise('route (web): dispatches each chunk to one output', async (t, resolve) => {
  const input = [1, 2, 3, 4, 5, 6];
  const evens = [];
  const odds = [];
  const r = route([webStreamToArray(evens), webStreamToArray(odds)], {
    pick: chunk => (chunk % 2 === 0 ? 0 : 1)
  });

  await webStreamFromArray(input).pipeTo(r);

  t.deepEqual(evens, [2, 4, 6]);
  t.deepEqual(odds, [1, 3, 5]);
  resolve();
});

test.asPromise('route (web): picker returning non-index drops the chunk', async (t, resolve) => {
  const input = [1, 2, 3, 4];
  const output = [];
  const r = route([webStreamToArray(output)], {
    pick: chunk => (chunk > 2 ? 0 : undefined)
  });

  await webStreamFromArray(input).pipeTo(r);

  t.deepEqual(output, [3, 4]);
  resolve();
});

test.asPromise('route (web): out-of-range index drops the chunk', async (t, resolve) => {
  const output = [];
  const r = route([webStreamToArray(output)], {pick: () => 99});

  await webStreamFromArray([1, 2, 3]).pipeTo(r);

  t.deepEqual(output, []);
  resolve();
});

test.asPromise('route (web): NaN index drops the chunk', async (t, resolve) => {
  const output = [];
  const r = route([webStreamToArray(output)], {pick: () => NaN});

  await webStreamFromArray([1, 2, 3]).pipeTo(r);

  t.deepEqual(output, []);
  resolve();
});

test.asPromise('route (web): non-integer index drops the chunk', async (t, resolve) => {
  const output1 = [];
  const output2 = [];
  const r = route([webStreamToArray(output1), webStreamToArray(output2)], {pick: () => 1.5});

  await webStreamFromArray([1, 2, 3]).pipeTo(r);

  t.deepEqual(output1, []);
  t.deepEqual(output2, []);
  resolve();
});

test('route (web): throws when outputs is empty', t => {
  t.throws(() => route([], {pick: () => 0}), TypeError);
});

test('route (web): throws when options.pick is missing', t => {
  t.throws(() => route([webStreamToArray([])]), TypeError);
  t.throws(() => route([webStreamToArray([])], {}), TypeError);
});
