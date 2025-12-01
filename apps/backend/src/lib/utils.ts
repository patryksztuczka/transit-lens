import { Transform } from "node:stream";

export function stripBOM() {
  let firstChunk = true;

  return new Transform({
    transform(chunk, _encoding, callback) {
      let content = chunk;
      if (firstChunk) {
        firstChunk = false;

        if (content.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
          content = content.slice(3);
        }
      }

      callback(null, content);
    },
  });
}
