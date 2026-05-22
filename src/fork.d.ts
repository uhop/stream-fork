/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

/**
 * Broadcast Writable. Every chunk is forwarded to every live downstream;
 * `Promise.all` over the per-output write-callbacks gates upstream
 * backpressure to the slowest downstream. Failed downstreams are dropped from
 * the live set; in default mode the first error per round is surfaced on the
 * Fork's `'error'` event.
 *
 * @param outputs array of downstream `Writable` streams; may be empty
 * @param options Writable options plus `ignoreErrors`; default `{objectMode: true}`
 * @returns a Writable that broadcasts every chunk to every live downstream
 */
declare function fork(outputs: Writable[], options?: fork.ForkOptions): fork.ForkWritable;

declare namespace fork {
  /**
   * Options accepted by `fork()`. Extends `WritableOptions`; the Writable
   * defaults to `objectMode: true` unless overridden.
   */
  export interface ForkOptions extends WritableOptions {
    /**
     * When truthy, downstream errors are silently swallowed and the failing
     * stream is dropped from the live outputs view. When falsy (default), the
     * first downstream error in any round is forwarded to the Fork's own
     * `'error'` event and to its write-callback.
     */
    ignoreErrors?: boolean;
  }

  /**
   * Writable returned by `fork()`. Adds two read-only public-API members on
   * top of the standard Writable surface.
   */
  export interface ForkWritable extends Writable {
    /**
     * Snapshot of the currently-live downstream Writables. Recomputed on each
     * access — dead downstreams (errored, marked by the internal pusher) are
     * filtered out.
     */
    readonly outputs: ReadonlyArray<Writable>;

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
