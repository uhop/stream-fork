# stream-fork

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]

`stream-fork` creates a chain of object mode transform streams out of regular functions, asynchronous functions, generator functions, and existing Transform and Duplex object mode streams. It eliminates a boilerplate helping to concentrate on functionality without losing the performance.

It is a lightweight, no-dependencies packages, which is distributed under New BSD license.

## Intro

```js
const Fork = require('stream-fork');

// the chain will work on a stream of number objects
const fork = new Fork([
]);
fork.on('data', data => console.log(data));
dataSource.pipe(fork);
```

Making processing pipelines appears to be easy: just chain functions one after another, and we are done. Real life pipelines filter objects out and/or produce more objects out of a few ones. On top of that we have to deal with asynchronous operations, while processing or producing data: networking, databases, files, user responses, and so on. Unequal number of values per stage, and unequal throughput of stages introduced problems like [backpressure](https://nodejs.org/en/docs/guides/backpressuring-in-streams/), which requires algorithms implemented by [streams](https://nodejs.org/api/stream.html).

While a lot of API improvements were made to make streams easy to use, in reality, a lot of boilerplate is required when creaing a pipeline. `stream-chain` eliminates most of it.

## Installation

```
npm i stream-fork
```

## Documentation


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
