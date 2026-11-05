import { strFromU8, unzip } from 'fflate';

// Reads a .zip in the browser with the bundled fflate, in the shape the
// training pages already use from JSZip:
//   const zip = await zipReader.loadAsync(fileOrBlob);
//   zip.files[name].dir, await zip.files[name].async('blob' | 'string' | …)
// JSZip used to be loaded from a CDN at upload time, so on a network that
// blocks cdnjs a package could not be read, and never reached S3.

const toBytes = async (input) => {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (input && typeof input.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer());
  throw new Error('Not a zip file');
};

const unzipAsync = (bytes) =>
  new Promise((resolve, reject) => {
    unzip(bytes, (err, entries) => (err ? reject(new Error(`Could not read the zip: ${err.message || err}`)) : resolve(entries)));
  });

function entry(name, data) {
  return {
    name,
    dir: name.endsWith('/'),
    async(type = 'uint8array') {
      switch (type) {
        case 'string':
          return Promise.resolve(strFromU8(data));
        case 'blob':
          return Promise.resolve(new Blob([data]));
        case 'arraybuffer':
          return Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
        default:
          return Promise.resolve(data);
      }
    },
  };
}

export const zipReader = {
  async loadAsync(input) {
    const entries = await unzipAsync(await toBytes(input));
    const files = {};
    Object.entries(entries).forEach(([name, data]) => {
      files[name] = entry(name, data);
    });
    return { files };
  },
};
