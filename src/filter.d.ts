/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

/**
 * Multi-target conditional Writable. For each incoming chunk, every output
 * whose predicate returns truthy receives the chunk; the slowest of the
 * selected subset gates upstream. Generalizes both `fork` (all-true) and
 * `route` (exactly-one).
 *
 * @param outputs non-empty array of downstream `Writable` streams
 * @param options required; must include `predicates` of the same length as `outputs`
 * @returns a Writable that forwards each chunk to the predicate-selected subset
 * @throws {TypeError} if `outputs` is empty, or `predicates` length mismatches `outputs`, or any predicate is not a function
 */
declare function filter(outputs: Writable[], options: filter.FilterOptions): filter.FilterWritable;

declare namespace filter {
  /**
   * Predicate called once per chunk per output to decide whether that output
   * should receive the chunk.
   *
   * @param chunk the incoming chunk
   * @param encoding the chunk's encoding hint (relevant only in chunk mode)
   * @returns `true` to forward the chunk to this output, `false` to skip it for this round
   */
  export type Predicate = (chunk: unknown, encoding?: BufferEncoding) => boolean;

  /**
   * Options accepted by `filter()`. Extends `WritableOptions`; `predicates` is
   * required and must be the same length as `outputs`. The Writable defaults
   * to `objectMode: true` unless overridden.
   */
  export interface FilterOptions extends WritableOptions {
    /**
     * Required: one predicate per output. For each incoming chunk, every
     * output whose predicate returns truthy receives the chunk. An all-true
     * mask is equivalent to `fork`; an all-false mask drops the chunk.
     */
    predicates: Predicate[];

    /**
     * When truthy, downstream errors are silently swallowed; the failing
     * stream is dropped from the live outputs view. When falsy (default), the
     * first error from the selected subset is forwarded to the filter's
     * write-callback and (pre-write only) to its `'error'` event.
     */
    ignoreErrors?: boolean;
  }

  /**
   * Writable returned by `filter()`. Adds two read-only public-API members on
   * top of the standard Writable surface.
   */
  export interface FilterWritable extends Writable {
    /**
     * Snapshot of the currently-live downstream Writables. Recomputed on each
     * access — dead downstreams are filtered out.
     */
    readonly outputs: ReadonlyArray<Writable>;

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
