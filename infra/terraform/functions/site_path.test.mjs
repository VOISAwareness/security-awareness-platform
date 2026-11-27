// The default behaviour's viewer-request function (site_path.js.tftpl),
// rendered as Terraform would with a sample allow-list, then run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./site_path.js.tftpl', import.meta.url), 'utf8');
assert.equal((source.match(/\$\{/g) || []).length, 1, 'the only template placeholder is allowed_cidrs');
const render = (cidrs) => new Function(`${source.replace('${allowed_cidrs}', JSON.stringify(cidrs))}; return handler;`)();
const handler = render(['203.0.113.0/24', '198.51.100.7/32']);
const run = (uri, ip = '203.0.113.9') => handler({ request: { uri }, viewer: { ip } });
const ID = '0123456789abcdef0123456789abcdef';

test('training packages and pictures are served to anyone, as before', () => {
  assert.equal(run(`/scorm/${ID}/index.html`, '8.8.8.8').uri, `/training-content/${ID}/index.html`);
  assert.equal(run(`/media/${ID}/logo.png`, '8.8.8.8').uri, `/public-media/${ID}/logo.png`);
  assert.equal(run(`/scorm/${ID}/../secret`, '203.0.113.9').statusCode, 404);
  assert.equal(run('/scorm/not-an-id/x', '203.0.113.9').statusCode, 404);
  assert.equal(run(`/media/${ID}/..`, '203.0.113.9').statusCode, 404);
  assert.equal(run('/media/whatever', '203.0.113.9').statusCode, 404);
});

test('the app is only for the allowed addresses', () => {
  for (const ip of ['203.0.113.0', '203.0.113.255', '198.51.100.7']) assert.equal(run('/home', ip).uri, '/app/index.html', ip);
  for (const ip of ['203.0.114.1', '198.51.100.8', '8.8.8.8', '2001:db8::1', '', null, '1.2.3', '300.1.1.1', '01.2.3.4.5']) {
    const res = handler({ request: { uri: '/home' }, viewer: { ip } });
    assert.equal(res.statusCode, 403, String(ip));
    assert.equal(res.headers['cache-control'].value, 'no-store');
  }
  assert.equal(render([])({ request: { uri: '/' }, viewer: { ip: '203.0.113.9' } }).statusCode, 403); // an empty list lets no one in
  assert.equal(handler({ request: { uri: '/' } }).statusCode, 403); // no viewer address
});

test('pages get index.html; files of the build are served as themselves', () => {
  assert.equal(run('/').uri, '/app/index.html');
  assert.equal(run('/analytics').uri, '/app/index.html');
  assert.equal(run('/my-training/details/TP-00001').uri, '/app/index.html');
  assert.equal(run('/new-scenario/details').uri, '/app/index.html');
  assert.equal(run('/assets/index-BdSGFVmF.js').uri, '/app/assets/index-BdSGFVmF.js');
  assert.equal(run('/assets/v-shield-XO8b68aQ.webp').uri, '/app/assets/v-shield-XO8b68aQ.webp');
  assert.equal(run('/favicon.svg').uri, '/app/favicon.svg');
  assert.equal(run('/index.html').uri, '/app/index.html');
  // nothing outside app/ through these paths
  assert.equal(run('/assets/../training-content/x').uri, '/app/index.html');
  assert.equal(run('/terraform/state/poc.tfstate').uri, '/app/index.html');
  assert.equal(run('/.env').uri, '/app/index.html');
});

test('a /32 and a /0 range', () => {
  const one = render(['192.0.2.10/32']);
  assert.equal(one({ request: { uri: '/' }, viewer: { ip: '192.0.2.10' } }).uri, '/app/index.html');
  assert.equal(one({ request: { uri: '/' }, viewer: { ip: '192.0.2.11' } }).statusCode, 403);
  const all = render(['0.0.0.0/0']);
  assert.equal(all({ request: { uri: '/' }, viewer: { ip: '8.8.8.8' } }).uri, '/app/index.html');
});
