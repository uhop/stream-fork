'use strict';

const {Writable} = require('stream');

const waitForMethod = (name, chunk, encoding) => (output, index, array) =>
  output
    ? new Promise(resolve => {
        let error = null;
        try {
          output[name](chunk, encoding, e => {
            e = e || error;
            if (e) array[index] = null;
            resolve(e);
          });
        } catch (e) {
          error = e;
        }
      })
    : Promise.resolve(null);

function reportErrors(callback) {
  return results => {
    const ok = results.every(error => {
      if (error) {
        callback(error);
        return false;
      }
      return true;
    });
    if (ok) {
      callback(null);
    } else {
      this.outputs = this.outputs.filter(output => output);
    }
  };
}

function ignoreErrors(callback) {
  return () => {
    if (this.outputs.some(output => !output)) {
      this.outputs = this.outputs.filter(output => output);
    }
    callback(null);
  };
}

class Fork extends Writable {
  constructor(outputs, options = {objectMode: true}) {
    super(options);
    this.outputs = outputs;
    this.processResults = options && options.ignoreErrors ? ignoreErrors : reportErrors;
    this.on('finish', () => this.outputs.forEach(output => output.end(null, null))); // for Node 6
  }
  _write(chunk, encoding, callback) {
    Promise.all(this.outputs.map(waitForMethod('write', chunk, encoding))).then(this.processResults(callback));
  }
  // _final(callback) { // unavailable in Node 6
  //   Promise.all(this.outputs.map(waitForMethod('end', null, null))).then(this.processResults(callback));
  // }
  isEmpty() {
    return !this.outputs.length;
  }
  static fork(outputs, options = {objectMode: true}) {
    return new Fork(outputs, options);
  }
}

module.exports = Fork;
