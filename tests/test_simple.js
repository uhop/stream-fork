'use strict';

const unit = require('heya-unit');

const Fork = require('../main');
const {streamFromArray, streamToArray} = require('./helpers');

unit.add(module, [
  function test_simpleClass(t) {
    const async = t.startAsync('test_simpleClass');

    const input = [1, 3, 5, 7],
      output1 = [],
      output2 = [],
      output3 = [],
      fork = new Fork([streamToArray(output1), streamToArray(output2), streamToArray(output3)]);

    streamFromArray(input).pipe(fork);

    fork.on('finish', () => {
      eval(t.TEST('t.unify(output1, input)'));
      eval(t.TEST('t.unify(output2, input)'));
      eval(t.TEST('t.unify(output3, input)'));
      async.done();
    });
  },
  function test_simpleFunction(t) {
    const async = t.startAsync('test_simpleFunction');

    const input = [1, 3, 5, 7],
      output1 = [],
      output2 = [],
      output3 = [],
      fork = Fork.fork([streamToArray(output1), streamToArray(output2), streamToArray(output3)]);

    streamFromArray(input).pipe(fork);

    fork.on('finish', () => {
      eval(t.TEST('t.unify(output1, input)'));
      eval(t.TEST('t.unify(output2, input)'));
      eval(t.TEST('t.unify(output3, input)'));
      async.done();
    });
  },
  function test_simpleString(t) {
    const async = t.startAsync('test_simpleString');

    const input = [1, 3, 5, 7],
      output1 = [],
      output2 = [],
      output3 = [],
      fork = new Fork(
        [streamToArray(output1, false), streamToArray(output2, false), streamToArray(output3, false)],
        {}
      );

    streamFromArray(input, false).pipe(fork);

    fork.on('finish', () => {
      const str = input.join('');
      eval(t.TEST('t.unify(output1.join(""), str)'));
      eval(t.TEST('t.unify(output2.join(""), str)'));
      eval(t.TEST('t.unify(output3.join(""), str)'));
      async.done();
    });
  }
]);
