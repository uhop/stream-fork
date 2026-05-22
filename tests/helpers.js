// Node-only test helpers. Importing this file pulls `node:stream`; do not
// reuse from Web tests under `tests/web/` — they have their own
// `tests/web-helpers.js`.

import {Readable, Writable} from 'node:stream';

export const streamFromArray = (array, objectMode = true) =>
  new Readable({
    objectMode,
    read() {
      if (isNaN(this.index)) this.index = 0;
      if (this.index < array.length) {
        const value = array[this.index++];
        this.push(objectMode ? value : value.toString());
      } else {
        this.push(null);
      }
    }
  });

export const streamToArray = (array, objectMode = true) =>
  new Writable({
    objectMode,
    write(chunk, _, callback) {
      array.push(chunk);
      callback(null);
    }
  });
