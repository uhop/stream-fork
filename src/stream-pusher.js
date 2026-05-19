// @ts-self-types="./stream-pusher.d.ts"

'use strict';

const makeStreamPusher = stream => {
  let dead = false;
  let storedError = null;

  stream.on('error', error => {
    if (!dead) {
      dead = true;
      storedError = error;
    }
  });

  const push = (chunk, encoding) =>
    dead
      ? Promise.resolve(storedError)
      : new Promise(resolve => {
          try {
            stream.write(chunk, encoding, err => {
              if (err) {
                dead = true;
                storedError = err;
              }
              resolve(err || null);
            });
          } catch (err) {
            dead = true;
            storedError = err;
            resolve(err);
          }
        });

  const end = () =>
    dead
      ? Promise.resolve(storedError)
      : new Promise(resolve => {
          try {
            stream.end(err => {
              if (err) {
                dead = true;
                storedError = err;
              }
              resolve(err || null);
            });
          } catch (err) {
            dead = true;
            storedError = err;
            resolve(err);
          }
        });

  const isDead = () => dead;

  return {push, end, isDead, stream};
};

module.exports = makeStreamPusher;
