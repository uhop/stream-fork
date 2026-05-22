import test from 'tape-six';

import filter from '../../src/web/filter.js';
import {webStreamFromArray, webStreamToArray, erroringWebSink} from '../web-helpers.js';

test.asPromise(
  'filter errors (web): downstream error rejects pipeTo (default)',
  async (t, resolve) => {
    const output1 = [];
    const f = filter([webStreamToArray(output1), erroringWebSink(new Error('Sudden error!'))], {
      predicates: [() => true, () => true]
    });

    try {
      await webStreamFromArray([1, 2, 3]).pipeTo(f);
      t.fail('pipeTo should have rejected');
    } catch (err) {
      t.equal(err.message, 'Sudden error!');
    }
    resolve();
  }
);

test.asPromise(
  'filter errors (web): ignoreErrors swallows downstream failures',
  async (t, resolve) => {
    const input = [1, 2, 3, 4];
    const output1 = [];
    const f = filter([webStreamToArray(output1), erroringWebSink(new Error('boom'))], {
      predicates: [() => true, () => true],
      ignoreErrors: true
    });

    await webStreamFromArray(input).pipeTo(f);

    t.deepEqual(output1, input);
    resolve();
  }
);

test.asPromise('filter errors (web): dead downstream removed from outputs', async (t, resolve) => {
  const output1 = [];
  const f = filter([webStreamToArray(output1), erroringWebSink(new Error('die'))], {
    predicates: [() => true, () => true],
    ignoreErrors: true
  });

  await webStreamFromArray([1, 2, 3]).pipeTo(f);

  t.equal(f.outputs.length, 1);
  t.notOk(f.isEmpty());
  resolve();
});
