'use strict';

import test from 'tape-six';

import fork from '../src/index.js';
import {streamFromArray, streamToArray} from './helpers.mjs';

test.asPromise('fork: 3 outputs, object mode', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const output2 = [];
  const output3 = [];
  const f = fork([streamToArray(output1), streamToArray(output2), streamToArray(output3)]);

  streamFromArray(input).pipe(f);

  f.on('finish', () => {
    t.deepEqual(output1, input);
    t.deepEqual(output2, input);
    t.deepEqual(output3, input);
    resolve();
  });
});

test.asPromise('fork: chunk mode (strings)', (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const output2 = [];
  const output3 = [];
  const f = fork(
    [streamToArray(output1, false), streamToArray(output2, false), streamToArray(output3, false)],
    {}
  );

  streamFromArray(input, false).pipe(f);

  f.on('finish', () => {
    const str = input.join('');
    t.equal(output1.join(''), str);
    t.equal(output2.join(''), str);
    t.equal(output3.join(''), str);
    resolve();
  });
});

test('fork: outputs and isEmpty reflect live state', t => {
  t.ok(fork([]).isEmpty());
  const f = fork([streamToArray([])]);
  t.notOk(f.isEmpty());
  t.equal(f.outputs.length, 1);
});

test('fork: throws when outputs is not an array', t => {
  t.throws(() => fork('nope'), TypeError);
});
