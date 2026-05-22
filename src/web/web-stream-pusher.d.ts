/**
 * Internal helper: wrap a `WritableStream` so per-chunk writes / final close
 * become awaitable Promises that resolve to an `Error | null` rather than
 * rejecting. The wrapper acquires a writer, listens to `writer.closed` for
 * upstream-async errors, and tracks "dead" state so subsequent operations
 * resolve immediately. Used by the Web variants of `fork`, `route`, and
 * `filter`.
 *
 * @param stream the WritableStream to wrap
 * @returns a `WebStreamPusher` for the wrapped stream
 */
declare function makeWebStreamPusher(stream: WritableStream): makeWebStreamPusher.WebStreamPusher;

declare namespace makeWebStreamPusher {
  /**
   * Promise-based wrapper around a WritableStream, returned by
   * `makeWebStreamPusher`. Encapsulates the per-stream state every Web
   * variant primitive needs: awaiting backpressure via the writer, catching
   * write/close rejections, observing async errors via `writer.closed`.
   *
   * Internal — not exported publicly. The contract may change between
   * minor releases.
   */
  export interface WebStreamPusher {
    /**
     * Forward `chunk` to the wrapped WritableStream's writer. Awaits
     * `writer.ready` then `writer.write(chunk)`, resolving with the error
     * value on rejection or `null` on success. Once dead, resolves
     * immediately with the stored error.
     *
     * @param chunk the chunk to write
     * @returns a Promise resolving to the write error or `null`
     */
    push(chunk: unknown): Promise<Error | null>;

    /**
     * Close the wrapped writer, resolving with the error on rejection or
     * `null` on success. Once dead, resolves immediately with the stored
     * error.
     *
     * @returns a Promise resolving to the close error or `null`
     */
    end(): Promise<Error | null>;

    /**
     * `true` once any error has been observed via a write/close rejection,
     * the writer's `closed` promise rejecting, or a sync throw from
     * `getWriter()`.
     *
     * @returns the current dead state
     */
    isDead(): boolean;

    /** The wrapped WritableStream. */
    readonly stream: WritableStream;
  }
}

type WebStreamPusher = makeWebStreamPusher.WebStreamPusher;

export default makeWebStreamPusher;
export {makeWebStreamPusher};
export type {WebStreamPusher};
