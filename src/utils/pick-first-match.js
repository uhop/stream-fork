// @ts-self-types="./pick-first-match.d.ts"

const pickFirstMatch = predicates => {
  if (!Array.isArray(predicates) || !predicates.length) {
    throw TypeError('pickFirstMatch: predicates must be a non-empty array of functions');
  }
  if (predicates.some(p => typeof p != 'function')) {
    throw TypeError('pickFirstMatch: every predicate must be a function');
  }
  return (chunk, encoding) => {
    for (let i = 0, n = predicates.length; i < n; ++i) {
      if (predicates[i](chunk, encoding)) return i;
    }
    return undefined;
  };
};

export default pickFirstMatch;
export {pickFirstMatch};
