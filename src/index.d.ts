/// <reference types="node" />

import {Writable, WritableOptions} from 'node:stream';

declare namespace Fork {
  interface ForkOptions extends WritableOptions {
    /**
     * When truthy, downstream errors are silently dropped and the failing stream
     * is removed from `outputs`. When falsy (default), the first downstream
     * error is re-emitted on the `Fork` instance.
     */
    ignoreErrors?: boolean;
  }
}

/**
 * A Writable stream that duplicates every chunk to N downstream Writables,
 * propagating backpressure from the slowest downstream and surfacing the first
 * downstream error (unless `ignoreErrors` is set).
 */
declare class Fork extends Writable {
  /** The downstream Writables. Streams that error out are removed in place. */
  outputs: Writable[];

  constructor(outputs: Writable[], options?: Fork.ForkOptions);

  /** `true` when `outputs` is empty (no downstreams left to fan out to). */
  isEmpty(): boolean;

  /** Factory equivalent of `new Fork(outputs, options)`. */
  static fork(outputs: Writable[], options?: Fork.ForkOptions): Fork;
}

export = Fork;
