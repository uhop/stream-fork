import test from 'tape-six';

import fork, {route, filter} from '../../src/index.js';
import type {ForkOptions, ForkWritable} from '../../src/fork.js';
import type {Picker, RouteOptions} from '../../src/route.js';
import type {Predicate, FilterOptions} from '../../src/filter.js';

import pickRoundRobin from '../../src/utils/pick-round-robin.js';
import pickByKey from '../../src/utils/pick-by-key.js';

import {Readable, Writable} from 'node:stream';

const readableFrom = (array: unknown[]): Readable => Readable.from(array, {objectMode: true});

const sinkTo = (array: unknown[]): Writable =>
  new Writable({
    objectMode: true,
    write(chunk, _encoding, cb) {
      array.push(chunk);
      cb(null);
    }
  });

test.asPromise('typings fork: broadcast to typed sinks', (t, resolve) => {
  const out1: number[] = [];
  const out2: number[] = [];

  const f: ForkWritable = fork([sinkTo(out1), sinkTo(out2)]);
  const live: ReadonlyArray<Writable> = f.outputs;
  t.equal(live.length, 2);

  f.on('finish', () => {
    t.deepEqual(out1, [1, 2, 3]);
    t.deepEqual(out2, [1, 2, 3]);
    resolve();
  });

  readableFrom([1, 2, 3]).pipe(f);
});

test.asPromise('typings route: round-robin picker', (t, resolve) => {
  const a: number[] = [];
  const b: number[] = [];

  const pick: Picker = pickRoundRobin(2);
  const options: RouteOptions = {pick};
  const r = route([sinkTo(a), sinkTo(b)], options);

  r.on('finish', () => {
    t.deepEqual(a, [1, 3]);
    t.deepEqual(b, [2, 4]);
    resolve();
  });

  readableFrom([1, 2, 3, 4]).pipe(r);
});

test.asPromise('typings filter: predicate subset', (t, resolve) => {
  const evens: number[] = [];
  const odds: number[] = [];

  const isEven: Predicate = chunk => (chunk as number) % 2 === 0;
  const isOdd: Predicate = chunk => (chunk as number) % 2 !== 0;
  const options: FilterOptions = {predicates: [isEven, isOdd]};
  const flt = filter([sinkTo(evens), sinkTo(odds)], options);

  flt.on('finish', () => {
    t.deepEqual(evens, [2, 4]);
    t.deepEqual(odds, [1, 3]);
    resolve();
  });

  readableFrom([1, 2, 3, 4]).pipe(flt);
});

test('typings: options surface and picker helpers', t => {
  const forkOpts: ForkOptions = {ignoreErrors: true, objectMode: true};
  t.ok(forkOpts.ignoreErrors);

  const byKind = pickByKey((chunk: {kind: string}) => chunk.kind, {a: 0, b: 1});
  t.equal(byKind({kind: 'a'}), 0);
  t.equal(byKind({kind: 'z'}), undefined);
});

test('typings: ESM default and named exports resolve', t => {
  // Compile-time regression guard for the `.d.ts` ESM default-export trap
  // (learnings L9): `declare function` must precede `declare namespace`, or
  // `import fork from './fork.js'` fails with "has no default export". This
  // body never runs — it only has to type-check across all three primitives.
  const check = (): void => {
    const f: ForkWritable = fork([]);
    f.isEmpty();
    const routeOpts: RouteOptions = {pick: () => 0};
    void route([sinkTo([])], routeOpts);
    const filterOpts: FilterOptions = {predicates: [() => true]};
    void filter([sinkTo([])], filterOpts);
  };
  void check;
  t.pass();
});
