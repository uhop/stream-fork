/// <reference types="node" />

import {Writable} from 'node:stream';

/**
 * Internal helper: wrap a `Writable` so per-chunk writes / final end become
 * awaitable Promises. The wrapper installs its own `'error'` listener so
 * Node never crashes on an otherwise-unhandled error, and tracks "dead" state
 * so subsequent operations resolve immediately. Used by `fork`, `route`, and
 * `filter`.
 *
 * @param stream the Writable to wrap
 * @returns a `StreamPusher` for the wrapped stream
 */
declare function makeStreamPusher(stream: Writable): makeStreamPusher.StreamPusher;

declare namespace makeStreamPusher {
  /**
   * Promise-based wrapper around a Writable, returned by `makeStreamPusher`.
   * Encapsulates the per-stream state every primitive (`fork`, `route`,
   * `filter`) needs: Promise-wrapping the write/end callbacks, tracking dead
   * state, and preventing Node from crashing on otherwise-unhandled errors.
   *
   * Internal — not exported publicly. The contract may change between
   * minor releases.
   */
  export interface StreamPusher {
    /**
     * Forward `chunk` to the wrapped Writable, resolving with the error from
     * the write callback (or any sync throw from `stream.write`), or `null`
     * on success. Once dead, resolves immediately with the stored error
     * without touching the wrapped stream.
     *
     * @param chunk the chunk to write
     * @param encoding optional encoding hint passed through to the Writable
     * @returns a Promise resolving to the write error or `null`
     */
    push(chunk: unknown, encoding?: BufferEncoding): Promise<Error | null>;

    /**
     * End the wrapped Writable, resolving with the error from the end callback
     * (or any sync throw from `stream.end`), or `null` on success. Once dead,
     * resolves immediately with the stored error.
     *
     * @returns a Promise resolving to the end error or `null`
     */
    end(): Promise<Error | null>;

    /**
     * `true` once any error has been observed via the write callback, a sync
     * throw, or the wrapped stream's `'error'` event.
     *
     * @returns the current dead state
     */
    isDead(): boolean;

    /** The wrapped Writable. */
    readonly stream: Writable;
  }
}

type StreamPusher = makeStreamPusher.StreamPusher;

export default makeStreamPusher;
export {makeStreamPusher};
export type {StreamPusher};
