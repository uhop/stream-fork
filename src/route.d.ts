/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

declare namespace route {
  /**
   * Picker function called once per incoming chunk. Returns the index of the
   * output to forward the chunk to, or any non-index value (`undefined`,
   * `null`, `NaN`, negative, out-of-range, non-integer) to drop the chunk.
   *
   * @param chunk the incoming chunk
   * @param encoding the chunk's encoding hint (relevant only in chunk mode)
   * @returns the target output's index in `outputs`, or a non-index value to drop the chunk
   */
  type Picker = (chunk: unknown, encoding?: BufferEncoding) => number | undefined | null;

  /**
   * Options accepted by `route()`. Extends `WritableOptions`; `pick` is
   * required. The Writable defaults to `objectMode: true` unless overridden.
   */
  interface RouteOptions extends WritableOptions {
    /** Required per-chunk picker. See {@link Picker}. */
    pick: Picker;

    /**
     * When truthy, downstream errors are silently swallowed; the failing
     * stream is dropped from the live outputs view. When falsy (default), the
     * picked downstream's error is forwarded to the route's write-callback and
     * (pre-write only) to its `'error'` event.
     */
    ignoreErrors?: boolean;
  }

  /**
   * Writable returned by `route()`. Adds two read-only public-API members on
   * top of the standard Writable surface.
   */
  interface RouteWritable extends Writable {
    /**
     * Snapshot of the currently-live downstream Writables. Recomputed on each
     * access — dead downstreams are filtered out.
     */
    readonly outputs: ReadonlyArray<Writable>;

    /** `true` when every downstream has failed (every chunk would be dropped). */
    isEmpty(): boolean;
  }
}

/**
 * Per-chunk dispatch Writable. Each incoming chunk is passed to
 * `options.pick(chunk, encoding)`; if the returned index points at a live
 * output, the chunk is forwarded there and that output's write-callback gates
 * upstream. If the picker returns a non-index value or points at a dead slot,
 * the chunk is silently dropped (upstream is unblocked immediately).
 *
 * @param outputs non-empty array of downstream `Writable` streams
 * @param options required; must include `pick` (see {@link route.RouteOptions})
 * @returns a Writable that forwards each chunk to one (or zero) downstreams
 * @throws {TypeError} if `outputs` is empty, or `options.pick` is missing or non-callable
 */
declare function route(outputs: Writable[], options: route.RouteOptions): route.RouteWritable;

export = route;
