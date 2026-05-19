/**
 * Priority-routing picker factory. Returns a picker that tries each predicate
 * in order and returns the index of the first one to match, or `undefined`
 * to drop the chunk if none match. Pair the last predicate with `() => true`
 * to act as a catch-all.
 *
 * @param predicates non-empty array of predicates; predicate at index `i` decides whether output `i` should receive the chunk
 * @returns a stateless picker that returns the first matching predicate's index, or `undefined`
 * @throws {TypeError} if `predicates` is empty or any entry is not a function
 */
declare function pickFirstMatch<T>(
  predicates: Array<(chunk: T, encoding?: BufferEncoding) => boolean>
): (chunk: T, encoding?: BufferEncoding) => number | undefined;

export = pickFirstMatch;
