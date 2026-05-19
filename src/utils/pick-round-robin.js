// @ts-self-types="./pick-round-robin.d.ts"

'use strict';

const pickRoundRobin = count => {
  if (typeof count != 'number' || count < 1 || !Number.isInteger(count)) {
    throw TypeError('pickRoundRobin: count must be a positive integer');
  }
  let i = 0;
  return () => {
    const idx = i;
    i = (i + 1) % count;
    return idx;
  };
};

module.exports = pickRoundRobin;
