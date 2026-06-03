import test from 'tape-six';

import fork, {route, filter} from '../../src/web/index.js';
import type {ForkOptions, ForkWritable} from '../../src/web/fork.js';
import type {Picker, RouteOptions} from '../../src/web/route.js';
import type {Predicate, FilterOptions} from '../../src/web/filter.js';

import pickRoundRobin from '../../src/utils/pick-round-robin.js';
import pickByKey from '../../src/utils/pick-by-key.js';

const webReadableFrom = <T>(array: T[]): ReadableStream<T> =>
  new ReadableStream<T>({
    start(controller) {
      for (const value of array) controller.enqueue(value);
      controller.close();
    }
  });

const webSinkTo = <T>(array: T[]): WritableStream<T> =>
  new WritableStream<T>({
    write(chunk) {
      array.push(chunk);
    }
  });

test.asPromise('typings fork (web): broadcast to typed sinks', async (t, resolve) => {
  const out1: number[] = [];
  const out2: number[] = [];

  const f: ForkWritable = fork([webSinkTo(out1), webSinkTo(out2)]);
  const live: ReadonlyArray<WritableStream> = f.outputs;
  t.equal(live.length, 2);

  await webReadableFrom([1, 2, 3]).pipeTo(f);

  t.deepEqual(out1, [1, 2, 3]);
  t.deepEqual(out2, [1, 2, 3]);
  resolve();
});

test.asPromise('typings route (web): round-robin picker', async (t, resolve) => {
  const a: number[] = [];
  const b: number[] = [];

  const pick: Picker = pickRoundRobin(2);
  const options: RouteOptions = {pick};
  const r = route([webSinkTo(a), webSinkTo(b)], options);

  await webReadableFrom([1, 2, 3, 4]).pipeTo(r);

  t.deepEqual(a, [1, 3]);
  t.deepEqual(b, [2, 4]);
  resolve();
});

test.asPromise('typings filter (web): predicate subset', async (t, resolve) => {
  const evens: number[] = [];
  const odds: number[] = [];

  const isEven: Predicate = chunk => (chunk as number) % 2 === 0;
  const isOdd: Predicate = chunk => (chunk as number) % 2 !== 0;
  const options: FilterOptions = {predicates: [isEven, isOdd]};
  const flt = filter([webSinkTo(evens), webSinkTo(odds)], options);

  await webReadableFrom([1, 2, 3, 4]).pipeTo(flt);

  t.deepEqual(evens, [2, 4]);
  t.deepEqual(odds, [1, 3]);
  resolve();
});

test('typings (web): options surface and picker helpers', t => {
  const forkOpts: ForkOptions = {ignoreErrors: true};
  t.ok(forkOpts.ignoreErrors);

  const byKind = pickByKey((chunk: {kind: string}) => chunk.kind, {a: 0, b: 1});
  t.equal(byKind({kind: 'a'}), 0);
  t.equal(byKind({kind: 'z'}), undefined);
});
