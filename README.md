# stream-fork

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]

`stream-fork` is a [Writable stream](https://nodejs.org/api/stream.html#stream_writable_streams), which writes into dependent Writable streams properly handling [backpressure](https://nodejs.org/en/docs/guides/backpressuring-in-streams/). It is a way to make forks in a linear pipeline of streams.

`stream-fork` is a lightweight, no-dependencies micro-package. It is distributed under New BSD license.

## Intro

```js
const Fork = require('stream-fork');
const zlib = require('zlib');

const gzip = zlib.createGzip();
gzip.pipe(fs.createWriteStream('log.txt.gz'));

// push data to both the gzip chain and stdout
const forkStream = new Fork([gzip, process.stdout], {});
dataSource.pipe(forkStream);

// now we have data on our screen and as a compressed log file
```

Originally `stream-fork` was used internally with [stream-chain](https://www.npmjs.com/package/stream-chain) and [stream-json](https://www.npmjs.com/package/stream-json) to create flexible data-processing pipelines.

## Installation

```
npm i stream-fork
```

## Documentation

`Fork`, which is returned by `require('stream-fork')`, is a specialized Writable stream. It propagates every piece of data downstream to its dependent Writable streams (including [Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform) and [Duplex](https://nodejs.org/api/stream.html#stream_class_stream_duplex) streams).

Many details about this package can be discovered by looking at test files located in `tests/`, and by looking at the source code in `main.js`.

### Constructor: `new Fork(outputs[, options])`

The constructor accepts following arguments:

* `outputs` is an array of Writable streams, which will be used duplicate written chunks or items.
* `options` is an options object, which is used to create a Writable stream. Read all about it in [Implementing a Writable stream](https://nodejs.org/api/stream.html#stream_implementing_a_writable_stream). If it is not specified or falsy, `{objectMode: true}` is assumed. This default is useful for creating object mode streams.
  * Additionally following custom options are recognized:
    * `ignoreErrors` is a flag. When its value is truthy, a `Fork` instance never fails on `write()` silently ignoring downstream errors. Otherwise, the first encountered downstream error is reported upstream as its own error. The default: `false`.

```js
const forkObj = new Fork(streams);     // object mode
const forkChk = new Fork(streams, {}); // chunk mode (text or buffers)
```

### Property: `outputs`

It is an array of Writable streams supplied in the constructor above. If a stream fails on writing a chunk, eventually it will be removed from the array.

```js
const forkStream = new Fork(streams);
forkStream.outputs.length === streams.length; // true
```

### Method: `isEmpty()`

It returns `true` if `outputs` property is empty, and `false` otherwise. If `isEmpty()` is `true`, it means that the stream do not duplicate data.

```js
const forkStream = new Fork([]);
forkStream.isEmpty(); // true
```

### Static method: `fork(outputs[, options])`

It is a factory function, which accepts the same arguments as the constructor, and returns a fully constructed `Fork` object.

```js
// replicating the introduction example above
const {fork} = require('stream-fork');
dataSource.pipe(fork([gzip, process.stdout], {}));
```

## Release History

- 1.0.0 *The initial release.*

[npm-image]:      https://img.shields.io/npm/v/stream-fork.svg
[npm-url]:        https://npmjs.org/package/stream-fork
[deps-image]:     https://img.shields.io/david/uhop/stream-fork.svg
[deps-url]:       https://david-dm.org/uhop/stream-fork
[dev-deps-image]: https://img.shields.io/david/dev/uhop/stream-fork.svg
[dev-deps-url]:   https://david-dm.org/uhop/stream-fork?type=dev
[travis-image]:   https://img.shields.io/travis/uhop/stream-fork.svg
[travis-url]:     https://travis-ci.org/uhop/stream-fork
