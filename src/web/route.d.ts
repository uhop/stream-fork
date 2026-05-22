/**
 * Per-chunk dispatch WritableStream. Each incoming chunk is passed to
 * `options.pick(chunk)`; if the returned index points at a live output, the
 * chunk is forwarded there and that output's write gates upstream. If the
 * picker returns a non-index value or points at a dead slot, the chunk is
 * silently dropped (upstream is unblocked immediately).
 *
 * @param outputs non-empty array of downstream `WritableStream` instances
 * @param options required; must include `pick`
 * @returns a WritableStream that forwards each chunk to one (or zero) downstreams
 * @throws {TypeError} if `outputs` is empty, or `options.pick` is missing or non-callable
 */
declare function route(outputs: WritableStream[], options: route.RouteOptions): route.RouteWritable;

declare namespace route {
  /**
   * Picker function called once per incoming chunk. Returns the index of the
   * output to forward the chunk to, or any non-index value (`undefined`,
   * `null`, `NaN`, negative, out-of-range, non-integer) to drop the chunk.
   *
   * @param chunk the incoming chunk
   * @returns the target output's index in `outputs`, or a non-index value to drop the chunk
   */
  export type Picker = (chunk: unknown) => number | undefined | null;

  /** Options accepted by `route()` (Web variant). `pick` is required. */
  export interface RouteOptions {
    /** Required per-chunk picker. See {@link Picker}. */
    pick: Picker;

    /**
     * When truthy, downstream errors are silently swallowed; the failing
     * stream is dropped from the live outputs view. When falsy (default), the
     * picked downstream's error rejects upstream.
     */
    ignoreErrors?: boolean;

    /** Optional `QueuingStrategy` forwarded to the underlying WritableStream. */
    queuingStrategy?: QueuingStrategy;
  }

  /**
   * WritableStream returned by `route()`. Adds two read-only public-API
   * members on top of the standard WritableStream surface.
   */
  export interface RouteWritable extends WritableStream {
    /**
     * Snapshot of the currently-live downstream WritableStreams. Recomputed
     * on each access — dead downstreams are filtered out.
     */
    readonly outputs: ReadonlyArray<WritableStream>;

    /** `true` when every downstream has failed (every chunk would be dropped). */
    isEmpty(): boolean;
  }
}

type Picker = route.Picker;
type RouteOptions = route.RouteOptions;
type RouteWritable = route.RouteWritable;

export default route;
export {route};
export type {Picker, RouteOptions, RouteWritable};
