import test from 'tape-six';

import filter from '../../src/web/filter.js';
import {webStreamFromArray, webStreamToArray} from '../web-helpers.js';

test.asPromise('filter (web): subset broadcast based on predicates', async (t, resolve) => {
  const input = [1, 2, 3, 4, 5];
  const evens = [];
  const big = [];
  const all = [];
  const f = filter([webStreamToArray(evens), webStreamToArray(big), webStreamToArray(all)], {
    predicates: [chunk => chunk % 2 === 0, chunk => chunk >= 4, () => true]
  });

  await webStreamFromArray(input).pipeTo(f);

  t.deepEqual(evens, [2, 4]);
  t.deepEqual(big, [4, 5]);
  t.deepEqual(all, input);
  resolve();
});

test.asPromise('filter (web): all-true mask equals fork (broadcast)', async (t, resolve) => {
  const input = [1, 2, 3];
  const output1 = [];
  const output2 = [];
  const f = filter([webStreamToArray(output1), webStreamToArray(output2)], {
    predicates: [() => true, () => true]
  });

  await webStreamFromArray(input).pipeTo(f);

  t.deepEqual(output1, input);
  t.deepEqual(output2, input);
  resolve();
});

test.asPromise('filter (web): all-false mask drops every chunk', async (t, resolve) => {
  const input = [1, 2, 3];
  const output1 = [];
  const output2 = [];
  const f = filter([webStreamToArray(output1), webStreamToArray(output2)], {
    predicates: [() => false, () => false]
  });

  await webStreamFromArray(input).pipeTo(f);

  t.deepEqual(output1, []);
  t.deepEqual(output2, []);
  resolve();
});

test('filter (web): throws when predicates length mismatches outputs', t => {
  t.throws(
    () =>
      filter([webStreamToArray([]), webStreamToArray([])], {
        predicates: [() => true]
      }),
    TypeError
  );
});

test('filter (web): throws when a predicate is not a function', t => {
  t.throws(
    () =>
      filter([webStreamToArray([])], {
        predicates: ['not a function']
      }),
    TypeError
  );
});

test('filter (web): throws when outputs is empty', t => {
  t.throws(() => filter([], {predicates: []}), TypeError);
});

test('filter (web): throws when options is missing', t => {
  t.throws(() => filter([webStreamToArray([])]), TypeError);
  t.throws(() => filter([webStreamToArray([])], {}), TypeError);
});
