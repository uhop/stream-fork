'use strict';

const {Writable} = require('stream');

const unit = require('heya-unit');

const Fork = require('../main');
const {streamFromArray, streamToArray} = require('./helpers');

unit.add(module, [
  function test_errorsSimple(t) {
    const async = t.startAsync('test_errorsSimple');

    let output2 = 0;
    const input = [1, 3, 5, 7],
      output1 = [],
      fork = new Fork([
        streamToArray(output1),
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            callback(Error('Sudden error!'));
          }
        })
      ]);

    const inp = streamFromArray(input);
    inp.pipe(fork);

    inp.on('error', error => {
      eval(t.TEST('error.message === "Sudden error!"'));
      // async.done();
    });
    inp.on('end', () => {
      eval(t.TEST('!t.unify(output1, input)'));
      // async.done();
    });

    fork.on('error', error => {
      eval(t.TEST('error.message === "Sudden error!"'));
      async.done();
    });
    fork.on('finish', () => {
      t.test(false); // shouldn't be here
      // async.done();
    });
  },
  function test_errorsIgnore(t) {
    const async = t.startAsync('test_errorsIgnore');

    let output2 = 0;
    const input = [1, 3, 5, 7],
      output1 = [],
      fork = new Fork([
        streamToArray(output1),
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            callback(Error('Sudden error!'));
          }
        })
      ], {objectMode: true, ignoreErrors: true});

    streamFromArray(input).pipe(fork);

    fork.on('error', error => {
      t.test(false); // shouldn't be here
      async.done();
    });
    fork.on('finish', () => {
      eval(t.TEST('t.unify(output1, input)'));
      async.done();
    });
  }
]);
