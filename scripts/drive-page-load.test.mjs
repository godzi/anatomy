import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
const execute = promisify(execFile);
test("drive waits for a slow inline script before running actions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "anatomy-load-"));
  try {
    const page = join(dir, "page.html");
    await writeFile(page, '<!doctype html><div class="iso-plate">Figure</div><script>const end=performance.now()+2500;while(performance.now()<end){}window.slowScriptRan=true;</script>');
    const result = await execute(process.execPath, [fileURLToPath(new URL("drive.mjs", import.meta.url)), page, JSON.stringify([["eval", "document.readyState + ' ' + Boolean(window.slowScriptRan)"]])], { timeout: 30000 });
    assert.match(result.stdout, /eval: "complete true"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
