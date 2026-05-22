import test from 'tape-six';

import filter from '../../src/filter.js';
import {streamFromArray, streamToArray} from '../helpers.js';

test.asPromise('filter: subset broadcast based on predicates', (t, resolve) => {
  const input = [1, 2, 3, 4, 5];
  const evens = [];
  const big = [];
  const all = [];
  const f = filter([streamToArray(evens), streamToArray(big), streamToArray(all)], {
    predicates: [chunk => chunk % 2 === 0, chunk => chunk >= 4, () => true]
  });

  streamFromArray(input).pipe(f);

  f.on('finish', () => {
    t.deepEqual(evens, [2, 4]);
    t.deepEqual(big, [4, 5]);
    t.deepEqual(all, input);
    resolve();
  });
});

test.asPromise('filter: all-true mask equals fork (broadcast)', (t, resolve) => {
  const input = [1, 2, 3];
  const output1 = [];
  const output2 = [];
  const f = filter([streamToArray(output1), streamToArray(output2)], {
    predicates: [() => true, () => true]
  });

  streamFromArray(input).pipe(f);

  f.on('finish', () => {
    t.deepEqual(output1, input);
    t.deepEqual(output2, input);
    resolve();
  });
});

test.asPromise('filter: all-false mask drops every chunk', (t, resolve) => {
  const input = [1, 2, 3];
  const output1 = [];
  const output2 = [];
  const f = filter([streamToArray(output1), streamToArray(output2)], {
    predicates: [() => false, () => false]
  });

  streamFromArray(input).pipe(f);

  f.on('finish', () => {
    t.deepEqual(output1, []);
    t.deepEqual(output2, []);
    resolve();
  });
});

test('filter: throws when predicates length mismatches outputs', t => {
  t.throws(
    () =>
      filter([streamToArray([]), streamToArray([])], {
        predicates: [() => true]
      }),
    TypeError
  );
});

test('filter: throws when a predicate is not a function', t => {
  t.throws(
    () =>
      filter([streamToArray([])], {
        predicates: ['not a function']
      }),
    TypeError
  );
});

test('filter: throws when outputs is empty', t => {
  t.throws(() => filter([], {predicates: []}), TypeError);
});

test('filter: throws when options is missing', t => {
  t.throws(() => filter([streamToArray([])]), TypeError);
  t.throws(() => filter([streamToArray([])], {}), TypeError);
});
