/**
 * Explicit-table picker factory. Returns a picker that looks up
 * `keyFn(chunk)` in `table` and returns the mapped output index, or
 * `undefined` to drop the chunk if the key is missing.
 *
 * `table` may be a plain object (keys lookup by `table[key]`) or a `Map`
 * (lookup by `table.get(key)`).
 *
 * @param keyFn extracts the routing key from each chunk
 * @param table key → output-index mapping; plain object for string keys, `Map` for arbitrary keys
 * @returns a stateless picker that maps each chunk's key to an index or `undefined`
 * @throws {TypeError} if `keyFn` is not a function or `table` is not an object/Map
 */
declare function pickByKey<T>(
  keyFn: (chunk: T) => string | number | symbol,
  table: Record<string, number> | ReadonlyMap<unknown, number>
): (chunk: T) => number | undefined;

export default pickByKey;
export {pickByKey};
