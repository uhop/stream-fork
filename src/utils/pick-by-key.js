// @ts-self-types="./pick-by-key.d.ts"

'use strict';

const pickByKey = (keyFn, table) => {
  if (typeof keyFn != 'function') {
    throw TypeError('pickByKey: keyFn must be a function');
  }
  if (!table || (typeof table != 'object' && !(table instanceof Map))) {
    throw TypeError('pickByKey: table must be an object or Map of key→index');
  }
  const lookup = table instanceof Map ? k => table.get(k) : k => table[k];
  return chunk => {
    const idx = lookup(keyFn(chunk));
    return typeof idx == 'number' ? idx : undefined;
  };
};

module.exports = pickByKey;
