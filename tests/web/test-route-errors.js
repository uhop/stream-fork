import test from 'tape-six';

import route from '../../src/web/route.js';
import {webStreamFromArray, webStreamToArray, erroringWebSink} from '../web-helpers.js';

test.asPromise(
  'route errors (web): downstream error rejects pipeTo (default)',
  async (t, resolve) => {
    const r = route([erroringWebSink(new Error('Sudden error!'))], {pick: () => 0});

    try {
      await webStreamFromArray([1, 2, 3]).pipeTo(r);
      t.fail('pipeTo should have rejected');
    } catch (err) {
      t.equal(err.message, 'Sudden error!');
    }
    resolve();
  }
);

test.asPromise(
  'route errors (web): ignoreErrors swallows downstream failures',
  async (t, resolve) => {
    const input = [1, 2, 3, 4];
    const output = [];
    const r = route([erroringWebSink(new Error('boom')), webStreamToArray(output)], {
      pick: chunk => (chunk === 1 ? 0 : 1),
      ignoreErrors: true
    });

    await webStreamFromArray(input).pipeTo(r);

    t.deepEqual(output, [2, 3, 4]);
    resolve();
  }
);

test.asPromise('route errors (web): dead downstream removed from outputs', async (t, resolve) => {
  const output = [];
  const r = route([erroringWebSink(new Error('die')), webStreamToArray(output)], {
    pick: chunk => (chunk === 1 ? 0 : 1),
    ignoreErrors: true
  });

  await webStreamFromArray([1, 2, 3]).pipeTo(r);

  t.equal(r.outputs.length, 1);
  t.notOk(r.isEmpty());
  resolve();
});
