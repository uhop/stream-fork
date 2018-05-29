'use strict';

const {Writable} = require('stream');

const waitForMethod = (name, chunk, encoding) => output =>
  new Promise(resolve => {
    try {
      output[name](chunk, encoding, e => resolve(e));
    } catch (e) {
      // suppress
    }
  });

const callCallback = callback => results => {
  const ok = results.every(error => {
    if (error) {
      callback(error);
      return false;
    }
    return true;
  });
  ok && callback(null);
};

const ignoreErrors = callback => () => callback(null);

class Fork extends Writable {
  constructor(outputs, options = {objectMode: true}) {
    super(options);
    this.outputs = outputs;
    this.processResults = options && options.ignoreErrors ? ignoreErrors : callCallback;
  }
  _write(chunk, encoding, callback) {
    Promise.all(this.outputs.map(waitForMethod('write', chunk, encoding))).then(this.processResults(callback));
  }
  _final(callback) {
    Promise.all(this.outputs.map(waitForMethod('end', null, null))).then(this.processResults(callback));
  }
  static fork(outputs, options = {objectMode: true}) {
    return new Fork(outputs, options);
  }
}

module.exports = Fork;
