/**
 * Hash-partition picker factory. Returns a picker that maps each chunk to a
 * stable index in `[0, count)` via `hash(keyFn(chunk)) % count` — so the
 * same key always lands on the same output. Useful for sharded downstreams
 * where stateful consumers need all records with the same key.
 *
 * Numeric keys are used directly modulo `count`; everything else is
 * stringified and djb2-hashed.
 *
 * @param keyFn extracts the routing key from each chunk
 * @param count number of output shards (must be a positive integer)
 * @returns a stateless picker that returns a stable index in `[0, count)` per key
 * @throws {TypeError} if `keyFn` is not a function or `count` is not a positive integer
 */
declare function pickByHash<T>(keyFn: (chunk: T) => unknown, count: number): (chunk: T) => number;

export default pickByHash;
export {pickByHash};
