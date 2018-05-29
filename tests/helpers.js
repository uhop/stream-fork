'use strict';

const {Readable, Writable} = require('stream');

const streamFromArray = (array, objectMode = true) =>
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

const streamToArray = (array, objectMode = true) =>
  new Writable({
    objectMode,
    write(chunk, encoding, callback) {
      array.push(chunk);
      callback(null);
    }
  });

module.exports = {streamFromArray, streamToArray};
