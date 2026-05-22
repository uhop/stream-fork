import test from 'tape-six';

import pickRoundRobin from '../../src/utils/pick-round-robin.js';
import pickByHash from '../../src/utils/pick-by-hash.js';
import pickByKey from '../../src/utils/pick-by-key.js';
import pickFirstMatch from '../../src/utils/pick-first-match.js';

test('pickRoundRobin: cycles 0..count-1', t => {
  const pick = pickRoundRobin(3);
  t.equal(pick(), 0);
  t.equal(pick(), 1);
  t.equal(pick(), 2);
  t.equal(pick(), 0);
  t.equal(pick(), 1);
});

test('pickRoundRobin: throws on bad count', t => {
  t.throws(() => pickRoundRobin(0), TypeError);
  t.throws(() => pickRoundRobin(-1), TypeError);
  t.throws(() => pickRoundRobin(1.5), TypeError);
  t.throws(() => pickRoundRobin('three'), TypeError);
});

test('pickByHash: stable index per key', t => {
  const pick = pickByHash(chunk => chunk.userId, 4);
  const a = pick({userId: 'alice', n: 1});
  const b = pick({userId: 'alice', n: 2});
  const c = pick({userId: 'alice', n: 3});
  t.equal(a, b);
  t.equal(b, c);
  t.ok(a >= 0 && a < 4);
});

test('pickByHash: numeric key uses key | 0 modulo count', t => {
  const pick = pickByHash(chunk => chunk.id, 5);
  t.equal(pick({id: 0}), 0);
  t.equal(pick({id: 1}), 1);
  t.equal(pick({id: 7}), 2);
  t.equal(pick({id: 10}), 0);
});

test('pickByKey: explicit table object lookup', t => {
  const pick = pickByKey(c => c.tier, {gold: 0, silver: 1, bronze: 2});
  t.equal(pick({tier: 'gold'}), 0);
  t.equal(pick({tier: 'silver'}), 1);
  t.equal(pick({tier: 'unknown'}), undefined);
});

test('pickByKey: Map lookup', t => {
  const table = new Map([
    [42, 0],
    [99, 1]
  ]);
  const pick = pickByKey(c => c.code, table);
  t.equal(pick({code: 42}), 0);
  t.equal(pick({code: 99}), 1);
  t.equal(pick({code: 7}), undefined);
});

test('pickFirstMatch: first true predicate wins', t => {
  const pick = pickFirstMatch([c => c > 100, c => c > 10, () => true]);
  t.equal(pick(200), 0);
  t.equal(pick(50), 1);
  t.equal(pick(5), 2);
});

test('pickFirstMatch: returns undefined when nothing matches', t => {
  const pick = pickFirstMatch([c => c > 100]);
  t.equal(pick(5), undefined);
});
