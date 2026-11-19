import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadTarget } from './api.js';

const URL_ = 'https://bucket.s3.amazonaws.com/uploads/x.zip?X-Amz-Signature=1';

test('uploads go straight to S3 where its CORS allows the page', () => {
  assert.equal(uploadTarget(URL_, { dev: false, host: 'app.example.com' }), URL_); // a build
  assert.equal(uploadTarget(URL_, { dev: true, host: 'localhost' }), URL_);
  // GitHub Codespaces: its port forwarding refuses large bodies, so never the proxy
  assert.equal(uploadTarget(URL_, { dev: true, host: 'abc-57qjpxw7qrqhvgwx-5173.app.github.dev' }), URL_);
});

test('other dev addresses (tunnels) go through the dev server', () => {
  assert.equal(uploadTarget(URL_, { dev: true, host: 'my-tunnel.trycloudflare.com' }), `/__s3-upload?url=${encodeURIComponent(URL_)}`);
});
