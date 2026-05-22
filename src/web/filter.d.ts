/**
 * Multi-target conditional WritableStream. For each incoming chunk, every
 * output whose predicate returns truthy receives the chunk; the slowest of the
 * selected subset gates upstream. Generalizes both `fork` (all-true) and
 * `route` (exactly-one).
 *
 * @param outputs non-empty array of downstream `WritableStream` instances
 * @param options required; must include `predicates` of the same length as `outputs`
 * @returns a WritableStream that forwards each chunk to the predicate-selected subset
 * @throws {TypeError} if `outputs` is empty, or `predicates` length mismatches `outputs`, or any predicate is not a function
 */
declare function filter(
  outputs: WritableStream[],
  options: filter.FilterOptions
): filter.FilterWritable;

declare namespace filter {
  /**
   * Predicate called once per chunk per output to decide whether that output
   * should receive the chunk.
   *
   * @param chunk the incoming chunk
   * @returns `true` to forward the chunk to this output, `false` to skip it for this round
   */
  export type Predicate = (chunk: unknown) => boolean;

  /** Options accepted by `filter()` (Web variant). `predicates` is required. */
  export interface FilterOptions {
    /**
     * Required: one predicate per output. For each incoming chunk, every
     * output whose predicate returns truthy receives the chunk. An all-true
     * mask is equivalent to `fork`; an all-false mask drops the chunk.
     */
    predicates: Predicate[];

    /**
     * When truthy, downstream errors are silently swallowed; the failing
     * stream is dropped from the live outputs view. When falsy (default), the
     * first error from the selected subset rejects upstream.
     */
    ignoreErrors?: boolean;

    /** Optional `QueuingStrategy` forwarded to the underlying WritableStream. */
    queuingStrategy?: QueuingStrategy;
  }

  /**
   * WritableStream returned by `filter()`. Adds two read-only public-API
   * members on top of the standard WritableStream surface.
   */
  export interface FilterWritable extends WritableStream {
    /**
     * Snapshot of the currently-live downstream WritableStreams. Recomputed
     * on each access — dead downstreams are filtered out.
     */
    readonly outputs: ReadonlyArray<WritableStream>;

    /** `true` when every downstream has failed. */
    isEmpty(): boolean;
  }
}

type Predicate = filter.Predicate;
type FilterOptions = filter.FilterOptions;
type FilterWritable = filter.FilterWritable;

export default filter;
export {filter};
export type {Predicate, FilterOptions, FilterWritable};
