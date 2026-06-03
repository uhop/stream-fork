'use strict';

const {test} = require('tape-six');

const {Readable, Writable} = require('node:stream');

const {fork, route, filter} = require('../../src/index.js');

const readableFrom = array => Readable.from(array, {objectMode: true});

const sinkTo = array =>
  new Writable({
    objectMode: true,
    write(chunk, _encoding, cb) {
      array.push(chunk);
      cb(null);
    }
  });

test.asPromise('cjs: require fork — broadcast', (t, resolve) => {
  const out1 = [];
  const out2 = [];
  const f = fork([sinkTo(out1), sinkTo(out2)]);

  t.equal(f.outputs.length, 2);
  t.notOk(f.isEmpty());

  f.on('finish', () => {
    t.deepEqual(out1, [1, 2, 3]);
    t.deepEqual(out2, [1, 2, 3]);
    resolve();
  });

  readableFrom([1, 2, 3]).pipe(f);
});

test.asPromise('cjs: require route — round-robin picker', (t, resolve) => {
  const {pickRoundRobin} = require('../../src/utils/pick-round-robin.js');

  const a = [];
  const b = [];
  const r = route([sinkTo(a), sinkTo(b)], {pick: pickRoundRobin(2)});

  r.on('finish', () => {
    t.deepEqual(a, [1, 3]);
    t.deepEqual(b, [2, 4]);
    resolve();
  });

  readableFrom([1, 2, 3, 4]).pipe(r);
});

test.asPromise('cjs: require filter — predicate subset', (t, resolve) => {
  const evens = [];
  const odds = [];
  const flt = filter([sinkTo(evens), sinkTo(odds)], {
    predicates: [x => x % 2 === 0, x => x % 2 !== 0]
  });

  flt.on('finish', () => {
    t.deepEqual(evens, [2, 4]);
    t.deepEqual(odds, [1, 3]);
    resolve();
  });

  readableFrom([1, 2, 3, 4]).pipe(flt);
});

test('cjs: require picker helpers via subpaths', t => {
  const {pickByKey} = require('../../src/utils/pick-by-key.js');
  const {pickFirstMatch} = require('../../src/utils/pick-first-match.js');

  const byKind = pickByKey(chunk => chunk.kind, {a: 0, b: 1});
  t.equal(byKind({kind: 'a'}), 0);
  t.equal(byKind({kind: 'b'}), 1);
  t.equal(byKind({kind: 'z'}), undefined);

  const firstMatch = pickFirstMatch([x => x < 0, x => x === 0]);
  t.equal(firstMatch(-5), 0);
  t.equal(firstMatch(0), 1);
  t.equal(firstMatch(7), undefined);
});

test('cjs: subpath require exposes default with a named mirror', t => {
  const routeMod = require('../../src/route.js');
  const filterMod = require('../../src/filter.js');

  t.equal(typeof routeMod.route, 'function');
  t.equal(routeMod.route, routeMod.default); // named export mirrors the default
  t.equal(typeof filterMod.filter, 'function');
  t.equal(filterMod.filter, filterMod.default);
});
