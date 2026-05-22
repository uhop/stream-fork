/**
 * Broadcast WritableStream. Every chunk is forwarded to every live downstream
 * writer; `Promise.all` over the per-output writes gates upstream backpressure
 * to the slowest downstream. Failed downstreams are dropped from the live set;
 * in default mode the first error per round rejects the upstream `pipeTo`'s
 * promise. Generalizes `ReadableStream.tee()` to N outputs and avoids `tee()`'s
 * per-branch infinite buffering.
 *
 * @param outputs array of downstream `WritableStream` instances; may be empty
 * @param options optional `ignoreErrors` flag plus an optional `queuingStrategy`
 * @returns a WritableStream that broadcasts every chunk to every live downstream
 */
declare function fork(outputs: WritableStream[], options?: fork.ForkOptions): fork.ForkWritable;

declare namespace fork {
  /** Options accepted by `fork()` (Web variant). */
  export interface ForkOptions {
    /**
     * When truthy, downstream errors are silently swallowed and the failing
     * stream is dropped from the live outputs view. When falsy (default), the
     * first downstream error per round rejects the upstream `pipeTo` and
     * aborts the WritableStream's `write` callback.
     */
    ignoreErrors?: boolean;
    /** Optional `QueuingStrategy` forwarded to the underlying WritableStream. */
    queuingStrategy?: QueuingStrategy;
  }

  /**
   * WritableStream returned by `fork()`. Adds two read-only public-API members
   * on top of the standard WritableStream surface.
   */
  export interface ForkWritable extends WritableStream {
    /**
     * Snapshot of the currently-live downstream WritableStreams. Recomputed
     * on each access — dead downstreams are filtered out.
     */
    readonly outputs: ReadonlyArray<WritableStream>;

    /**
     * `true` when every downstream has failed (so the broadcast is effectively
     * a sink). Equivalent to `outputs.length === 0` on the live snapshot.
     */
    isEmpty(): boolean;
  }
}

type ForkOptions = fork.ForkOptions;
type ForkWritable = fork.ForkWritable;

export default fork;
export {fork};
export type {ForkOptions, ForkWritable};
