import test from 'tape-six';

import fork from '../../src/web/index.js';
import {webStreamFromArray, webStreamToArray, erroringWebSink} from '../web-helpers.js';

test.asPromise(
  'fork errors (web): downstream error rejects pipeTo (default)',
  async (t, resolve) => {
    const output1 = [];
    const f = fork([webStreamToArray(output1), erroringWebSink(new Error('Sudden error!'))]);

    try {
      await webStreamFromArray([1, 3, 5, 7]).pipeTo(f);
      t.fail('pipeTo should have rejected');
    } catch (err) {
      t.equal(err.message, 'Sudden error!');
    }
    resolve();
  }
);

test.asPromise(
  'fork errors (web): ignoreErrors swallows downstream failures',
  async (t, resolve) => {
    const input = [1, 3, 5, 7];
    const output1 = [];
    const f = fork([webStreamToArray(output1), erroringWebSink(new Error('Sudden error!'))], {
      ignoreErrors: true
    });

    await webStreamFromArray(input).pipeTo(f);

    t.deepEqual(output1, input);
    resolve();
  }
);

test.asPromise('fork errors (web): dead downstream removed from outputs', async (t, resolve) => {
  const output1 = [];
  const f = fork([webStreamToArray(output1), erroringWebSink(new Error('die'))], {
    ignoreErrors: true
  });

  await webStreamFromArray([1, 3, 5, 7]).pipeTo(f);

  t.equal(f.outputs.length, 1);
  t.notOk(f.isEmpty());
  resolve();
});
