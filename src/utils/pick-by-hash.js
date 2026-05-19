// @ts-self-types="./pick-by-hash.d.ts"

'use strict';

const hashString = s => {
  let h = 5381;
  for (let i = 0, n = s.length; i < n; ++i) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
};

const pickByHash = (keyFn, count) => {
  if (typeof keyFn != 'function') {
    throw TypeError('pickByHash: keyFn must be a function');
  }
  if (typeof count != 'number' || count < 1 || !Number.isInteger(count)) {
    throw TypeError('pickByHash: count must be a positive integer');
  }
  return chunk => {
    const key = keyFn(chunk);
    if (typeof key == 'number' && Number.isFinite(key)) {
      return (((key | 0) >>> 0) % count) | 0;
    }
    return hashString(String(key)) % count;
  };
};

module.exports = pickByHash;
