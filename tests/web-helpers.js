// Pure + Web-Streams test helpers. Importing this file must not pull `node:*`
// — these helpers are reused by Web tests under `tests/web/` and load in the
// browser via `tape-six-playwright`.

export const webStreamFromArray = array => {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < array.length) controller.enqueue(array[i++]);
      else controller.close();
    }
  });
};

export const webStreamToArray = array =>
  new WritableStream({
    write(chunk) {
      array.push(chunk);
    }
  });

export const collectWebStream = async stream => {
  const out = [];
  const reader = stream.getReader();
  for (;;) {
    const {value, done} = await reader.read();
    if (done) return out;
    out.push(value);
  }
};

// WritableStream whose `write` always errors with the given reason. Web-side
// analog of `tests/node/test-*-errors.js`'s `erroringWritable` helper.
export const erroringWebSink = error =>
  new WritableStream({
    write() {
      throw error;
    }
  });

// Externally-driven WritableStream that records writes into `events`. Useful
// for tests that need to observe what reached a particular branch.
export const recordingWebSink = events =>
  new WritableStream({
    write(chunk) {
      events.push({type: 'write', chunk});
    },
    close() {
      events.push({type: 'close'});
    },
    abort(reason) {
      events.push({type: 'abort', reason});
    }
  });
