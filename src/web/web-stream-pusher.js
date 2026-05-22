// @ts-self-types="./web-stream-pusher.d.ts"

const makeWebStreamPusher = stream => {
  let dead = false;
  let storedError = null;
  let writer;

  try {
    writer = stream.getWriter();
  } catch (err) {
    dead = true;
    storedError = err;
    return {
      push: () => Promise.resolve(storedError),
      end: () => Promise.resolve(storedError),
      isDead: () => true,
      stream
    };
  }

  writer.closed.catch(err => {
    if (!dead) {
      dead = true;
      storedError = err;
    }
  });

  const push = async chunk => {
    if (dead) return storedError;
    try {
      await writer.ready;
      await writer.write(chunk);
      return null;
    } catch (err) {
      if (!dead) {
        dead = true;
        storedError = err;
      }
      return err;
    }
  };

  const end = async () => {
    if (dead) return storedError;
    try {
      await writer.close();
      return null;
    } catch (err) {
      if (!dead) {
        dead = true;
        storedError = err;
      }
      return err;
    }
  };

  const isDead = () => dead;

  return {push, end, isDead, stream};
};

export default makeWebStreamPusher;
export {makeWebStreamPusher};
