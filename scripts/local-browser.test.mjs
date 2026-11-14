import { request } from "node:http";
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromeArgs, localFile, serveLocalPage, restrictPage } from './local-browser.mjs';

test('local page validation refuses network URLs, directories and non-page files', () => {
  for (const value of ['https://example.org/', 'http://127.0.0.1/', 'file://server/page.html', 'data:text/html,x', 'javascript:alert(1)', '']) assert.throws(() => localFile(value));
  const dir = mkdtempSync(join(tmpdir(), 'anatomy-policy-'));
  try {
    writeFileSync(join(dir, 'secret.json'), '{}');
    assert.throws(() => localFile(dir));
    assert.throws(() => localFile(join(dir, 'secret.json')));
    const file = join(dir, 'page.html'); writeFileSync(file, '<p>OK</p>');
    assert.equal(localFile(pathToFileURL(file).href), localFile(file));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('temporary server exposes only the selected page, never adjacent files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'anatomy-policy-'));
  let page;
  try {
    const file = join(dir, 'page.html'); writeFileSync(file, '<p>OK</p>');
    writeFileSync(join(dir, 'secret.txt'), 'secret');
    page = await serveLocalPage(file);
    const response = await fetch(page.url);
    assert.equal(await response.text(), '<p>OK</p>');
    assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.match(response.headers.get('content-security-policy'), /frame-src 'none'/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    for (const path of ['/secret.txt', '/.env', '/%2e%2e/secret.txt', '/favicon.ico']) assert.equal((await fetch(new URL(path, page.url))).status, 404);
    assert.equal((await fetch(page.url + '?extra')).status, 404);
    assert.equal((await fetch(page.url, { method: 'POST' })).status, 404);
    const badHost = await new Promise((done, fail) => { const req = request(page.url, { headers: { Host: 'attacker.test' } }, res => { res.resume(); done(res.statusCode); }); req.on('error', fail); req.end(); });
    assert.equal(badHost, 404);
  } finally { page?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('browser flags retain sandboxing and omit privileged file/GPU switches', () => {
  const args = chromeArgs('/tmp/example');
  assert.ok(args.includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(args.includes('--user-data-dir=/tmp/example'));
  assert.doesNotMatch(args.join(' '), /--no-sandbox|--disable-setuid-sandbox|--allow-file-access-from-files|--enable-unsafe-swiftshader|--do-not-de-elevate/);
});

test('CDP denies downloads and all requests except the selected main document', async () => {
  const calls = []; let event;
  const send = async (method, params) => { calls.push([method, params]); return {}; };
  const url = 'http://127.0.0.1:1234/random.html';
  await restrictPage(send, handler => { event = handler; }, url);
  assert.ok(calls.some(([method, p]) => method === 'Browser.setDownloadBehavior' && p.behavior === 'deny'));
  for (const [target, type, allowed] of [[url, 'Document', true], [url, 'Script', false], [url + '?leak', 'Document', false], ['https://attacker.test/', 'Document', false], ['file:///etc/passwd', 'Document', false], ['http://127.0.0.1:9999/', 'XHR', false]]) {
    await event({ method: 'Fetch.requestPaused', params: { requestId: '1', request: { url: target }, resourceType: type } });
    assert.equal(calls.at(-1)[0], allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest');
  }
});

test('unsupported browser policy fails closed', async () => {
  await assert.rejects(restrictPage(async () => ({ error: { message: 'unsupported' } }), () => {}, 'x'), /Cannot enforce/);
});

test('all browser entry points share the policy and removed capabilities stay absent', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  for (const name of ['capture', 'drive', 'turn-check']) {
    const text = readFileSync(new URL(`${name}.mjs`, import.meta.url), 'utf8');
    assert.match(text, /chromeArgs\(profile\)/);
    assert.match(text, /await restrictPage\(/);
    assert.doesNotMatch(text, /--no-sandbox|--allow-file-access-from-files|--enable-unsafe-swiftshader/);
  }
  for (const name of ['session.mjs','publish.mjs']) assert.equal(existsSync(new URL(name, import.meta.url)), false);
  const print = readFileSync(new URL('print.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(print, /spawnSync\(binary/);
  assert.match(print, /drive\(resolve\(htmlFile\)/);
});
