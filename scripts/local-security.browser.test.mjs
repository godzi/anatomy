import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
const exec = promisify(execFile);

test('real browser blocks external resources without breaking inline JavaScript', async () => {
  let requests = 0;
  const sink = createServer((req, res) => { requests++; res.end('secret'); });
  await new Promise(done => sink.listen(0, '127.0.0.1', done));
  const dir = await mkdtemp(join(tmpdir(), 'anatomy-browser-policy-'));
  try {
    const target = `http://127.0.0.1:${sink.address().port}/collect`;
    const file = join(dir, 'page.html');
    await writeFile(file, `<!doctype html><div class="iso-plate">Local</div><img src="${target}"><iframe src="${target}"></iframe><script>window.inlineRan=true;fetch(${JSON.stringify(target)}).catch(()=>{});window.popup=window.open(${JSON.stringify(target)});</script>`);
    let result;
    try { result = await exec(process.execPath, ['scripts/drive.mjs', file, JSON.stringify([['eval', '({inline:window.inlineRan,popup:window.popup===null})']])], { timeout: 30000 }); }
    catch (error) { result = error; }
    assert.match(result.stdout, /eval: \{"inline":true,"popup":true\}/);
    assert.equal(requests, 0);
  } finally { sink.closeAllConnections(); sink.close(); await rm(dir, { recursive:true, force:true }); }
});

test('PDF uses the restricted driver and produces a real PDF', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'anatomy-pdf-policy-'));
  try {
    const page = join(dir, 'page.html'); const output = join(dir, 'page.pdf');
    await writeFile(page, '<!doctype html><style>@page{size:A4;margin:10mm}</style><p>Local PDF</p>');
    await exec(process.execPath, ['scripts/drive.mjs', page, JSON.stringify([['pdf',output]])], { timeout: 30000 });
    assert.equal((await readFile(output)).subarray(0,5).toString(), '%PDF-');
  } finally { await rm(dir, { recursive:true, force:true }); }
});
