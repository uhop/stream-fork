import test from 'tape-six';

import fork from '../../src/web/index.js';
import {webStreamFromArray, webStreamToArray} from '../web-helpers.js';

test.asPromise('fork (web): 3 outputs', async (t, resolve) => {
  const input = [1, 3, 5, 7];
  const output1 = [];
  const output2 = [];
  const output3 = [];
  const f = fork([webStreamToArray(output1), webStreamToArray(output2), webStreamToArray(output3)]);

  await webStreamFromArray(input).pipeTo(f);

  t.deepEqual(output1, input);
  t.deepEqual(output2, input);
  t.deepEqual(output3, input);
  resolve();
});

test.asPromise('fork (web): single output is a passthrough', async (t, resolve) => {
  const input = [1, 2, 3];
  const output = [];
  const f = fork([webStreamToArray(output)]);

  await webStreamFromArray(input).pipeTo(f);

  t.deepEqual(output, input);
  resolve();
});

test('fork (web): outputs and isEmpty reflect live state', t => {
  t.ok(fork([]).isEmpty());
  const f = fork([webStreamToArray([])]);
  t.notOk(f.isEmpty());
  t.equal(f.outputs.length, 1);
});

test('fork (web): throws when outputs is not an array', t => {
  t.throws(() => fork('nope'), TypeError);
});
