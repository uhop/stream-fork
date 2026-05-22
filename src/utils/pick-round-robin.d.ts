/**
 * Round-robin picker factory. Returns a picker that cycles
 * `0, 1, …, count-1` on each call. Pair with `route()` for load-balancing
 * across N parallel workers.
 *
 * Stateful: the returned function increments an internal counter; do not
 * share across multiple routes.
 *
 * @param count number of outputs to cycle through (must be a positive integer)
 * @returns a stateful picker that returns the next index in the cycle on each call
 * @throws {TypeError} if `count` is not a positive integer
 */
declare function pickRoundRobin(count: number): () => number;

export default pickRoundRobin;
export {pickRoundRobin};
